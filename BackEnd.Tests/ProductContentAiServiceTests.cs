using BackEnd.DTO.Product;
using BackEnd.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace BackEnd.Tests;

public sealed class ProductContentAiServiceTests
{
    [Fact]
    public async Task GenerateAsync_UsesAiJson_WhenValid()
    {
        var service = new ProductContentAiService(
            new FakeAiClient("""
                {
                  "description": "A powerful gaming laptop built for competitive play.",
                  "shortSeoDescription": "Gaming laptop with RTX 4060 and 16GB RAM.",
                  "highlights": ["RTX 4060 GPU", "16GB RAM", "165Hz display"],
                  "suggestedTags": ["gaming", "laptop", "#RTX"],
                  "specifications": [{"key": "GPU", "value": "RTX 4060"}, {"key": "RAM", "value": "16GB"}]
                }
                """),
            NullLogger<ProductContentAiService>.Instance);

        var result = await service.GenerateAsync(new GenerateProductContentRequestDto
        {
            Name = "Titan Gaming Laptop",
            CategoryName = "Laptops",
            Specs = "16GB RAM, RTX 4060, 165Hz"
        }, CancellationToken.None);

        Assert.Equal("fake", result.Provider);
        Assert.Contains("gaming laptop", result.Description, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(2, result.Specifications.Count);
        // Tags are normalized to lowercase with '#' stripped.
        Assert.Contains("rtx", result.SuggestedTags);
        Assert.DoesNotContain(result.SuggestedTags, t => t.StartsWith('#'));
    }

    [Fact]
    public async Task GenerateAsync_FallsBackToLocal_WhenAiReturnsMalformedJson()
    {
        var service = new ProductContentAiService(
            new FakeAiClient("not json"),
            NullLogger<ProductContentAiService>.Instance);

        var result = await service.GenerateAsync(new GenerateProductContentRequestDto
        {
            Name = "Titan Gaming Laptop",
            CategoryName = "Laptops",
            Specs = "GPU: RTX 4060, RAM: 16GB"
        }, CancellationToken.None);

        Assert.Equal("local", result.Provider);
        Assert.Contains("Titan Gaming Laptop", result.Description);
        // Local fallback best-effort splits "Key: Value" pairs from admin-supplied specs only —
        // never invents a spec that wasn't supplied.
        Assert.Contains(result.Specifications, s => s.Key == "GPU" && s.Value == "RTX 4060");
        Assert.Contains(result.Specifications, s => s.Key == "RAM" && s.Value == "16GB");
    }

    [Fact]
    public async Task GenerateAsync_FallsBackToLocal_WhenAiReturnsEmptyDescription()
    {
        var service = new ProductContentAiService(
            new FakeAiClient("""{"description":"","shortSeoDescription":"","highlights":[],"suggestedTags":[],"specifications":[]}"""),
            NullLogger<ProductContentAiService>.Instance);

        var result = await service.GenerateAsync(new GenerateProductContentRequestDto
        {
            Name = "Basic Mouse"
        }, CancellationToken.None);

        Assert.Equal("local", result.Provider);
        Assert.False(string.IsNullOrWhiteSpace(result.Description));
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
}
