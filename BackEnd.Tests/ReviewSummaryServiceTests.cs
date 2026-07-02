using BackEnd.Models;
using BackEnd.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;

namespace BackEnd.Tests;

public sealed class ReviewSummaryServiceTests
{
    [Fact]
    public async Task GetSummaryAsync_ReturnsUnavailable_WhenFewerThanThreeReviews()
    {
        await using var context = CreateContext();
        var productId = Guid.NewGuid();
        AddReviews(context, productId, (5, "Great"), (4, "Good"));
        await context.SaveChangesAsync();

        var service = new ReviewSummaryService(
            context,
            new FakeAiClient("""{"overallSentiment":"positive","positives":["Fast"],"negatives":[],"commonThemes":[],"goodFor":""}"""),
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<ReviewSummaryService>.Instance);

        var result = await service.GetSummaryAsync(productId, CancellationToken.None);

        Assert.False(result.Available);
        Assert.Equal(2, result.ReviewCountAtGeneration);
    }

    [Fact]
    public async Task GetSummaryAsync_UsesAiJson_WhenValidAndEnoughReviews()
    {
        await using var context = CreateContext();
        var productId = Guid.NewGuid();
        AddReviews(context, productId, (5, "Great build quality"), (4, "Good value"), (5, "Fast shipping"));
        await context.SaveChangesAsync();

        var service = new ReviewSummaryService(
            context,
            new FakeAiClient("""{"overallSentiment":"positive","positives":["Great build quality","Fast shipping"],"negatives":[],"commonThemes":["Value"],"goodFor":"Gamers on a budget"}"""),
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<ReviewSummaryService>.Instance);

        var result = await service.GetSummaryAsync(productId, CancellationToken.None);

        Assert.True(result.Available);
        Assert.Equal("fake", result.Provider);
        Assert.Equal("positive", result.OverallSentiment);
        Assert.Contains("Great build quality", result.Positives);
        Assert.Equal(3, result.ReviewCountAtGeneration);
    }

    [Fact]
    public async Task GetSummaryAsync_FallsBackToLocal_WhenAiReturnsMalformedJson()
    {
        await using var context = CreateContext();
        var productId = Guid.NewGuid();
        AddReviews(context, productId, (5, "Great"), (1, "Broke after a week"), (5, "Love it"));
        await context.SaveChangesAsync();

        var service = new ReviewSummaryService(
            context,
            new FakeAiClient("not valid json"),
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<ReviewSummaryService>.Instance);

        var result = await service.GetSummaryAsync(productId, CancellationToken.None);

        Assert.True(result.Available);
        Assert.Equal("local", result.Provider);
        // Deterministic fallback never fabricates review content — only rating-based stats.
        Assert.All(result.Positives.Concat(result.Negatives), text => Assert.DoesNotContain("Great", text));
    }

    [Fact]
    public async Task GetSummaryAsync_FallsBackToLocal_WhenAiClientReturnsNull()
    {
        // GenerativeAiClient's real contract: provider/network failures are caught internally
        // and surfaced as a null result, never an exception — this simulates that null path.
        await using var context = CreateContext();
        var productId = Guid.NewGuid();
        AddReviews(context, productId, (5, "A"), (5, "B"), (5, "C"));
        await context.SaveChangesAsync();

        var service = new ReviewSummaryService(
            context,
            new NullResultAiClient(),
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<ReviewSummaryService>.Instance);

        var result = await service.GetSummaryAsync(productId, CancellationToken.None);

        Assert.Equal("local", result.Provider);
    }

    [Fact]
    public async Task GetSummaryAsync_ReturnsCachedResult_OnSecondCallWithSameReviewCount()
    {
        await using var context = CreateContext();
        var productId = Guid.NewGuid();
        AddReviews(context, productId, (5, "A"), (5, "B"), (5, "C"));
        await context.SaveChangesAsync();

        var aiClient = new CountingAiClient("""{"overallSentiment":"positive","positives":[],"negatives":[],"commonThemes":[],"goodFor":""}""");
        var cache = new MemoryCache(new MemoryCacheOptions());
        var service = new ReviewSummaryService(context, aiClient, cache, NullLogger<ReviewSummaryService>.Instance);

        await service.GetSummaryAsync(productId, CancellationToken.None);
        await service.GetSummaryAsync(productId, CancellationToken.None);

        Assert.Equal(1, aiClient.CallCount);
    }

    [Fact]
    public async Task RefreshSummaryAsync_BypassesCache_AndRegeneratesEvenWithSameReviewCount()
    {
        await using var context = CreateContext();
        var productId = Guid.NewGuid();
        AddReviews(context, productId, (5, "A"), (5, "B"), (5, "C"));
        await context.SaveChangesAsync();

        var aiClient = new CountingAiClient("""{"overallSentiment":"positive","positives":[],"negatives":[],"commonThemes":[],"goodFor":""}""");
        var cache = new MemoryCache(new MemoryCacheOptions());
        var service = new ReviewSummaryService(context, aiClient, cache, NullLogger<ReviewSummaryService>.Instance);

        await service.GetSummaryAsync(productId, CancellationToken.None);
        await service.RefreshSummaryAsync(productId, CancellationToken.None);

        Assert.Equal(2, aiClient.CallCount);
    }

    private static void AddReviews(ApplicationDbContext context, Guid productId, params (int Rating, string Comment)[] reviews)
    {
        foreach (var (rating, comment) in reviews)
        {
            context.productReviews.Add(new Review
            {
                ProductId = productId,
                UserId = "user-1",
                Rating = rating,
                Comment = comment
            });
        }
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private sealed class FakeAiClient : IGenerativeAiClient
    {
        private readonly string _json;
        public FakeAiClient(string json) => _json = json;
        public bool IsAvailable => true;

        public Task<GenerativeAiResult?> GenerateJsonAsync(
            string systemInstructions, string userInput, CancellationToken cancellationToken, double temperature = 0.3) =>
            Task.FromResult<GenerativeAiResult?>(new GenerativeAiResult { RawJson = _json, Provider = "fake" });
    }

    private sealed class CountingAiClient : IGenerativeAiClient
    {
        private readonly string _json;
        public int CallCount { get; private set; }
        public CountingAiClient(string json) => _json = json;
        public bool IsAvailable => true;

        public Task<GenerativeAiResult?> GenerateJsonAsync(
            string systemInstructions, string userInput, CancellationToken cancellationToken, double temperature = 0.3)
        {
            CallCount++;
            return Task.FromResult<GenerativeAiResult?>(new GenerativeAiResult { RawJson = _json, Provider = "fake" });
        }
    }

    private sealed class NullResultAiClient : IGenerativeAiClient
    {
        public bool IsAvailable => true;

        // Mirrors the real GenerativeAiClient contract: provider failures are caught
        // internally and surfaced as a null result, never an exception to the caller.
        public Task<GenerativeAiResult?> GenerateJsonAsync(
            string systemInstructions, string userInput, CancellationToken cancellationToken, double temperature = 0.3) =>
            Task.FromResult<GenerativeAiResult?>(null);
    }
}
