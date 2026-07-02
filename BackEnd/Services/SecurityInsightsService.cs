using System.Text.Json;
using BackEnd.DTO.Admin;
using BackEnd.Models;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Services;

public sealed class SecurityInsightsService : ISecurityInsightsService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    private const string SystemInstructions = """
        You are a security analyst assistant for an e-commerce admin.
        Deterministic C# rules have already flagged the signals. Do not invent new signals,
        accuse users, or recommend automatic bans. This is decision support only.
        Explain the supplied aggregate/rule-based signals in plain operational language.
        Return ONLY a JSON object with exactly:
        {
          "summary": "2-4 sentence explanation",
          "riskLevel": "Low|Medium|High",
          "recommendedAction": "short human-review action"
        }
        """;

    private readonly ApplicationDbContext _context;
    private readonly IGenerativeAiClient _aiClient;
    private readonly ILogger<SecurityInsightsService> _logger;

    public SecurityInsightsService(
        ApplicationDbContext context,
        IGenerativeAiClient aiClient,
        ILogger<SecurityInsightsService> logger)
    {
        _context = context;
        _aiClient = aiClient;
        _logger = logger;
    }

    public async Task<SecurityInsightsDto> GenerateAsync(CancellationToken cancellationToken)
    {
        var signals = await BuildSignalsAsync(cancellationToken);
        var input = signals.Count == 0
            ? "No deterministic security signals currently flagged."
            : string.Join('\n', signals.Select(s => $"- [{s.Severity}] {s.Title}: {s.Description}"));

        GenerativeAiResult? aiResult = null;
        try
        {
            aiResult = await _aiClient.GenerateJsonAsync(SystemInstructions, input, cancellationToken, temperature: 0.2);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning("Security insights AI provider failed; using local fallback.");
        }
        if (aiResult != null)
        {
            var parsed = TryParse(aiResult.RawJson);
            if (parsed != null)
            {
                parsed.Provider = aiResult.Provider;
                parsed.Signals = signals;
                return parsed;
            }

            _logger.LogWarning("Security insights AI response could not be parsed; using local fallback.");
        }

        return BuildLocalFallback(signals);
    }

    private async Task<List<SecurityRiskSignalDto>> BuildSignalsAsync(CancellationToken cancellationToken)
    {
        var since = DateTime.UtcNow.AddDays(-30);
        var signals = new List<SecurityRiskSignalDto>();

        var failedPayments = await _context.Payments
            .AsNoTracking()
            .Where(p => p.PaymentDate >= since && p.Status != "Succeeded" && p.Status != "Paid" && p.Status != "Completed")
            .GroupBy(p => p.Order.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count(), Amount = g.Sum(p => p.Amount) })
            .Where(x => x.Count >= 3)
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync(cancellationToken);

        foreach (var item in failedPayments)
        {
            signals.Add(new SecurityRiskSignalDto
            {
                Title = "Repeated payment failures",
                Severity = item.Count >= 6 ? "High" : "Medium",
                Description = $"User {MaskId(item.UserId)} has {item.Count} failed/non-complete payments in 30 days totaling EGP {item.Amount:0.00}."
            });
        }

        var highOrderUsers = await _context.orders
            .AsNoTracking()
            .Where(o => o.OrderDate >= since && !o.IsDeleted)
            .GroupBy(o => o.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                Average = g.Average(o => o.TotalAmount),
                Max = g.Max(o => o.TotalAmount),
                Count = g.Count()
            })
            .Where(x => x.Count >= 2 && x.Max >= x.Average * 3 && x.Max >= 5000)
            .OrderByDescending(x => x.Max)
            .Take(5)
            .ToListAsync(cancellationToken);

        foreach (var item in highOrderUsers)
        {
            signals.Add(new SecurityRiskSignalDto
            {
                Title = "Unusual order value",
                Severity = item.Max >= item.Average * 5 ? "High" : "Medium",
                Description = $"User {MaskId(item.UserId)} placed an order at EGP {item.Max:0.00}, above their 30-day average of EGP {item.Average:0.00}."
            });
        }

        var promoUsers = await _context.orders
            .AsNoTracking()
            .Where(o => o.OrderDate >= since && !o.IsDeleted && o.PromoCode != null && o.PromoCode != "")
            .GroupBy(o => new { o.UserId, o.PromoCode })
            .Select(g => new { g.Key.UserId, g.Key.PromoCode, Count = g.Count(), Discount = g.Sum(o => o.DiscountAmount) })
            .Where(x => x.Count >= 4 || x.Discount >= 1000)
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync(cancellationToken);

        foreach (var item in promoUsers)
        {
            signals.Add(new SecurityRiskSignalDto
            {
                Title = "Promo code abuse pattern",
                Severity = item.Count >= 8 || item.Discount >= 2500 ? "High" : "Medium",
                Description = $"User {MaskId(item.UserId)} used promo {item.PromoCode} {item.Count} times in 30 days with EGP {item.Discount:0.00} total discount."
            });
        }

        var securityTickets = await _context.SupportTickets
            .AsNoTracking()
            .Where(t => t.CreatedAt >= since &&
                (t.Subject.Contains("hack") || t.Subject.Contains("fraud") || t.Subject.Contains("unauthorized") ||
                 t.Message.Contains("hack") || t.Message.Contains("fraud") || t.Message.Contains("unauthorized")))
            .CountAsync(cancellationToken);

        if (securityTickets > 0)
        {
            signals.Add(new SecurityRiskSignalDto
            {
                Title = "Security-related support tickets",
                Severity = securityTickets >= 5 ? "High" : "Medium",
                Description = $"{securityTickets} support tickets in 30 days mention security, fraud, hacking, or unauthorized activity."
            });
        }

        if (signals.Count == 0)
        {
            signals.Add(new SecurityRiskSignalDto
            {
                Title = "No active rule flags",
                Severity = "Low",
                Description = "Available order, payment, promo, and support-ticket rules did not flag high-risk patterns."
            });
        }

        return signals.Take(12).ToList();
    }

    private static SecurityInsightsDto? TryParse(string rawJson)
    {
        try
        {
            var parsed = JsonSerializer.Deserialize<SecurityInsightsDto>(rawJson, JsonOptions);
            if (parsed == null || string.IsNullOrWhiteSpace(parsed.Summary))
                return null;

            parsed.Summary = Clean(parsed.Summary, 800);
            parsed.RecommendedAction = Clean(parsed.RecommendedAction, 400);
            parsed.RiskLevel = parsed.RiskLevel is "Low" or "Medium" or "High" ? parsed.RiskLevel : "Medium";
            return parsed;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static SecurityInsightsDto BuildLocalFallback(List<SecurityRiskSignalDto> signals)
    {
        var risk = signals.Any(s => s.Severity == "High") ? "High" : signals.Any(s => s.Severity == "Medium") ? "Medium" : "Low";
        return new SecurityInsightsDto
        {
            Summary = risk == "Low"
                ? "No high-risk deterministic signals are currently active based on available data."
                : $"{signals.Count(s => s.Severity != "Low")} deterministic security signal(s) need human review. These rules are decision support only and should not trigger automatic restrictions.",
            RiskLevel = risk,
            RecommendedAction = risk == "Low"
                ? "Continue monitoring and review logs if new incidents are reported."
                : "Review the flagged accounts, payments, orders, and support tickets before taking any manual action.",
            Signals = signals,
            Provider = "local"
        };
    }

    private static string MaskId(string? id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return "unknown";
        return id.Length <= 8 ? id : $"{id[..4]}...{id[^4..]}";
    }

    private static string Clean(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var clean = value.Replace('\r', ' ').Replace('\n', ' ').Trim();
        return clean.Length <= maxLength ? clean : clean[..maxLength];
    }
}
