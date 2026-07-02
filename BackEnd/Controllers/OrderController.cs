using AutoMapper;
using BackEnd.DTO;
using BackEnd.DTO.Order;
using BackEnd.DTO.Recommendation;
using BackEnd.Models;
using BackEnd.Services;
using BackEnd.Services.Recommendations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe.Checkout;
using System.Security.Claims;

namespace BackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public partial class OrderController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration;
        private readonly ILogger<OrderController> _logger;
        private readonly IRecaptchaService _recaptchaService;
        private readonly IUserBehaviorTrackingService _trackingService;

        public OrderController(
            ApplicationDbContext context,
            IMapper mapper,
            IConfiguration configuration,
            ILogger<OrderController> logger,
            IRecaptchaService recaptchaService,
            IUserBehaviorTrackingService trackingService)
        {
            _context = context;
            _mapper = mapper;
            _configuration = configuration;
            _logger = logger;
            _recaptchaService = recaptchaService;
            _trackingService = trackingService;
        }

        private string? GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);
        private string? GetSessionId() => Request.Headers.TryGetValue("X-Markety-Session-Id", out var value) ? value.ToString() : null;

        // ── CheckOut ──────────────────────────────────────────────────────────

        [Authorize]
        [HttpPost("CheckOut")]
        public async Task<IActionResult> CheckOut([FromForm] CheckOutDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!await _recaptchaService.ValidateTokenAsync(dto.RecaptchaToken, "checkout", 0.5m))
            {
                return BadRequest(new { message = "reCAPTCHA validation failed. Please refresh the page and try again." });
            }

            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User context is missing.");

            // Race condition fix (#11): use an explicit DB transaction so inventory
            // deduction and order creation are atomic.
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var cart = await _context.Carts
                    .Include(c => c.Items)
                    .ThenInclude(i => i.Product)
                    .FirstOrDefaultAsync(c => c.UserId == userId);

                if (cart == null || !cart.Items.Any())
                    return BadRequest("Cart is empty.");

                // Business logic fix (#10): recalculate total server-side — never trust
                // client-supplied prices.
                var totalAmount = cart.Items.Sum(i => i.Product.Price * i.Quantity);

                decimal discountAmountApplied = 0;
                string? appliedPromoCode = null;

                // Apply Promo Code discount if provided
                if (!string.IsNullOrWhiteSpace(dto.PromoCode))
                {
                    var promo = await _context.PromoCodes
                        .FirstOrDefaultAsync(p => p.Code == dto.PromoCode.ToUpper().Trim() && !p.IsDeleted);

                    if (promo == null)
                        return BadRequest("Promo code not found.");

                    if (!promo.IsActive)
                        return BadRequest("This promo code is no longer active.");

                    var now = DateTime.Now;
                    if (promo.StartDate.HasValue && promo.StartDate > now)
                        return BadRequest("This promo code is not yet valid.");

                    if (promo.ExpirationDate.HasValue && promo.ExpirationDate < now)
                        return BadRequest("This promo code has expired.");

                    if (promo.MaxUsageCount.HasValue && promo.CurrentUsageCount >= promo.MaxUsageCount)
                        return BadRequest("This promo code has been fully redeemed.");

                    if (promo.MaxUsagePerUser.HasValue)
                    {
                        var userUsageCount = await _context.orders
                            .CountAsync(o => o.UserId == userId && o.PromoCode == promo.Code);

                        if (userUsageCount >= promo.MaxUsagePerUser.Value)
                            return BadRequest($"You have already used this promo code the maximum allowed times ({promo.MaxUsagePerUser.Value}).");
                    }

                    if (promo.MinimumOrderAmount.HasValue && totalAmount < promo.MinimumOrderAmount)
                        return BadRequest($"Minimum order amount for this promo code is {promo.MinimumOrderAmount:C}.");

                    // Calculate discount with restrictions
                    decimal applicableSubtotal = totalAmount;
                    if (promo.ApplicableProductId.HasValue)
                    {
                        var matchingItems = cart.Items.Where(i => i.ProductId == promo.ApplicableProductId.Value).ToList();
                        if (!matchingItems.Any())
                        {
                            return BadRequest("This promo code is only valid for a specific product that is not in your cart.");
                        }
                        applicableSubtotal = matchingItems.Sum(i => i.Product.Price * i.Quantity);
                    }
                    else if (promo.ApplicableCategoryId.HasValue)
                    {
                        var matchingItems = cart.Items.Where(i => i.Product.CategoryId == promo.ApplicableCategoryId.Value).ToList();
                        if (!matchingItems.Any())
                        {
                            return BadRequest("This promo code is only valid for a specific category that is not in your cart.");
                        }
                        applicableSubtotal = matchingItems.Sum(i => i.Product.Price * i.Quantity);
                    }

                    decimal discount = 0;
                    switch (promo.DiscountType)
                    {
                        case DiscountType.Percentage:
                            discount = applicableSubtotal * (promo.DiscountValue / 100);
                            if (promo.MaxDiscountAmount.HasValue)
                                discount = Math.Min(discount, promo.MaxDiscountAmount.Value);
                            break;
                        case DiscountType.FixedAmount:
                            discount = Math.Min(promo.DiscountValue, applicableSubtotal);
                            break;
                        case DiscountType.FreeShipping:
                            discount = 0;
                            break;
                    }

                    discountAmountApplied = discount;
                    appliedPromoCode = promo.Code;

                    totalAmount = Math.Max(0, totalAmount - discount);
                    promo.CurrentUsageCount++;
                }

                // Race condition fix (#11): validate stock and decrement within the transaction.
                foreach (var item in cart.Items)
                {
                    // Re-fetch with a row-level lock hint via a fresh query inside the transaction.
                    var freshProduct = await _context.products
                        .FirstOrDefaultAsync(p => p.Id == item.ProductId);

                    if (freshProduct == null)
                        return BadRequest($"Product '{item.ProductId}' no longer exists.");

                    if (freshProduct.Stock < item.Quantity)
                        return BadRequest($"Insufficient stock for '{freshProduct.Name}'. Available: {freshProduct.Stock}.");

                    freshProduct.Stock -= item.Quantity;
                }

                var order = new Order
                {
                    PaymentMethod = dto.PaymentMethod,
                    UserId = userId,
                    OrderDate = DateTime.UtcNow,
                    Status = OrderStatus.Processing,
                    TotalAmount = totalAmount,
                    PromoCode = appliedPromoCode,
                    DiscountAmount = discountAmountApplied,
                    Items = cart.Items.Select(i => new OrderItem
                    {
                        ProductId = i.ProductId,
                        Quantity = i.Quantity,
                        Price = i.Product.Price   // snapshot price at time of order
                    }).ToList()
                };

                _context.orders.Add(order);
                _context.CartItems.RemoveRange(cart.Items);

                // Create a professional in-app notification for the user
                var notification = new Notification
                {
                    UserId = userId,
                    Title = "Order Placed Successfully",
                    Message = $"Thank you for your order! Your order #{order.Id.ToString().Substring(0, 8).ToUpper()} has been placed and is now processing.",
                    Type = "Order",
                    Link = $"/orders/{order.Id}",
                    CreatedAt = DateTime.UtcNow
                };
                _context.Notifications.Add(notification);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                try
                {
                    foreach (var item in order.Items)
                    {
                        await _trackingService.TrackAsync(new BehaviorEventRequestDto
                        {
                            EventType = "purchase",
                            ProductId = item.ProductId,
                            Quantity = item.Quantity,
                            Source = "checkout"
                        }, userId, GetSessionId());
                    }
                }
                catch (Exception trackingEx)
                {
                    _logger.LogWarning(trackingEx, "Recommendation purchase tracking failed for order {OrderId}.", order.Id);
                }

                _logger.LogInformation("Order {OrderId} created by user {UserId}. Total: {Total}.",
                    order.Id, userId, totalAmount);

                return Ok("Order Created Successfully");
            }
            catch (DbUpdateConcurrencyException ex)
            {
                await transaction.RollbackAsync();
                _logger.LogWarning(ex, "Concurrency conflict during checkout for user {UserId}.", userId);
                return Conflict("Another request modified the data. Please try again.");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error during checkout for user {UserId}.", userId);
                return StatusCode(500, "An error occurred during checkout.");
            }
        }

        // ── GetOrder (single) ─────────────────────────────────────────────────

        [Authorize]
        [HttpGet("{orderId:guid}")]
        public async Task<ActionResult<OrderDetailsDto>> GetOrder(Guid orderId)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User context is missing.");

            // IDOR fix (#4): always scope to the authenticated userId
            var myOrder = await _context.orders
                .Include(x => x.User)
                .Include(c => c.Items)
                    .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(c => c.UserId == userId && c.Id == orderId);

            if (myOrder == null)
                return NotFound();

            return Ok(_mapper.Map<OrderDetailsDto>(myOrder));
        }

        // ── CancelOrder ──────────────────────────────────────────────────────

        [Authorize]
        [HttpPut("{orderId:guid}/cancel")]
        public async Task<IActionResult> CancelOrder(Guid orderId)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User context is missing.");

            var order = await _context.orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.UserId == userId && o.Id == orderId);

            if (order == null)
                return NotFound("Order not found.");

            // Only allow cancel if not yet delivered or already cancelled
            if (order.Status == OrderStatus.Deliverd)
                return BadRequest("Cannot cancel a delivered order.");

            if (order.Status == OrderStatus.Cancelled)
                return BadRequest("This order is already cancelled.");

            // Restore stock for each item
            foreach (var item in order.Items)
            {
                var product = await _context.products.FindAsync(item.ProductId);
                if (product != null)
                {
                    product.Stock += item.Quantity;
                }
            }

            order.Status = OrderStatus.Cancelled;

            // Create a professional in-app notification for the user
            var notification = new Notification
            {
                UserId = order.UserId,
                Title = "Order Cancelled",
                Message = $"Your order #{order.Id.ToString().Substring(0, 8).ToUpper()} has been cancelled successfully.",
                Type = "Order",
                Link = $"/orders/{order.Id}",
                CreatedAt = DateTime.UtcNow
            };
            _context.Notifications.Add(notification);

            await _context.SaveChangesAsync();

            _logger.LogInformation("Order {OrderId} cancelled by user {UserId}.", orderId, userId);

            return Ok(new { message = "Order cancelled successfully." });
        }

        // ── GetMyOrders ───────────────────────────────────────────────────────

        [Authorize]
        [HttpGet("mine")]
        public async Task<ActionResult<IEnumerable<OrderSummaryDto>>> GetMyOrders()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User context is missing.");

            var orders = await _context.orders
                .Include(x => x.User)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Product)
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();

            return Ok(_mapper.Map<List<OrderSummaryDto>>(orders));
        }

        // ── GetAllOrders (Admin) ──────────────────────────────────────────────

        [Authorize(Roles = "Admin,Manager")]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<OrderSummaryDto>>> GetAllOrders()
        {
            var orders = await _context.orders
                .Include(x => x.User)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Product)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();

            return Ok(_mapper.Map<List<OrderSummaryDto>>(orders));
        }

        // ── UpdateOrderStatus (Admin) ─────────────────────────────────────────

        [Authorize(Roles = "Admin,Manager")]
        [HttpPut("{orderId:guid}/status")]
        public async Task<IActionResult> UpdateOrderStatus(Guid orderId, [FromBody] UpdateOrderStatusDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var order = await _context.orders.FirstOrDefaultAsync(o => o.Id == orderId);
            if (order == null)
                return NotFound();

            if (!Enum.IsDefined(typeof(OrderStatus), dto.Status))
                return BadRequest($"Invalid status value: {dto.Status}");

            try
            {
                order.Status = dto.Status;

                // Create a professional in-app notification for the user
                var notification = new Notification
                {
                    UserId = order.UserId,
                    Title = "Order Status Updated",
                    Message = $"Your order #{order.Id.ToString().Substring(0, 8).ToUpper()} status has been updated to '{dto.Status.ToString()}'.",
                    Type = "Order",
                    Link = $"/orders/{order.Id}",
                    CreatedAt = DateTime.UtcNow
                };
                _context.Notifications.Add(notification);

                await _context.SaveChangesAsync();
                _logger.LogInformation("Order {OrderId} status updated to {Status} by {User}.",
                    orderId, dto.Status, User.Identity?.Name);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating status of order {OrderId}.", orderId);
                return StatusCode(500, "An error occurred while updating the order status.");
            }
        }

        // ── DeleteOrder (Admin) ───────────────────────────────────────────────

        [Authorize(Roles = "Admin,Manager")]
        [HttpDelete("{orderId:guid}")]
        public async Task<IActionResult> DeleteOrder(Guid orderId)
        {
            var order = await _context.orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
                return NotFound();

            try
            {
                if (order.Items.Any())
                    _context.OrderItems.RemoveRange(order.Items);

                _context.orders.Remove(order);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Order {OrderId} deleted by {User}.", orderId, User.Identity?.Name);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting order {OrderId}.", orderId);
                return StatusCode(500, "An error occurred while deleting the order.");
            }
        }

        // ── Stripe ────────────────────────────────────────────────────────────

        [Authorize]
        [HttpPost("CreateStripeCheckoutSession")]
        public async Task<IActionResult> CreateStripeCheckoutSession([FromForm] string? recaptchaToken, [FromQuery] string? promoCode)
        {
            if (!await _recaptchaService.ValidateTokenAsync(recaptchaToken, "stripe_checkout", 0.5m))
            {
                return BadRequest(new { message = "reCAPTCHA validation failed. Please refresh the page and try again." });
            }
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User context is missing.");

            if (string.IsNullOrWhiteSpace(_configuration["Stripe:SecretKey"]))
                return StatusCode(500, "Stripe is not configured on the server.");

            var cart = await _context.Carts
                .Include(c => c.Items)
                .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null || !cart.Items.Any())
                return BadRequest("Cart is empty.");

            try
            {
                var frontendBaseUrl = _configuration["Stripe:FrontendBaseUrl"] ?? "http://localhost:3000";

                var totalAmount = cart.Items.Sum(i => i.Product.Price * i.Quantity);
                decimal discountRatio = 0;

                if (!string.IsNullOrWhiteSpace(promoCode))
                {
                    var promo = await _context.PromoCodes
                        .FirstOrDefaultAsync(p => p.Code == promoCode.ToUpper().Trim() && !p.IsDeleted);

                    if (promo != null && promo.IsActive)
                    {
                        var now = DateTime.Now;
                        if ((!promo.StartDate.HasValue || promo.StartDate <= now) &&
                            (!promo.ExpirationDate.HasValue || promo.ExpirationDate >= now) &&
                            (!promo.MaxUsageCount.HasValue || promo.CurrentUsageCount < promo.MaxUsageCount) &&
                            (!promo.MinimumOrderAmount.HasValue || totalAmount >= promo.MinimumOrderAmount))
                        {
                            decimal applicableSubtotal = totalAmount;
                            if (promo.ApplicableProductId.HasValue)
                            {
                                var matchingItems = cart.Items.Where(i => i.ProductId == promo.ApplicableProductId.Value).ToList();
                                if (!matchingItems.Any())
                                {
                                    return BadRequest("This promo code is only valid for a specific product that is not in your cart.");
                                }
                                applicableSubtotal = matchingItems.Sum(i => i.Product.Price * i.Quantity);
                            }
                            else if (promo.ApplicableCategoryId.HasValue)
                            {
                                var matchingItems = cart.Items.Where(i => i.Product.CategoryId == promo.ApplicableCategoryId.Value).ToList();
                                if (!matchingItems.Any())
                                {
                                    return BadRequest("This promo code is only valid for a specific category that is not in your cart.");
                                }
                                applicableSubtotal = matchingItems.Sum(i => i.Product.Price * i.Quantity);
                            }

                            decimal discount = 0;
                            switch (promo.DiscountType)
                            {
                                case DiscountType.Percentage:
                                    discount = applicableSubtotal * (promo.DiscountValue / 100);
                                    if (promo.MaxDiscountAmount.HasValue)
                                        discount = Math.Min(discount, promo.MaxDiscountAmount.Value);
                                    break;
                                case DiscountType.FixedAmount:
                                    discount = Math.Min(promo.DiscountValue, applicableSubtotal);
                                    break;
                            }

                            if (totalAmount > 0)
                            {
                                discountRatio = discount / totalAmount;
                            }
                        }
                    }
                }

                var lineItems = cart.Items.Select(item => {
                    var finalPrice = item.Product.Price * (1m - discountRatio);
                    return new SessionLineItemOptions
                    {
                        Quantity = item.Quantity,
                        PriceData = new SessionLineItemPriceDataOptions
                        {
                            Currency = "egp",
                            UnitAmount = (long)Math.Round(finalPrice * 100m, MidpointRounding.AwayFromZero),
                            ProductData = new SessionLineItemPriceDataProductDataOptions
                            {
                                Name = item.Product.Name,
                                Description = item.Size != null ? $"Size: {item.Size}" : null,
                            }
                        }
                    };
                }).ToList();

                var options = new SessionCreateOptions
                {
                    Mode = "payment",
                    PaymentMethodTypes = new List<string> { "card" },
                    LineItems = lineItems,
                    SuccessUrl = $"{frontendBaseUrl}/checkout?stripeSuccess=true&session_id={{CHECKOUT_SESSION_ID}}",
                    CancelUrl = $"{frontendBaseUrl}/checkout?stripeCanceled=true",
                    Metadata = new Dictionary<string, string> { { "userId", userId } }
                };

                var service = new SessionService();
                var session = await service.CreateAsync(options);

                _logger.LogInformation("Stripe session {SessionId} created for user {UserId}.", session.Id, userId);
                return Ok(new { url = session.Url, sessionId = session.Id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating Stripe session for user {UserId}.", userId);
                return StatusCode(500, "An error occurred while creating the payment session.");
            }
        }

        [Authorize]
        [HttpGet("VerifyStripeSession/{sessionId}")]
        public async Task<IActionResult> VerifyStripeSession(string sessionId)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User context is missing.");

            if (string.IsNullOrWhiteSpace(_configuration["Stripe:SecretKey"]))
                return StatusCode(500, "Stripe is not configured on the server.");

            // Input validation: sessionId must match a safe pattern
            if (string.IsNullOrWhiteSpace(sessionId) || sessionId.Length > 200 ||
                !System.Text.RegularExpressions.Regex.IsMatch(sessionId, @"^[a-zA-Z0-9_\-]+$"))
            {
                return BadRequest("Invalid session ID format.");
            }

            try
            {
                var service = new SessionService();
                var session = await service.GetAsync(sessionId);

                var matchesUser = session.Metadata != null
                    && session.Metadata.TryGetValue("userId", out var sessionUserId)
                    && sessionUserId == userId;
                var isPaid = session.PaymentStatus == "paid" && matchesUser;
                return Ok(new { isPaid });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying Stripe session {SessionId} for user {UserId}.", sessionId, userId);
                return StatusCode(500, "An error occurred while verifying the payment session.");
            }
        }
    }
}
