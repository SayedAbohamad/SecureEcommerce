using BackEnd.DTO.Recommendation;
using BackEnd.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace BackEnd.Services.Recommendations;

public sealed class RecommendationService : IRecommendationService
{
    private readonly ApplicationDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly RecommendationSettings _settings;
    private readonly ILogger<RecommendationService> _logger;

    public RecommendationService(
        ApplicationDbContext db,
        IMemoryCache cache,
        IOptions<RecommendationSettings> settings,
        ILogger<RecommendationService> logger)
    {
        _db = db;
        _cache = cache;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<RecommendationPageResponseDto> GetRecommendationsAsync(
        RecommendationRequestDto request,
        string? userId,
        string? sessionId,
        CancellationToken cancellationToken = default)
    {
        var placement = NormalizePlacement(request.Placement);
        var limit = Math.Clamp(request.Limit <= 0 ? _settings.DefaultLimit : request.Limit, 1, 16);
        var resolvedSessionId = string.IsNullOrWhiteSpace(request.SessionId) ? sessionId : request.SessionId;

        if (!_settings.Enabled)
        {
            return new RecommendationPageResponseDto
            {
                Enabled = false,
                Placement = placement,
                Message = "Recommendation engine is disabled."
            };
        }

        var audienceKey = !string.IsNullOrWhiteSpace(userId)
            ? $"user:{userId}"
            : $"session:{resolvedSessionId ?? "anonymous"}";
        var behaviorVersion = _cache.Get<long>($"recommendations:version:{audienceKey}");
        var cacheKey = $"recommendations:{audienceKey}:{behaviorVersion}:{placement}:{request.ProductId}:{limit}";
        if (_settings.CacheMinutes > 0 && _cache.TryGetValue(cacheKey, out RecommendationPageResponseDto? cached) && cached != null)
            return cached;

        try
        {
            var context = await BuildContextAsync(placement, request.ProductId, userId, resolvedSessionId, limit, cancellationToken);
            var response = new RecommendationPageResponseDto
            {
                Enabled = true,
                Placement = placement,
                GeneratedAt = DateTime.UtcNow
            };

            switch (placement)
            {
                case "product_details":
                    AddSection(response, "because_you_viewed", "Because You Viewed This", "Similar products and bundles related to the item you are viewing.",
                        GetBecauseYouViewedThis(context, limit), context);
                    AddSection(response, "similar_products", "Similar Products", "Products with a related category and matching features.",
                        GetSimilarProducts(context, limit), context);
                    var frequentlyBoughtTogether = (await GetFrequentlyBoughtTogetherAsync(context, limit, cancellationToken)).ToList();
                    AddSection(response, "frequently_bought_together", "Frequently Bought Together", "Products often purchased in the same orders.",
                        frequentlyBoughtTogether.Count > 0
                            ? frequentlyBoughtTogether
                            : GetComplementaryProducts(context, limit), context);
                    AddSection(response, "customers_also_bought", "Customers Also Bought", "Extra products bought by customers with similar purchases.",
                        await GetCustomersAlsoBoughtAsync(context, limit, cancellationToken), context);
                    break;

                case "cart":
                    AddSection(response, "complete_your_setup", "Complete Your Setup", "Useful additions based on what is currently in your cart.",
                        await GetFrequentlyBoughtTogetherAsync(context, limit, cancellationToken), context);
                    AddSection(response, "continue_shopping", "Continue Shopping", "Pick up from products and categories you interacted with recently.",
                        GetContinueShopping(context, limit), context);
                    AddSection(response, "popular_products", "Popular Products", "Best-selling products across Markety customers.",
                        await GetPopularProductsAsync(context, limit, cancellationToken), context);
                    break;

                case "profile":
                case "dashboard":
                    AddSection(response, "recommended_for_you", "Recommended For You", "Personalized from your browsing, wishlist, cart, and orders.",
                        GetRecommendedForYou(context, limit), context);
                    AddSection(response, "wishlist_recommendations", "Wishlist Recommendations", "Similar to products you saved for later.",
                        GetWishlistRecommendations(context, limit), context);
                    AddSection(response, "recently_viewed", "Recently Viewed", "Products you recently explored.",
                        GetRecentlyViewed(context, limit), context);
                    break;

                default:
                    AddSection(response, "recommended_for_you", "Recommended For You", "Personalized from your interests and shopping behavior.",
                        GetRecommendedForYou(context, limit), context);
                    AddSection(response, "trending_products", "Trending Products", "Products getting attention recently.",
                        await GetTrendingProductsAsync(context, limit, cancellationToken), context);
                    AddSection(response, "new_arrivals", "New Arrivals Based On Interests", "Fresh products from categories you seem to like.",
                        GetNewArrivals(context, limit), context);
                    AddSection(response, "recently_viewed", "Recently Viewed", "Continue from products you checked before.",
                        GetRecentlyViewed(context, limit), context);
                    break;
            }

            if (!response.Sections.Any(section => section.Items.Count > 0))
            {
                AddSection(response, "cold_start", "Editor's Picks", "Selected from popular and new active products to get you started.",
                    GetEditorsPicks(context, limit), context);
            }

            if (_settings.CacheMinutes > 0)
            {
                _cache.Set(cacheKey, response, TimeSpan.FromMinutes(_settings.CacheMinutes));
            }

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating recommendations for placement {Placement}.", placement);
            return new RecommendationPageResponseDto
            {
                Enabled = true,
                Placement = placement,
                Message = "Could not generate recommendations right now."
            };
        }
    }

    private async Task<RecommendationContext> BuildContextAsync(
        string placement,
        Guid? productId,
        string? userId,
        string? sessionId,
        int limit,
        CancellationToken cancellationToken)
    {
        var activeProducts = await _db.products
            .AsNoTracking()
            .Include(product => product.Category)
            .Where(product => product.IsActive && !product.IsDeleted && product.Stock > 0)
            .OrderByDescending(product => product.CreatedAt)
            .ToListAsync(cancellationToken);

        var since = DateTime.UtcNow.AddDays(-_settings.RecentBehaviorDays);
        var eventsQuery = _db.UserBehaviorEvents
            .AsNoTracking()
            .Where(e => e.OccurredAt >= since);

        if (!string.IsNullOrWhiteSpace(userId))
        {
            eventsQuery = eventsQuery.Where(e => e.UserId == userId);
        }
        else if (!string.IsNullOrWhiteSpace(sessionId))
        {
            eventsQuery = eventsQuery.Where(e => e.SessionId == sessionId);
        }
        else
        {
            eventsQuery = eventsQuery.Where(e => false);
        }

        var recentEvents = await eventsQuery
            .OrderByDescending(e => e.OccurredAt)
            .Take(_settings.MaxEventsPerUserContext)
            .ToListAsync(cancellationToken);

        var preferences = string.IsNullOrWhiteSpace(userId)
            ? new List<UserPreference>()
            : await _db.UserPreferences
                .AsNoTracking()
                .Include(preference => preference.Category)
                .Where(preference => preference.UserId == userId)
                .OrderByDescending(preference => preference.Score)
                .Take(10)
                .ToListAsync(cancellationToken);

        var purchasedProductIds = string.IsNullOrWhiteSpace(userId)
            ? new List<Guid>()
            : await _db.OrderItems
                .AsNoTracking()
                .Where(item => item.Order.UserId == userId)
                .Select(item => item.ProductId)
                .Distinct()
                .ToListAsync(cancellationToken);

        var cartProductIds = string.IsNullOrWhiteSpace(userId)
            ? new List<Guid>()
            : await _db.CartItems
                .AsNoTracking()
                .Where(item => item.Cart.UserId == userId)
                .Select(item => item.ProductId)
                .Distinct()
                .ToListAsync(cancellationToken);

        return new RecommendationContext(
            placement,
            userId,
            sessionId,
            productId,
            limit,
            activeProducts,
            activeProducts.ToDictionary(product => product.Id),
            recentEvents,
            preferences,
            purchasedProductIds,
            cartProductIds);
    }

    private static void AddSection(
        RecommendationPageResponseDto response,
        string type,
        string title,
        string subtitle,
        IEnumerable<ProductCandidate> candidates,
        RecommendationContext context)
    {
        var items = candidates
            .GroupBy(candidate => candidate.ProductId)
            .Select(group => group.OrderByDescending(candidate => candidate.Score).First())
            .OrderByDescending(candidate => candidate.Score)
            .Take(context.Limit)
            .Select(candidate => MapProduct(candidate, context))
            .Where(product => product != null)
            .Cast<RecommendationProductDto>()
            .ToList();

        if (items.Count == 0)
            return;

        response.Sections.Add(new RecommendationSectionDto
        {
            Type = type,
            Title = title,
            Subtitle = subtitle,
            Items = items
        });
    }

    private static RecommendationProductDto? MapProduct(ProductCandidate candidate, RecommendationContext context)
    {
        if (!context.ProductById.TryGetValue(candidate.ProductId, out var product))
            return null;

        return new RecommendationProductDto
        {
            Id = product.Id,
            Name = product.Name,
            Description = product.Description,
            Price = product.Price,
            OldPrice = product.Price * 1.1m,
            Slug = product.Slug,
            Stock = product.Stock,
            CategoryId = product.CategoryId,
            CategoryName = product.Category?.Name ?? string.Empty,
            ImageUrl = product.ImageUrl,
            AdditionalImages = product.AdditionalImages,
            Sizes = product.Sizes,
            Strategy = candidate.Strategy,
            Score = Math.Round(candidate.Score, 4),
            Explanation = candidate.Explanation
        };
    }

    private static IEnumerable<ProductCandidate> GetRecommendedForYou(RecommendationContext context, int limit)
    {
        var topPreferenceCategories = context.Preferences
            .OrderByDescending(preference => preference.Score)
            .Select(preference => preference.CategoryId)
            .ToHashSet();

        if (topPreferenceCategories.Count == 0)
        {
            topPreferenceCategories = context.RecentEvents
                .Where(e => e.CategoryId.HasValue)
                .GroupBy(e => e.CategoryId!.Value)
                .OrderByDescending(group => group.Count())
                .Select(group => group.Key)
                .Take(5)
                .ToHashSet();
        }

        var seenProductIds = context.RecentEvents
            .Where(e => e.ProductId.HasValue)
            .Select(e => e.ProductId!.Value)
            .Concat(context.PurchasedProductIds)
            .ToHashSet();

        var rank = 100m;
        foreach (var product in context.ActiveProducts.Where(p => topPreferenceCategories.Contains(p.CategoryId) && !seenProductIds.Contains(p.Id)))
        {
            var categoryName = product.Category?.Name ?? "this category";
            yield return new ProductCandidate(
                product.Id,
                rank--,
                "recommended_for_you",
                $"Recommended because you showed interest in {categoryName}.");
        }

        foreach (var fallback in GetEditorsPicks(context, limit))
            yield return fallback with { Score = fallback.Score * 0.6m };
    }

    private static IEnumerable<ProductCandidate> GetSimilarProducts(RecommendationContext context, int limit)
    {
        if (!context.ProductId.HasValue || !context.ProductById.TryGetValue(context.ProductId.Value, out var source))
            return Enumerable.Empty<ProductCandidate>();

        var sourceTokens = Tokenize($"{source.Name} {source.Description} {source.Category?.Name}");
        var categoryName = source.Category?.Name ?? "same category";

        return context.ActiveProducts
            .Where(product => product.Id != source.Id)
            .Select(product =>
            {
                var tokenOverlap = Tokenize($"{product.Name} {product.Description} {product.Category?.Name}")
                    .Intersect(sourceTokens)
                    .Count();
                var categoryScore = product.CategoryId == source.CategoryId ? 50m : 0m;
                return new ProductCandidate(
                    product.Id,
                    categoryScore + tokenOverlap,
                    "similar_products",
                    product.CategoryId == source.CategoryId
                        ? $"Similar to {source.Name} because it is also in {categoryName}."
                        : $"Similar to {source.Name} based on matching product features.");
            })
            .Where(candidate => candidate.Score > 0)
            .OrderByDescending(candidate => candidate.Score)
            .Take(limit);
    }

    private static IEnumerable<ProductCandidate> GetBecauseYouViewedThis(RecommendationContext context, int limit)
    {
        var viewedEvents = context.RecentEvents
            .Where(e => e.ProductId.HasValue &&
                        (e.EventType == "product_view" || e.EventType == "product_click" || e.EventType == "recently_viewed"))
            .OrderByDescending(e => e.OccurredAt)
            .GroupBy(e => e.ProductId!.Value)
            .Select(group => group.First())
            .Take(8)
            .ToList();

        if (viewedEvents.Count == 0 && context.ProductId.HasValue)
        {
            viewedEvents.Add(new UserBehaviorEvent { ProductId = context.ProductId });
        }

        var viewedIds = viewedEvents.Select(e => e.ProductId!.Value).ToHashSet();
        if (context.ProductId.HasValue)
            viewedIds.Add(context.ProductId.Value);

        var viewedProducts = viewedEvents
            .Select(e => context.ProductById.GetValueOrDefault(e.ProductId!.Value))
            .Where(product => product != null)
            .Cast<Product>()
            .ToList();

        return viewedProducts
            .SelectMany(source => context.ActiveProducts
                .Where(product => product.Id != source.Id &&
                                  !viewedIds.Contains(product.Id) &&
                                  product.CategoryId == source.CategoryId)
                .Select(product => new ProductCandidate(
                    product.Id,
                    100m - viewedProducts.IndexOf(source),
                    "because_you_viewed",
                    $"Recommended because you viewed {source.Name}.")))
            .GroupBy(candidate => candidate.ProductId)
            .Select(group => group.OrderByDescending(candidate => candidate.Score).First())
            .OrderByDescending(candidate => candidate.Score)
            .Take(limit);
    }

    private static IEnumerable<ProductCandidate> GetComplementaryProducts(RecommendationContext context, int limit)
    {
        var sourceIds = GetSourceProductIds(context);
        var sourceCategoryIds = sourceIds
            .Select(id => context.ProductById.GetValueOrDefault(id)?.CategoryId)
            .Where(categoryId => categoryId.HasValue)
            .Select(categoryId => categoryId!.Value)
            .ToHashSet();

        return context.ActiveProducts
            .Where(product => !sourceIds.Contains(product.Id))
            .OrderBy(product => sourceCategoryIds.Contains(product.CategoryId))
            .ThenByDescending(product => product.Stock)
            .ThenByDescending(product => product.CreatedAt)
            .Take(limit)
            .Select((product, index) => new ProductCandidate(
                product.Id,
                50m - index,
                "frequently_bought_together_fallback",
                "Suggested as a complementary product while more purchase-history signals are collected."));
    }

    private async Task<IEnumerable<ProductCandidate>> GetFrequentlyBoughtTogetherAsync(
        RecommendationContext context,
        int limit,
        CancellationToken cancellationToken)
    {
        var sourceIds = GetSourceProductIds(context);
        if (sourceIds.Count == 0)
            return Enumerable.Empty<ProductCandidate>();

        var orderIds = await _db.OrderItems
            .AsNoTracking()
            .Where(item => sourceIds.Contains(item.ProductId))
            .Select(item => item.OrderId)
            .Distinct()
            .Take(300)
            .ToListAsync(cancellationToken);

        if (orderIds.Count == 0)
            return Enumerable.Empty<ProductCandidate>();

        var grouped = await _db.OrderItems
            .AsNoTracking()
            .Where(item => orderIds.Contains(item.OrderId) && !sourceIds.Contains(item.ProductId))
            .GroupBy(item => item.ProductId)
            .Select(group => new { ProductId = group.Key, Score = group.Sum(item => item.Quantity) })
            .OrderByDescending(item => item.Score)
            .Take(limit * 2)
            .ToListAsync(cancellationToken);

        return grouped
            .Where(item => context.ProductById.ContainsKey(item.ProductId))
            .Select(item => new ProductCandidate(
                item.ProductId,
                item.Score,
                "frequently_bought_together",
                "Recommended because customers often bought this together with items you viewed or added to cart."));
    }

    private async Task<IEnumerable<ProductCandidate>> GetCustomersAlsoBoughtAsync(
        RecommendationContext context,
        int limit,
        CancellationToken cancellationToken)
    {
        if (!context.ProductId.HasValue)
            return Enumerable.Empty<ProductCandidate>();

        var buyerIds = await _db.OrderItems
            .AsNoTracking()
            .Where(item => item.ProductId == context.ProductId.Value)
            .Select(item => item.Order.UserId)
            .Distinct()
            .Take(300)
            .ToListAsync(cancellationToken);

        if (buyerIds.Count == 0)
            return Enumerable.Empty<ProductCandidate>();

        var grouped = await _db.OrderItems
            .AsNoTracking()
            .Where(item => buyerIds.Contains(item.Order.UserId) && item.ProductId != context.ProductId.Value)
            .GroupBy(item => item.ProductId)
            .Select(group => new { ProductId = group.Key, Score = group.Sum(item => item.Quantity) })
            .OrderByDescending(item => item.Score)
            .Take(limit * 2)
            .ToListAsync(cancellationToken);

        return grouped
            .Where(item => context.ProductById.ContainsKey(item.ProductId))
            .Select(item => new ProductCandidate(
                item.ProductId,
                item.Score,
                "customers_also_bought",
                "Recommended because users with similar purchase interests bought this."));
    }

    private async Task<IEnumerable<ProductCandidate>> GetTrendingProductsAsync(
        RecommendationContext context,
        int limit,
        CancellationToken cancellationToken)
    {
        var since = DateTime.UtcNow.AddDays(-_settings.TrendingDays);
        var grouped = await _db.UserBehaviorEvents
            .AsNoTracking()
            .Where(e => e.ProductId.HasValue && e.OccurredAt >= since)
            .GroupBy(e => e.ProductId!.Value)
            .Select(group => new
            {
                ProductId = group.Key,
                Score = group.Count() + group.Count(e => e.EventType == "purchase") * 5 + group.Count(e => e.EventType == "add_to_cart") * 3
            })
            .OrderByDescending(item => item.Score)
            .Take(limit * 2)
            .ToListAsync(cancellationToken);

        return grouped
            .Where(item => context.ProductById.ContainsKey(item.ProductId))
            .Select(item => new ProductCandidate(
                item.ProductId,
                item.Score,
                "trending_products",
                "Trending among Markety shoppers based on recent views, carts, and purchases."));
    }

    private async Task<IEnumerable<ProductCandidate>> GetPopularProductsAsync(
        RecommendationContext context,
        int limit,
        CancellationToken cancellationToken)
    {
        var grouped = await _db.OrderItems
            .AsNoTracking()
            .GroupBy(item => item.ProductId)
            .Select(group => new { ProductId = group.Key, Score = group.Sum(item => item.Quantity) })
            .OrderByDescending(item => item.Score)
            .Take(limit * 2)
            .ToListAsync(cancellationToken);

        return grouped
            .Where(item => context.ProductById.ContainsKey(item.ProductId))
            .Select(item => new ProductCandidate(
                item.ProductId,
                item.Score,
                "popular_products",
                "Popular because it is one of the most purchased products."));
    }

    private static IEnumerable<ProductCandidate> GetNewArrivals(RecommendationContext context, int limit)
    {
        var preferredCategories = context.Preferences.Select(p => p.CategoryId).ToHashSet();
        var rank = 100m;

        var products = preferredCategories.Count == 0
            ? context.ActiveProducts
            : context.ActiveProducts.Where(product => preferredCategories.Contains(product.CategoryId)).Concat(context.ActiveProducts);

        return products
            .GroupBy(product => product.Id)
            .Select(group => group.First())
            .OrderByDescending(product => product.CreatedAt)
            .Take(limit)
            .Select(product => new ProductCandidate(
                product.Id,
                rank--,
                "new_arrivals",
                preferredCategories.Contains(product.CategoryId)
                    ? $"New arrival based on your interest in {product.Category?.Name}."
                    : "New arrival selected from the latest active products."));
    }

    private static IEnumerable<ProductCandidate> GetRecentlyViewed(RecommendationContext context, int limit)
    {
        return context.RecentEvents
            .Where(e => e.ProductId.HasValue && (e.EventType == "product_view" || e.EventType == "recently_viewed"))
            .GroupBy(e => e.ProductId!.Value)
            .Select(group => group.OrderByDescending(e => e.OccurredAt).First())
            .Where(e => context.ProductById.ContainsKey(e.ProductId!.Value))
            .OrderByDescending(e => e.OccurredAt)
            .Take(limit)
            .Select((e, index) => new ProductCandidate(
                e.ProductId!.Value,
                100 - index,
                "recently_viewed",
                "Shown because you recently viewed this product."));
    }

    private static IEnumerable<ProductCandidate> GetWishlistRecommendations(RecommendationContext context, int limit)
    {
        var wishlistCategories = context.RecentEvents
            .Where(e => e.EventType == "wishlist_add" && e.CategoryId.HasValue)
            .GroupBy(e => e.CategoryId!.Value)
            .OrderByDescending(group => group.Count())
            .Select(group => group.Key)
            .ToHashSet();

        var wishlistProductIds = context.RecentEvents
            .Where(e => e.EventType == "wishlist_add" && e.ProductId.HasValue)
            .Select(e => e.ProductId!.Value)
            .ToHashSet();

        var rank = 100m;
        return context.ActiveProducts
            .Where(product => wishlistCategories.Contains(product.CategoryId) && !wishlistProductIds.Contains(product.Id))
            .OrderByDescending(product => product.CreatedAt)
            .Take(limit)
            .Select(product => new ProductCandidate(
                product.Id,
                rank--,
                "wishlist_recommendations",
                $"Similar to items in your wishlist from {product.Category?.Name}."));
    }

    private static IEnumerable<ProductCandidate> GetContinueShopping(RecommendationContext context, int limit)
    {
        var recentCategories = context.RecentEvents
            .Where(e => e.CategoryId.HasValue)
            .GroupBy(e => e.CategoryId!.Value)
            .OrderByDescending(group => group.Max(e => e.OccurredAt))
            .Select(group => group.Key)
            .Take(5)
            .ToHashSet();

        var recentProductIds = context.RecentEvents
            .Where(e => e.ProductId.HasValue)
            .Select(e => e.ProductId!.Value)
            .ToHashSet();

        var rank = 100m;
        return context.ActiveProducts
            .Where(product => recentCategories.Contains(product.CategoryId) && !recentProductIds.Contains(product.Id))
            .OrderByDescending(product => product.CreatedAt)
            .Take(limit)
            .Select(product => new ProductCandidate(
                product.Id,
                rank--,
                "continue_shopping",
                $"Continue shopping in {product.Category?.Name}, based on your recent activity."));
    }

    private static IEnumerable<ProductCandidate> GetEditorsPicks(RecommendationContext context, int limit)
    {
        var rank = 100m;
        return context.ActiveProducts
            .OrderByDescending(product => product.Stock)
            .ThenByDescending(product => product.CreatedAt)
            .Take(limit)
            .Select(product => new ProductCandidate(
                product.Id,
                rank--,
                "editors_picks",
                "Editor's pick for new visitors based on availability and catalog freshness."));
    }

    private static HashSet<Guid> GetSourceProductIds(RecommendationContext context)
    {
        var sourceIds = new HashSet<Guid>();
        if (context.ProductId.HasValue)
            sourceIds.Add(context.ProductId.Value);

        foreach (var productId in context.CartProductIds)
            sourceIds.Add(productId);

        foreach (var productId in context.RecentEvents
                     .Where(e => e.ProductId.HasValue && (e.EventType == "add_to_cart" || e.EventType == "product_view"))
                     .OrderByDescending(e => e.OccurredAt)
                     .Select(e => e.ProductId!.Value)
                     .Take(5))
        {
            sourceIds.Add(productId);
        }

        return sourceIds;
    }

    private static HashSet<string> Tokenize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return new HashSet<string>();

        return value
            .ToLowerInvariant()
            .Split(new[] { ' ', '-', '_', ',', '.', ':', ';', '/', '\\', '|', '(', ')', '[', ']', '{', '}', '"', '\'' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(token => token.Length > 2)
            .Take(80)
            .ToHashSet();
    }

    private static string NormalizePlacement(string? value)
    {
        var placement = string.IsNullOrWhiteSpace(value) ? "home" : value.Trim().Replace('-', '_').ToLowerInvariant();
        return placement switch
        {
            "product" or "productdetails" or "product_detail" or "product_details" => "product_details",
            "cart" => "cart",
            "profile" => "profile",
            "dashboard" => "dashboard",
            _ => "home"
        };
    }

    private sealed record ProductCandidate(Guid ProductId, decimal Score, string Strategy, string Explanation);

    private sealed record RecommendationContext(
        string Placement,
        string? UserId,
        string? SessionId,
        Guid? ProductId,
        int Limit,
        List<Product> ActiveProducts,
        Dictionary<Guid, Product> ProductById,
        List<UserBehaviorEvent> RecentEvents,
        List<UserPreference> Preferences,
        List<Guid> PurchasedProductIds,
        List<Guid> CartProductIds);
}
