using System.Net;
using System.Reflection;
using System.Text;
using System.Text.Json;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BackEnd.Tests;

public sealed class GenerativeAiClientTests
{
    [Fact]
    public async Task Ollama_RequestPayload_SetsNumGpuZero_AndJsonFormat()
    {
        var handler = new RecordingHandler(_ => JsonResponse("""{"response":"{\"ok\":true}"}"""));
        var client = BuildClient(handler, provider: "Ollama", model: "qwen2.5:3b", endpoint: "http://localhost:11434/api/generate");

        var result = await client.GenerateJsonAsync("system", "user input", CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("ollama", result!.Provider);

        using var document = JsonDocument.Parse(handler.LastRequestBody!);
        var options = document.RootElement.GetProperty("options");
        Assert.Equal(0, options.GetProperty("num_gpu").GetInt32());
        Assert.Equal("json", document.RootElement.GetProperty("format").GetString());
        Assert.False(document.RootElement.GetProperty("stream").GetBoolean());
        Assert.Equal("qwen2.5:3b", document.RootElement.GetProperty("model").GetString());
    }

    [Fact]
    public async Task Ollama_AppendsApiGeneratePath_WhenEndpointMissingIt()
    {
        var handler = new RecordingHandler(_ => JsonResponse("""{"response":"{\"ok\":true}"}"""));
        var client = BuildClient(handler, provider: "Ollama", endpoint: "http://localhost:11434");

        await client.GenerateJsonAsync("system", "user input", CancellationToken.None);

        Assert.Equal("http://localhost:11434/api/generate", handler.LastRequestUri!.ToString());
    }

    [Fact]
    public async Task Ollama_UsesDefaultEndpoint_WhenNotConfigured()
    {
        var handler = new RecordingHandler(_ => JsonResponse("""{"response":"{\"ok\":true}"}"""));
        var client = BuildClient(handler, provider: "Ollama", endpoint: "");

        await client.GenerateJsonAsync("system", "user input", CancellationToken.None);

        Assert.Equal("http://localhost:11434/api/generate", handler.LastRequestUri!.ToString());
    }

    [Fact]
    public void IsAvailable_TrueForOllama_EvenWithoutApiKey()
    {
        var handler = new RecordingHandler(_ => JsonResponse("{}"));
        var client = BuildClient(handler, provider: "Ollama", apiKey: "");

        Assert.True(client.IsAvailable);
    }

    [Fact]
    public void IsAvailable_FalseForGemini_WithoutApiKey()
    {
        var handler = new RecordingHandler(_ => JsonResponse("{}"));
        var client = BuildClient(handler, provider: "Gemini", apiKey: "");

        Assert.False(client.IsAvailable);
    }

    [Fact]
    public async Task OpenAi_DoesNotRetry_OnInsufficientQuota()
    {
        var handler = new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.TooManyRequests)
        {
            Content = new StringContent("""{"error":{"type":"insufficient_quota","code":"insufficient_quota","message":"You exceeded your quota."}}""", Encoding.UTF8, "application/json")
        });
        var client = BuildClient(handler, provider: "OpenAI", endpoint: "https://api.openai.com/v1/responses");

        var result = await client.GenerateJsonAsync("system", "user input", CancellationToken.None);

        Assert.Null(result);
        Assert.Equal(1, handler.CallCount);
    }

    [Fact]
    public async Task OpenAi_RetriesTransientErrors_UpToMaxAttempts()
    {
        var handler = new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)
        {
            Content = new StringContent("""{"error":{"type":"server_error","message":"try again"}}""", Encoding.UTF8, "application/json")
        });
        var client = BuildClient(handler, provider: "OpenAI", endpoint: "https://api.openai.com/v1/responses");

        var result = await client.GenerateJsonAsync("system", "user input", CancellationToken.None);

        Assert.Null(result);
        Assert.Equal(3, handler.CallCount); // MaxOpenAiAttempts
    }

    [Theory]
    [InlineData("ollama", 500, 300)]
    [InlineData("gemini", 500, 60)]
    [InlineData("openai", 500, 60)]
    [InlineData("ollama", 2, 5)] // below the 5s floor gets clamped up
    public void GetProviderTimeout_ClampsToProviderCeiling(string provider, int configuredSeconds, int expectedSeconds)
    {
        var handler = new RecordingHandler(_ => JsonResponse("{}"));
        var client = BuildClient(handler, provider: provider, timeoutSeconds: configuredSeconds);

        var method = typeof(GenerativeAiClient).GetMethod("GetProviderTimeout", BindingFlags.NonPublic | BindingFlags.Instance);
        var timeout = (TimeSpan)method!.Invoke(client, new object[] { provider.ToLowerInvariant() })!;

        Assert.Equal(TimeSpan.FromSeconds(expectedSeconds), timeout);
    }

    private static GenerativeAiClient BuildClient(
        RecordingHandler handler,
        string provider,
        string apiKey = "test-key",
        string model = "test-model",
        string endpoint = "",
        int timeoutSeconds = 30)
    {
        var httpClient = new HttpClient(handler);
        var settings = Options.Create(new AiAssistantSettings
        {
            Enabled = true,
            Provider = provider,
            ApiKey = apiKey,
            Model = model,
            Endpoint = endpoint,
            TimeoutSeconds = timeoutSeconds
        });

        return new GenerativeAiClient(httpClient, settings, NullLogger<GenerativeAiClient>.Instance);
    }

    private static HttpResponseMessage JsonResponse(string json) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(json, Encoding.UTF8, "application/json")
    };

    private sealed class RecordingHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _respond;
        public int CallCount { get; private set; }
        public Uri? LastRequestUri { get; private set; }
        public string? LastRequestBody { get; private set; }

        public RecordingHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) => _respond = respond;

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            LastRequestUri = request.RequestUri;
            LastRequestBody = request.Content == null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return _respond(request);
        }
    }
}
