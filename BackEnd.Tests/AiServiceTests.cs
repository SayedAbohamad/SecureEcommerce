using BackEnd.DTO.Admin;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace BackEnd.Tests;

public sealed class AiServiceTests
{
    [Fact]
    public async Task SupportTicketAiService_UsesAiJson_WhenValid()
    {
        var service = new SupportTicketAiService(
            new FakeAiClient("""{"summary":"Customer needs help with an order.","suggestedReply":"Hi, we can help.","priority":"High","sentiment":"Worried","category":"order"}""".Replace("\\\"", "\"")),
            NullLogger<SupportTicketAiService>.Instance);

        var result = await service.ClassifyAsync(Ticket("Where is my order?", "I am worried it is late."), CancellationToken.None);

        Assert.Equal("High", result.Priority);
        Assert.Equal("Worried", result.Sentiment);
        Assert.Equal("order", result.Category);
        Assert.Equal("fake", result.Provider);
    }

    [Fact]
    public async Task SupportTicketAiService_FallsBack_WhenMalformedJson()
    {
        var service = new SupportTicketAiService(
            new FakeAiClient("not json"),
            NullLogger<SupportTicketAiService>.Instance);

        var result = await service.ClassifyAsync(Ticket("Unauthorized payment", "My card was charged without approval."), CancellationToken.None);

        Assert.Equal("payment", result.Category);
        Assert.Equal("local", result.Provider);
    }

    [Fact]
    public async Task AdminInsightsService_UsesAiJson_WhenValid()
    {
        await using var context = CreateContext();
        var service = new AdminInsightsService(
            context,
            new FakeAiClient("""{"summary":"Revenue is stable and stock should be watched.","suggestedActions":["Restock low inventory","Review promo margin"]}""".Replace("\\\"", "\"")),
            NullLogger<AdminInsightsService>.Instance);

        var result = await service.GenerateAsync(CancellationToken.None);

        Assert.Equal("fake", result.Provider);
        Assert.Contains("Revenue is stable", result.Summary);
        Assert.NotEmpty(result.Metrics);
    }

    [Fact]
    public async Task AdminInsightsService_FallsBack_WhenProviderThrows()
    {
        await using var context = CreateContext();
        var service = new AdminInsightsService(
            context,
            new ThrowingAiClient(),
            NullLogger<AdminInsightsService>.Instance);

        var result = await service.GenerateAsync(CancellationToken.None);

        Assert.Equal("local", result.Provider);
        Assert.NotEmpty(result.SuggestedActions);
    }

    [Fact]
    public async Task SecurityInsightsService_UsesAiJson_WhenValid()
    {
        await using var context = CreateContext();
        var service = new SecurityInsightsService(
            context,
            new FakeAiClient("""{"summary":"No severe pattern is present.","riskLevel":"Low","recommendedAction":"Continue monitoring."}""".Replace("\\\"", "\"")),
            NullLogger<SecurityInsightsService>.Instance);

        var result = await service.GenerateAsync(CancellationToken.None);

        Assert.Equal("fake", result.Provider);
        Assert.Equal("Low", result.RiskLevel);
        Assert.NotEmpty(result.Signals);
    }

    [Fact]
    public async Task SecurityInsightsService_FallsBack_WhenMalformedJson()
    {
        await using var context = CreateContext();
        context.orders.Add(new Order
        {
            UserId = "user-123456789",
            OrderDate = DateTime.UtcNow,
            TotalAmount = 10000,
            PaymentMethod = "Card",
            Items = new List<OrderItem>()
        });
        context.Payments.Add(new Payment
        {
            Order = context.orders.Local.First(),
            Amount = 10000,
            Status = "Failed",
            PaymentDate = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var service = new SecurityInsightsService(
            context,
            new FakeAiClient("{"),
            NullLogger<SecurityInsightsService>.Instance);

        var result = await service.GenerateAsync(CancellationToken.None);

        Assert.Equal("local", result.Provider);
        Assert.Contains(result.RiskLevel, new[] { "Low", "Medium", "High" });
    }

    private static SupportTicket Ticket(string subject, string message) => new()
    {
        Name = "Customer",
        Email = "customer@example.com",
        Subject = subject,
        Message = message
    };

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

        public FakeAiClient(string json)
        {
            _json = json;
        }

        public bool IsAvailable => true;

        public Task<GenerativeAiResult?> GenerateJsonAsync(
            string systemInstructions,
            string userInput,
            CancellationToken cancellationToken,
            double temperature = 0.3)
        {
            return Task.FromResult<GenerativeAiResult?>(new GenerativeAiResult
            {
                RawJson = _json,
                Provider = "fake"
            });
        }
    }

    private sealed class ThrowingAiClient : IGenerativeAiClient
    {
        public bool IsAvailable => true;

        public Task<GenerativeAiResult?> GenerateJsonAsync(
            string systemInstructions,
            string userInput,
            CancellationToken cancellationToken,
            double temperature = 0.3)
        {
            throw new InvalidOperationException("Provider failed.");
        }
    }
}
