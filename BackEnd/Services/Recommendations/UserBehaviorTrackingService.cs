using System.Text.Json;
using BackEnd.DTO.Recommendation;
using BackEnd.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace BackEnd.Services.Recommendations;

public sealed class UserBehaviorTrackingService : IUserBehaviorTrackingService
{
    private static readonly HashSet<string> AllowedEvents = new(StringComparer.OrdinalIgnoreCase)
    {
        "product_view",
        "product_click",
        "search_query",
        "wishlist_add",
        "wishlist_remove",
        "add_to_cart",
        "purchase",
        "category_view",
        "recently_viewed"
    };

    private readonly ApplicationDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly RecommendationSettings _settings;
    private readonly ILogger<UserBehaviorTrackingService> _logger;

    public UserBehaviorTrackingService(
        ApplicationDbContext db,
        IMemoryCache cache,
        IOptions<RecommendationSettings> settings,
        ILogger<UserBehaviorTrackingService> logger)
    {
        _db = db;
        _cache = cache;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task TrackAsync(
        BehaviorEventRequestDto request,
        string? userId,
        string? sessionId,
        CancellationToken cancellationToken = default)
    {
        if (!_settings.Enabled)
            return;

        var eventType = NormalizeEventType(request.EventType);
        if (!AllowedEvents.Contains(eventType))
        {
            _logger.LogWarning("Ignoring unsupported recommendation event type {EventType}.", request.EventType);
            return;
        }

        Guid? categoryId = null;
        if (request.ProductId.HasValue)
        {
            categoryId = await _db.products
                .AsNoTracking()
                .Where(product => product.Id == request.ProductId.Value && product.IsActive && !product.IsDeleted)
                .Select(product => (Guid?)product.CategoryId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var resolvedSessionId = SanitizeSessionId(request.SessionId) ?? SanitizeSessionId(sessionId);
        var metadataJson = request.Metadata == null || request.Metadata.Count == 0
            ? null
            : JsonSerializer.Serialize(request.Metadata);

        _db.UserBehaviorEvents.Add(new UserBehaviorEvent
        {
            UserId = string.IsNullOrWhiteSpace(userId) ? null : userId,
            SessionId = resolvedSessionId,
            ProductId = request.ProductId,
            CategoryId = categoryId,
            EventType = eventType,
            SearchQuery = string.IsNullOrWhiteSpace(request.SearchQuery) ? null : request.SearchQuery.Trim(),
            Quantity = request.Quantity,
            Source = string.IsNullOrWhiteSpace(request.Source) ? null : request.Source.Trim(),
            MetadataJson = metadataJson,
            OccurredAt = DateTime.UtcNow
        });

        if (!string.IsNullOrWhiteSpace(userId))
        {
            if (categoryId.HasValue)
            {
                await IncreasePreferenceAsync(userId, categoryId.Value, GetPreferenceWeight(eventType, request.Quantity), cancellationToken);
            }

            if (eventType == "search_query" && !string.IsNullOrWhiteSpace(request.SearchQuery))
            {
                await UpdateSearchPreferencesAsync(userId, request.SearchQuery, cancellationToken);
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        var audienceKey = !string.IsNullOrWhiteSpace(userId)
            ? $"user:{userId}"
            : $"session:{resolvedSessionId ?? "anonymous"}";
        _cache.Set($"recommendations:version:{audienceKey}", DateTime.UtcNow.Ticks);
    }

    private async Task UpdateSearchPreferencesAsync(string userId, string searchQuery, CancellationToken cancellationToken)
    {
        var query = searchQuery.Trim().ToLowerInvariant();
        if (query.Length < 2)
            return;

        var categoryIds = await _db.products
            .AsNoTracking()
            .Where(product =>
                product.IsActive &&
                !product.IsDeleted &&
                (product.Name.ToLower().Contains(query) ||
                 product.Description.ToLower().Contains(query) ||
                 product.Category!.Name.ToLower().Contains(query)))
            .Select(product => product.CategoryId)
            .Distinct()
            .Take(5)
            .ToListAsync(cancellationToken);

        foreach (var categoryId in categoryIds)
        {
            await IncreasePreferenceAsync(userId, categoryId, 0.8m, cancellationToken);
        }
    }

    private async Task IncreasePreferenceAsync(string userId, Guid categoryId, decimal score, CancellationToken cancellationToken)
    {
        var preference = await _db.UserPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId && p.CategoryId == categoryId, cancellationToken);

        if (preference == null)
        {
            _db.UserPreferences.Add(new UserPreference
            {
                UserId = userId,
                CategoryId = categoryId,
                Score = score,
                LastInteractionAt = DateTime.UtcNow
            });
            return;
        }

        preference.Score += score;
        preference.LastInteractionAt = DateTime.UtcNow;
    }

    private static decimal GetPreferenceWeight(string eventType, int? quantity) => eventType switch
    {
        "purchase" => 6m * Math.Max(1, quantity ?? 1),
        "add_to_cart" => 3m * Math.Max(1, quantity ?? 1),
        "wishlist_add" => 2.5m,
        "product_click" => 1.25m,
        "product_view" or "recently_viewed" => 1m,
        "category_view" => 0.75m,
        "search_query" => 0.5m,
        "wishlist_remove" => -1.5m,
        _ => 0.25m
    };

    private static string NormalizeEventType(string value) =>
        value.Trim().Replace('-', '_').Replace(' ', '_').ToLowerInvariant();

    private static string? SanitizeSessionId(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = value.Trim();
        return trimmed.Length > 120 ? trimmed[..120] : trimmed;
    }
}
