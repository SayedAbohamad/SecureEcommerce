using AutoMapper;
using BackEnd.DTO.PromoCode;
using BackEnd.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PromoCodeController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IMapper _mapper;
        private readonly ILogger<PromoCodeController> _logger;

        public PromoCodeController(ApplicationDbContext context, IMapper mapper, ILogger<PromoCodeController> logger)
        {
            _context = context;
            _mapper = mapper;
            _logger = logger;
        }

        /// <summary>Get all promo codes (admin).</summary>
        [HttpGet]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<IEnumerable<GetPromoCodeDto>>> GetAll()
        {
            var promos = await _context.PromoCodes
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            var dtos = _mapper.Map<List<GetPromoCodeDto>>(promos);
            return Ok(dtos);
        }

        /// <summary>Get a single promo code by id (admin).</summary>
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<GetPromoCodeDto>> GetById(Guid id)
        {
            var promo = await _context.PromoCodes.FindAsync(id);
            if (promo == null) return NotFound();
            return Ok(_mapper.Map<GetPromoCodeDto>(promo));
        }

        /// <summary>Create a new promo code (admin).</summary>
        [HttpPost]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<GetPromoCodeDto>> Create([FromBody] CreatePromoCodeDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Validate discount type enum
            if (!Enum.TryParse<DiscountType>(dto.DiscountType, true, out var discountType))
                return BadRequest(new { message = $"Invalid discount type: {dto.DiscountType}. Valid types: Percentage, FixedAmount, FreeShipping, BuyXGetY" });

            // Validate percentage range
            if (discountType == DiscountType.Percentage && dto.DiscountValue > 100)
                return BadRequest(new { message = "Percentage discount cannot exceed 100%." });

            // Check code uniqueness
            var exists = await _context.PromoCodes.AnyAsync(p => p.Code.ToUpper() == dto.Code.ToUpper());
            if (exists)
                return Conflict(new { message = $"Promo code '{dto.Code}' already exists." });

            // Validate BuyXGetY params
            if (discountType == DiscountType.BuyXGetY)
            {
                if (!dto.BuyQuantity.HasValue || !dto.GetQuantity.HasValue || dto.BuyQuantity < 1 || dto.GetQuantity < 1)
                    return BadRequest(new { message = "Buy X Get Y requires both BuyQuantity and GetQuantity to be at least 1." });
            }

            var promo = _mapper.Map<PromoCode>(dto);
            promo.Code = promo.Code.ToUpper().Trim();
            promo.DiscountType = discountType;
            promo.CreatedBy = User.Identity?.Name;

            _context.PromoCodes.Add(promo);
            await _context.SaveChangesAsync();

            // Broadcast an in-app offer notification to all users who opted in
            var optedInUsers = await _context.Users
                .Where(u => u.ReceiveOfferEmails)
                .Select(u => u.Id)
                .ToListAsync();

            if (optedInUsers.Any())
            {
                string discountLabel = discountType == DiscountType.Percentage
                    ? $"{promo.DiscountValue}% off"
                    : discountType == DiscountType.FixedAmount
                        ? $"{promo.DiscountValue} EGP off"
                        : discountType.ToString();

                foreach (var uid in optedInUsers)
                {
                    _context.Notifications.Add(new Notification
                    {
                        UserId = uid,
                        Title = "New Promo Code Available! 🎉",
                        Message = $"Use code \"{promo.Code}\" to get {discountLabel} on your next purchase. Don't miss out!",
                        Type = "Offer",
                        Link = "/shop",
                        CreatedAt = DateTime.UtcNow
                    });
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation("Offer notification sent to {Count} users for promo {Code}.", optedInUsers.Count, promo.Code);
            }

            _logger.LogInformation("Promo code created: {Code} by {User}", promo.Code, User.Identity?.Name);
            return CreatedAtAction(nameof(GetById), new { id = promo.Id }, _mapper.Map<GetPromoCodeDto>(promo));
        }

        /// <summary>Update an existing promo code (admin).</summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePromoCodeDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var promo = await _context.PromoCodes.FindAsync(id);
            if (promo == null) return NotFound();

            if (!Enum.TryParse<DiscountType>(dto.DiscountType, true, out var discountType))
                return BadRequest(new { message = $"Invalid discount type: {dto.DiscountType}." });

            if (discountType == DiscountType.Percentage && dto.DiscountValue > 100)
                return BadRequest(new { message = "Percentage discount cannot exceed 100%." });

            // Check code uniqueness (excluding current)
            var duplicate = await _context.PromoCodes.AnyAsync(p => p.Code.ToUpper() == dto.Code.ToUpper() && p.Id != id);
            if (duplicate)
                return Conflict(new { message = $"Promo code '{dto.Code}' already exists." });

            if (discountType == DiscountType.BuyXGetY)
            {
                if (!dto.BuyQuantity.HasValue || !dto.GetQuantity.HasValue || dto.BuyQuantity < 1 || dto.GetQuantity < 1)
                    return BadRequest(new { message = "Buy X Get Y requires both BuyQuantity and GetQuantity." });
            }

            promo.Code = dto.Code.ToUpper().Trim();
            promo.Description = dto.Description;
            promo.DiscountType = discountType;
            promo.DiscountValue = dto.DiscountValue;
            promo.MinimumOrderAmount = dto.MinimumOrderAmount;
            promo.MaxDiscountAmount = dto.MaxDiscountAmount;
            promo.MaxUsageCount = dto.MaxUsageCount;
            promo.MaxUsagePerUser = dto.MaxUsagePerUser;
            promo.StartDate = dto.StartDate;
            promo.ExpirationDate = dto.ExpirationDate;
            promo.ApplicableCategoryId = dto.ApplicableCategoryId;
            promo.ApplicableProductId = dto.ApplicableProductId;
            promo.BuyQuantity = dto.BuyQuantity;
            promo.GetQuantity = dto.GetQuantity;
            promo.IsActive = dto.IsActive;
            promo.UpdatedAt = DateTime.UtcNow;
            promo.UpdatedBy = User.Identity?.Name;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Promo code updated: {Code} by {User}", promo.Code, User.Identity?.Name);
            return NoContent();
        }

        /// <summary>Delete a promo code (admin).</summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var promo = await _context.PromoCodes.FindAsync(id);
            if (promo == null) return NotFound();

            _context.PromoCodes.Remove(promo);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Promo code deleted: {Code} by {User}", promo.Code, User.Identity?.Name);
            return NoContent();
        }

        /// <summary>Toggle active status of a promo code (admin).</summary>
        [HttpPatch("{id}/toggle")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> ToggleActive(Guid id)
        {
            var promo = await _context.PromoCodes.FindAsync(id);
            if (promo == null) return NotFound();

            promo.IsActive = !promo.IsActive;
            promo.UpdatedAt = DateTime.UtcNow;
            promo.UpdatedBy = User.Identity?.Name;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Promo code {Code} toggled to {Status} by {User}", promo.Code, promo.IsActive ? "Active" : "Inactive", User.Identity?.Name);
            return Ok(new { isActive = promo.IsActive });
        }

        /// <summary>Get dashboard statistics for promo codes (admin).</summary>
        [HttpGet("stats")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult> GetStats()
        {
            var now = DateTime.Now;
            var all = await _context.PromoCodes.ToListAsync();

            var total = all.Count;
            var active = all.Count(p => p.IsActive && (!p.ExpirationDate.HasValue || p.ExpirationDate > now) && (!p.StartDate.HasValue || p.StartDate <= now));
            var expired = all.Count(p => p.ExpirationDate.HasValue && p.ExpirationDate <= now);
            var scheduled = all.Count(p => p.StartDate.HasValue && p.StartDate > now && p.IsActive);
            var totalUsage = all.Sum(p => p.CurrentUsageCount);

            return Ok(new
            {
                total,
                active,
                expired,
                scheduled,
                totalUsage
            });
        }

        /// <summary>Validate a promo code (available to authenticated users for checkout).</summary>
        [HttpPost("validate")]
        [Authorize]
        public async Task<ActionResult> Validate([FromBody] ValidatePromoCodeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Code))
                return BadRequest(new { message = "Promo code is required." });

            var promo = await _context.PromoCodes
                .FirstOrDefaultAsync(p => p.Code == request.Code.ToUpper().Trim());

            if (promo == null)
                return NotFound(new { message = "Promo code not found." });

            if (!promo.IsActive)
                return BadRequest(new { message = "This promo code is no longer active." });

            var now = DateTime.Now;
            if (promo.StartDate.HasValue && promo.StartDate > now)
                return BadRequest(new { message = "This promo code is not yet valid." });

            if (promo.ExpirationDate.HasValue && promo.ExpirationDate < now)
                return BadRequest(new { message = "This promo code has expired." });

            if (promo.MaxUsageCount.HasValue && promo.CurrentUsageCount >= promo.MaxUsageCount)
                return BadRequest(new { message = "This promo code has been fully redeemed." });

            if (promo.MinimumOrderAmount.HasValue && request.OrderTotal < promo.MinimumOrderAmount)
                return BadRequest(new { message = $"Minimum order amount is {promo.MinimumOrderAmount:C}." });

            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            if (promo.MaxUsagePerUser.HasValue && !string.IsNullOrEmpty(userId))
            {
                var userUsageCount = await _context.orders
                    .CountAsync(o => o.UserId == userId && o.PromoCode == promo.Code);

                if (userUsageCount >= promo.MaxUsagePerUser.Value)
                    return BadRequest(new { message = $"You have already used this promo code the maximum allowed times ({promo.MaxUsagePerUser.Value})." });
            }

            decimal applicableSubtotal = request.OrderTotal;

            if (!string.IsNullOrEmpty(userId))
            {
                var cart = await _context.Carts
                    .Include(c => c.Items)
                    .ThenInclude(i => i.Product)
                    .FirstOrDefaultAsync(c => c.UserId == userId);

                if (cart != null && cart.Items.Any())
                {
                    if (promo.ApplicableProductId.HasValue)
                    {
                        var matchingItems = cart.Items.Where(i => i.ProductId == promo.ApplicableProductId.Value).ToList();
                        if (!matchingItems.Any())
                        {
                            return BadRequest(new { message = "This promo code is only valid for a specific product that is not in your cart." });
                        }
                        applicableSubtotal = matchingItems.Sum(i => i.Product.Price * i.Quantity);
                    }
                    else if (promo.ApplicableCategoryId.HasValue)
                    {
                        var matchingItems = cart.Items.Where(i => i.Product.CategoryId == promo.ApplicableCategoryId.Value).ToList();
                        if (!matchingItems.Any())
                        {
                            return BadRequest(new { message = "This promo code is only valid for a specific category that is not in your cart." });
                        }
                        applicableSubtotal = matchingItems.Sum(i => i.Product.Price * i.Quantity);
                    }
                }
            }

            // Calculate discount
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
                    discount = 0; // Shipping cost handled separately
                    break;
                case DiscountType.BuyXGetY:
                    discount = 0; // Complex logic, handled at checkout
                    break;
            }

            return Ok(new
            {
                valid = true,
                code = promo.Code,
                discountType = promo.DiscountType.ToString(),
                discountValue = promo.DiscountValue,
                calculatedDiscount = Math.Round(discount, 2),
                description = promo.Description
            });
        }

        /// <summary>Get all active promo codes for customers.</summary>
        [HttpGet("active")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<GetPromoCodeDto>>> GetActive()
        {
            var now = DateTime.Now;
            var activePromos = await _context.PromoCodes
                .Where(p => p.IsActive && !p.IsDeleted)
                .Where(p => !p.StartDate.HasValue || p.StartDate <= now)
                .Where(p => !p.ExpirationDate.HasValue || p.ExpirationDate > now)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            var dtos = _mapper.Map<List<GetPromoCodeDto>>(activePromos);
            return Ok(dtos);
        }
    }

    public class ValidatePromoCodeRequest
    {
        public string Code { get; set; } = string.Empty;
        public decimal OrderTotal { get; set; }
    }
}
