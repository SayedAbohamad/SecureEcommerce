using BackEnd.DTO.Review;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BackEnd.Controllers
{
    [Route("api/products/{productId}/reviews")]
    [ApiController]
    public class ReviewController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ReviewController> _logger;
        private readonly IRecaptchaService _recaptchaService;
        private readonly IReviewSummaryService _summaryService;

        public ReviewController(
            ApplicationDbContext context,
            ILogger<ReviewController> logger,
            IRecaptchaService recaptchaService,
            IReviewSummaryService summaryService)
        {
            _context = context;
            _logger = logger;
            _recaptchaService = recaptchaService;
            _summaryService = summaryService;
        }

        // ── AI review summary (cached; auto-generates, admins can force refresh) ──
        [AllowAnonymous]
        [HttpGet("summary")]
        [EnableRateLimiting("ai")]
        public async Task<ActionResult<ReviewSummaryDto>> GetReviewSummary(Guid productId, CancellationToken cancellationToken)
        {
            var product = await _context.products.FindAsync(new object[] { productId }, cancellationToken);
            if (product == null)
                return NotFound("Product not found.");

            var summary = await _summaryService.GetSummaryAsync(productId, cancellationToken);
            return Ok(summary);
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpPost("summary/refresh")]
        [EnableRateLimiting("ai")]
        public async Task<ActionResult<ReviewSummaryDto>> RefreshReviewSummary(Guid productId, CancellationToken cancellationToken)
        {
            var product = await _context.products.FindAsync(new object[] { productId }, cancellationToken);
            if (product == null)
                return NotFound("Product not found.");

            var summary = await _summaryService.RefreshSummaryAsync(productId, cancellationToken);
            _logger.LogInformation("Review summary refreshed for product {ProductId} by {User}.", productId, User.Identity?.Name);
            return Ok(summary);
        }

        private string? GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

        [HttpGet]
        public async Task<ActionResult<ProductReviewResponseDto>> GetProductReviews(Guid productId, [FromQuery] string sort = "latest", [FromQuery] int page = 1, [FromQuery] int pageSize = 4)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 4;
            if (pageSize > 20) pageSize = 20;

            var product = await _context.products.FindAsync(productId);
            if (product == null)
                return NotFound("Product not found.");

            var reviewsQuery = _context.productReviews
                .Include(r => r.User)
                .Where(r => r.ProductId == productId && !r.IsDeleted);

            var totalReviews = await reviewsQuery.CountAsync();
            var distribution = await reviewsQuery
                .GroupBy(r => r.Rating)
                .Select(g => new { Rating = g.Key, Count = g.Count() })
                .ToListAsync();

            var ratingDistribution = new ReviewDistributionDto
            {
                FiveStars = distribution.FirstOrDefault(x => x.Rating == 5)?.Count ?? 0,
                FourStars = distribution.FirstOrDefault(x => x.Rating == 4)?.Count ?? 0,
                ThreeStars = distribution.FirstOrDefault(x => x.Rating == 3)?.Count ?? 0,
                TwoStars = distribution.FirstOrDefault(x => x.Rating == 2)?.Count ?? 0,
                OneStar = distribution.FirstOrDefault(x => x.Rating == 1)?.Count ?? 0,
            };

            var averageRating = totalReviews == 0 ? 0 : await reviewsQuery.AverageAsync(r => r.Rating);
            var userId = GetUserId();
            var hasReviewed = false;

            if (!string.IsNullOrWhiteSpace(userId))
            {
                hasReviewed = await reviewsQuery.AnyAsync(r => r.UserId == userId);
            }

            var sortedQuery = sort.ToLower() switch
            {
                "highest" => reviewsQuery.OrderByDescending(r => r.Rating).ThenByDescending(r => r.CreatedAt),
                "lowest" => reviewsQuery.OrderBy(r => r.Rating).ThenByDescending(r => r.CreatedAt),
                _ => reviewsQuery.OrderByDescending(r => r.CreatedAt),
            };

            var reviews = await sortedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new ReviewDto
                {
                    Id = r.Id,
                    ProductId = r.ProductId,
                    UserId = r.UserId,
                    UserName = r.User != null && !string.IsNullOrWhiteSpace(r.User.FullName) ? r.User.FullName : (r.User != null ? r.User.Email : "Anonymous"),
                    Rating = r.Rating,
                    Comment = r.Comment,
                    IsVerifiedPurchase = r.IsVerifiedPurchase,
                    CreatedAt = r.CreatedAt,
                })
                .ToListAsync();

            return Ok(new ProductReviewResponseDto
            {
                Reviews = reviews,
                AverageRating = Math.Round(averageRating, 1),
                TotalReviews = totalReviews,
                Distribution = ratingDistribution,
                Page = page,
                PageSize = pageSize,
                HasMore = totalReviews > page * pageSize,
                HasReviewed = hasReviewed,
            });
        }

        [Authorize]
        [HttpPost]
        public async Task<ActionResult<ReviewDto>> SubmitReview(Guid productId, [FromBody] CreateReviewDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!await _recaptchaService.ValidateTokenAsync(dto.RecaptchaToken, "submit_review", 0.4m))
            {
                return BadRequest(new { message = "reCAPTCHA validation failed. Please refresh the page and try again." });
            }

            var userId = GetUserId();
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized("Unable to resolve user context.");

            var product = await _context.products.FindAsync(productId);
            if (product == null)
                return NotFound("Product not found.");

            var existingReview = await _context.productReviews
                .FirstOrDefaultAsync(r => r.ProductId == productId && r.UserId == userId && !r.IsDeleted);

            if (existingReview != null)
                return Conflict("You have already reviewed this product.");

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return Unauthorized("User account not found.");

            var hasPurchased = await _context.orders
                .Include(o => o.Items)
                .AnyAsync(o => o.UserId == userId && o.Items.Any(item => item.ProductId == productId));

            var review = new Review
            {
                ProductId = productId,
                UserId = userId,
                Rating = dto.Rating,
                Comment = dto.Comment.Trim(),
                IsVerifiedPurchase = hasPurchased,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            _context.productReviews.Add(review);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} submitted review for product {ProductId}.", userId, productId);

            return CreatedAtAction(nameof(GetProductReviews), new { productId }, new ReviewDto
            {
                Id = review.Id,
                ProductId = review.ProductId,
                UserId = review.UserId,
                UserName = !string.IsNullOrWhiteSpace(user.FullName) ? user.FullName : (user.Email ?? "Anonymous"),
                Rating = review.Rating,
                Comment = review.Comment,
                IsVerifiedPurchase = review.IsVerifiedPurchase,
                CreatedAt = review.CreatedAt,
            });
        }
    }
}
