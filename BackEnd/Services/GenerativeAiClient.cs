using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using BackEnd.Models;
using Microsoft.Extensions.Options;

namespace BackEnd.Services;

/// <summary>
/// Gemini/OpenAI implementation of <see cref="IGenerativeAiClient"/>. Reuses the
/// same "AiAssistant" configuration section (provider, model, endpoint, timeout)
/// as the shopping assistant so there is a single place to configure AI access,
/// and a single place secrets are read from (env vars / appsettings, never
/// hardcoded — see GetApiKey).
/// </summary>
public sealed class GenerativeAiClient : IGenerativeAiClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    private const string GeminiProvider = "gemini";
    private const string OpenAiProvider = "openai";
    private const string OllamaProvider = "ollama";
    private const int MaxOpenAiAttempts = 3;
    private const int MaxHostedProviderTimeoutSeconds = 60;
    private const int MaxLocalProviderTimeoutSeconds = 300;

    private readonly HttpClient _httpClient;
    private readonly AiAssistantSettings _settings;
    private readonly ILogger<GenerativeAiClient> _logger;

    public GenerativeAiClient(
        HttpClient httpClient,
        IOptions<AiAssistantSettings> settings,
        ILogger<GenerativeAiClient> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
    }

    public bool IsAvailable => _settings.Enabled
        && (NormalizeProvider(_settings.Provider) == OllamaProvider || !string.IsNullOrWhiteSpace(GetApiKey()));

    public async Task<GenerativeAiResult?> GenerateJsonAsync(
        string systemInstructions,
        string userInput,
        CancellationToken cancellationToken,
        double temperature = 0.3)
    {
        if (!IsAvailable)
            return null;

        var provider = NormalizeProvider(_settings.Provider);

        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(GetProviderTimeout(provider));

            var rawJson = provider switch
            {
                OpenAiProvider => await CallOpenAiAsync(systemInstructions, userInput, temperature, timeout.Token),
                OllamaProvider => await CallOllamaAsync(systemInstructions, userInput, temperature, timeout.Token),
                _ => await CallGeminiAsync(systemInstructions, userInput, temperature, timeout.Token)
            };

            if (string.IsNullOrWhiteSpace(rawJson))
                return null;

            return new GenerativeAiResult { RawJson = rawJson, Provider = provider };
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            // Never throw provider/network details up to controllers — log internally,
            // let the caller fall back to a deterministic result.
            _logger.LogWarning(ex, "Generative AI call failed; caller should use a deterministic fallback.");
            return null;
        }
    }

    private async Task<string?> CallGeminiAsync(
        string systemInstructions,
        string userInput,
        double temperature,
        CancellationToken cancellationToken)
    {
        var payload = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[] { new { text = $"{systemInstructions}\n\n{userInput}" } }
                }
            },
            generationConfig = new
            {
                temperature,
                responseMimeType = "application/json"
            }
        };

        using var message = new HttpRequestMessage(HttpMethod.Post, BuildGeminiEndpoint());
        message.Headers.TryAddWithoutValidation("x-goog-api-key", GetApiKey());
        message.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");

        using var response = await _httpClient.SendAsync(message, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Gemini returned status {StatusCode}. {ProviderError}",
                (int)response.StatusCode,
                ExtractProviderError(body).Message);
            return null;
        }

        using var document = JsonDocument.Parse(body);
        return ExtractGeminiOutputText(document.RootElement);
    }

    private async Task<string?> CallOpenAiAsync(
        string systemInstructions,
        string userInput,
        double temperature,
        CancellationToken cancellationToken)
    {
        var payload = new
        {
            model = _settings.Model,
            store = false,
            instructions = systemInstructions,
            input = EnsureJsonModeInstruction(userInput),
            text = new { format = new { type = "json_object" } },
            temperature
        };

        var requestBody = JsonSerializer.Serialize(payload, JsonOptions);
        string? lastProviderError = null;

        for (var attempt = 1; attempt <= MaxOpenAiAttempts; attempt++)
        {
            using var message = new HttpRequestMessage(HttpMethod.Post, _settings.Endpoint);
            message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", GetApiKey());
            message.Content = new StringContent(requestBody, Encoding.UTF8, "application/json");

            using var response = await _httpClient.SendAsync(message, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                using var document = JsonDocument.Parse(body);
                return ExtractOpenAiOutputText(document.RootElement);
            }

            var providerError = ExtractProviderError(body);
            lastProviderError = providerError.Message;
            if (!IsTransientStatusCode(response.StatusCode, providerError.Code) || attempt == MaxOpenAiAttempts)
            {
                _logger.LogWarning(
                    "OpenAI returned status {StatusCode}. {ProviderError}",
                    (int)response.StatusCode,
                    lastProviderError);
                return null;
            }

            _logger.LogWarning(
                "OpenAI returned transient status {StatusCode} on attempt {Attempt}/{MaxAttempts}. Retrying. {ProviderError}",
                (int)response.StatusCode,
                attempt,
                MaxOpenAiAttempts,
                lastProviderError);
            await Task.Delay(TimeSpan.FromMilliseconds(250 * attempt), cancellationToken);
        }

        _logger.LogWarning("OpenAI request failed after retries. {ProviderError}", lastProviderError);
        return null;
    }

    private async Task<string?> CallOllamaAsync(
        string systemInstructions,
        string userInput,
        double temperature,
        CancellationToken cancellationToken)
    {
        var payload = new
        {
            model = string.IsNullOrWhiteSpace(_settings.Model) ? "qwen2.5:3b" : _settings.Model.Trim(),
            prompt = $"{systemInstructions}\n\nReturn valid JSON only.\n\n{userInput}",
            stream = false,
            format = "json",
            options = new
            {
                temperature,
                num_gpu = 0,
                num_ctx = 2048,
                num_predict = 700
            }
        };

        using var message = new HttpRequestMessage(HttpMethod.Post, BuildOllamaEndpoint());
        message.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");

        using var response = await _httpClient.SendAsync(message, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Ollama returned status {StatusCode}. {ProviderError}",
                (int)response.StatusCode,
                ExtractProviderError(body).Message);
            return null;
        }

        using var document = JsonDocument.Parse(body);
        if (!document.RootElement.TryGetProperty("response", out var output)
            || output.ValueKind != JsonValueKind.String)
        {
            _logger.LogWarning("Ollama returned no response text; using deterministic fallback.");
            return null;
        }

        return ExtractJsonObjectText(output.GetString());
    }

    private static string? ExtractOpenAiOutputText(JsonElement root)
    {
        if (!root.TryGetProperty("output", out var output) || output.ValueKind != JsonValueKind.Array)
            return null;

        foreach (var item in output.EnumerateArray())
        {
            if (!item.TryGetProperty("type", out var itemType) || itemType.GetString() != "message")
                continue;
            if (!item.TryGetProperty("content", out var content) || content.ValueKind != JsonValueKind.Array)
                continue;

            foreach (var part in content.EnumerateArray())
            {
                if (part.TryGetProperty("type", out var partType)
                    && partType.GetString() == "output_text"
                    && part.TryGetProperty("text", out var text))
                {
                    return text.GetString();
                }
            }
        }

        return null;
    }

    private static string EnsureJsonModeInstruction(string userInput)
    {
        const string jsonInstruction = "Return valid JSON only.";
        return userInput.Contains("json", StringComparison.OrdinalIgnoreCase)
            ? userInput
            : $"{jsonInstruction}\n\n{userInput}";
    }

    private static bool IsTransientStatusCode(HttpStatusCode statusCode, string? providerCode)
    {
        if (string.Equals(providerCode, "insufficient_quota", StringComparison.OrdinalIgnoreCase))
            return false;

        return statusCode == HttpStatusCode.TooManyRequests || (int)statusCode >= 500;
    }

    private TimeSpan GetProviderTimeout(string provider)
    {
        var maxSeconds = provider == OllamaProvider
            ? MaxLocalProviderTimeoutSeconds
            : MaxHostedProviderTimeoutSeconds;

        return TimeSpan.FromSeconds(Math.Clamp(_settings.TimeoutSeconds, 5, maxSeconds));
    }

    private static string? ExtractGeminiOutputText(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.String)
            return ExtractJsonObjectText(root.GetString());

        if (root.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in root.EnumerateObject())
            {
                if (!property.NameEquals("text"))
                    continue;
                var candidate = ExtractGeminiOutputText(property.Value);
                if (!string.IsNullOrWhiteSpace(candidate))
                    return candidate;
            }

            foreach (var property in root.EnumerateObject())
            {
                var nested = ExtractGeminiOutputText(property.Value);
                if (!string.IsNullOrWhiteSpace(nested))
                    return nested;
            }
        }

        if (root.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in root.EnumerateArray())
            {
                var candidate = ExtractGeminiOutputText(item);
                if (!string.IsNullOrWhiteSpace(candidate))
                    return candidate;
            }
        }

        return null;
    }

    private static string? ExtractJsonObjectText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        var trimmed = text.Trim();
        var firstBrace = trimmed.IndexOf('{');
        var lastBrace = trimmed.LastIndexOf('}');
        return firstBrace >= 0 && lastBrace > firstBrace
            ? trimmed[firstBrace..(lastBrace + 1)]
            : null;
    }

    private string BuildGeminiEndpoint()
    {
        var endpoint = string.IsNullOrWhiteSpace(_settings.Endpoint)
            ? "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            : _settings.Endpoint.Trim();

        return endpoint.Contains("{model}", StringComparison.OrdinalIgnoreCase)
            ? endpoint.Replace("{model}", Uri.EscapeDataString(_settings.Model), StringComparison.OrdinalIgnoreCase)
            : endpoint;
    }

    private string BuildOllamaEndpoint()
    {
        var endpoint = string.IsNullOrWhiteSpace(_settings.Endpoint)
            ? "http://localhost:11434/api/generate"
            : _settings.Endpoint.Trim();

        return endpoint.EndsWith("/api/generate", StringComparison.OrdinalIgnoreCase)
            ? endpoint
            : endpoint.TrimEnd('/') + "/api/generate";
    }

    private string GetApiKey()
    {
        if (!string.IsNullOrWhiteSpace(_settings.ApiKey))
            return _settings.ApiKey;

        return NormalizeProvider(_settings.Provider) == OpenAiProvider
            ? Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? string.Empty
            : Environment.GetEnvironmentVariable("GEMINI_API_KEY")
              ?? Environment.GetEnvironmentVariable("GOOGLE_API_KEY")
              ?? string.Empty;
    }

    private static ProviderError ExtractProviderError(string? body)
    {
        if (string.IsNullOrWhiteSpace(body))
            return new ProviderError(null, "Provider returned no error body.");

        try
        {
            using var document = JsonDocument.Parse(body);
            if (document.RootElement.TryGetProperty("error", out var error)
                && error.ValueKind == JsonValueKind.Object)
            {
                var type = error.TryGetProperty("type", out var typeElement)
                    ? GetJsonScalarText(typeElement)
                    : null;
                var code = error.TryGetProperty("code", out var codeElement)
                    ? GetJsonScalarText(codeElement)
                    : null;
                var message = error.TryGetProperty("message", out var messageElement)
                    ? GetJsonScalarText(messageElement)
                    : null;

                return new ProviderError(
                    code,
                    $"Type={type ?? "unknown"} Code={code ?? "unknown"} Message={Truncate(message)}");
            }
        }
        catch (JsonException)
        {
            // Fall through to a short raw-body preview. Provider error bodies do
            // not contain our API key or request prompt.
        }

        return new ProviderError(null, $"Body={Truncate(body)}");
    }

    private static string Truncate(string? value, int maxLength = 300)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "none";

        var normalized = value.ReplaceLineEndings(" ").Trim();
        return normalized.Length <= maxLength
            ? normalized
            : normalized[..maxLength] + "...";
    }

    private static string? GetJsonScalarText(JsonElement element) =>
        element.ValueKind switch
        {
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => element.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Null => null,
            _ => element.GetRawText()
        };

    private static string NormalizeProvider(string? provider)
    {
        if (string.Equals(provider, OpenAiProvider, StringComparison.OrdinalIgnoreCase))
            return OpenAiProvider;

        if (string.Equals(provider, OllamaProvider, StringComparison.OrdinalIgnoreCase))
            return OllamaProvider;

        return GeminiProvider;
    }

    private sealed record ProviderError(string? Code, string Message);
}
