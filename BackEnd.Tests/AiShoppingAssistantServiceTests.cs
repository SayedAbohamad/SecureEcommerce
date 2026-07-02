using BackEnd.DTO.AiAssistant;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BackEnd.Tests;

public sealed class AiShoppingAssistantServiceTests
{
    [Fact]
    public async Task RespondAsync_NeverCallsNetwork_WhenProviderIsOllama()
    {
        // This is the explicit product decision from the Ollama performance investigation:
        // customer-facing chat must never wait on local Ollama (39-99s observed), so when
        // Provider=Ollama the assistant must go straight to the deterministic local plan.
        await using var context = CreateContext();
        var handler = new ThrowingHandler();
        var httpClient = new HttpClient(handler);
        var settings = Options.Create(new AiAssistantSettings
        {
            Enabled = true,
            Provider = "Ollama",
            Model = "qwen2.5:3b",
            Endpoint = "http://localhost:11434/api/generate",
            TimeoutSeconds = 120
        });

        var service = new AiShoppingAssistantService(httpClient, context, settings, NullLogger<AiShoppingAssistantService>.Instance);

        var response = await service.RespondAsync(
            new AiAssistantRequestDto { Message = "hello" },
            userId: null,
            CancellationToken.None);

        Assert.Equal("local", response.Provider);
        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task RespondAsync_FallsBackToLocal_WhenGeminiConfiguredWithoutApiKey()
    {
        await using var context = CreateContext();
        var handler = new ThrowingHandler();
        var httpClient = new HttpClient(handler);
        var settings = Options.Create(new AiAssistantSettings
        {
            Enabled = true,
            Provider = "Gemini",
            ApiKey = "", // no key configured -> CanUseGemini() must return false
            Endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            TimeoutSeconds = 30
        });

        var service = new AiShoppingAssistantService(httpClient, context, settings, NullLogger<AiShoppingAssistantService>.Instance);

        var response = await service.RespondAsync(
            new AiAssistantRequestDto { Message = "hello" },
            userId: null,
            CancellationToken.None);

        Assert.Equal("local", response.Provider);
        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task RespondAsync_LocalPlan_GreetsAndOffersHelp_ForGreetingMessage()
    {
        await using var context = CreateContext();
        var service = BuildOllamaService(context);

        var response = await service.RespondAsync(
            new AiAssistantRequestDto { Message = "hello" },
            userId: null,
            CancellationToken.None);

        Assert.Equal("general", response.Intent);
        Assert.False(string.IsNullOrWhiteSpace(response.Reply));
    }

    [Fact]
    public async Task RespondAsync_LocalPlan_RequestsLogin_WhenTrackingOrdersAnonymously()
    {
        await using var context = CreateContext();
        var service = BuildOllamaService(context);

        var response = await service.RespondAsync(
            new AiAssistantRequestDto { Message = "track my order" },
            userId: null,
            CancellationToken.None);

        Assert.Equal("track_order", response.Intent);
        Assert.NotNull(response.Action);
        Assert.Equal("login", response.Action!.Type);
    }

    [Fact]
    public async Task RespondAsync_LocalPlan_NeverInventsProduct_WhenCatalogEmpty()
    {
        await using var context = CreateContext();
        var service = BuildOllamaService(context);

        var response = await service.RespondAsync(
            new AiAssistantRequestDto { Message = "show me a gaming laptop under 30000" },
            userId: null,
            CancellationToken.None);

        Assert.Empty(response.Products);
    }

    private static AiShoppingAssistantService BuildOllamaService(ApplicationDbContext context)
    {
        var handler = new ThrowingHandler();
        var httpClient = new HttpClient(handler);
        var settings = Options.Create(new AiAssistantSettings
        {
            Enabled = true,
            Provider = "Ollama",
            Model = "qwen2.5:3b",
            Endpoint = "http://localhost:11434/api/generate",
            TimeoutSeconds = 120
        });

        return new AiShoppingAssistantService(httpClient, context, settings, NullLogger<AiShoppingAssistantService>.Instance);
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    /// <summary>Fails the test loudly if the assistant ever attempts an HTTP call —
    /// used to prove "no network" guarantees rather than just asserting the result.</summary>
    private sealed class ThrowingHandler : HttpMessageHandler
    {
        public int CallCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            throw new InvalidOperationException($"Unexpected network call to {request.RequestUri} — customer chat must not call remote/local AI providers when Provider=Ollama.");
        }
    }
}
