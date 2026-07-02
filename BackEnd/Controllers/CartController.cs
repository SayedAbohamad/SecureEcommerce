using AutoMapper;
using BackEnd.DTO.Cart;
using BackEnd.DTO.Recommendation;
using BackEnd.Models;
using BackEnd.Services.Recommendations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CartController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IMapper _mapper;
        private readonly ILogger<CartController> _logger;
        private readonly IUserBehaviorTrackingService _trackingService;

        public CartController(
            ApplicationDbContext context,
            IMapper mapper,
            ILogger<CartController> logger,
            IUserBehaviorTrackingService trackingService)
        {
            _context = context;
            _mapper = mapper;
            _logger = logger;
            _trackingService = trackingService;
        }

        private string? GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);
        private string? GetSessionId() => Request.Headers.TryGetValue("X-Markety-Session-Id", out var value) ? value.ToString() : null;

        [Authorize]
        [HttpGet("GetCart")]
        public async Task<ActionResult<IEnumerable<CartItemDto>>> GetCart()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User context is missing.");

            var cart = await _context.Carts
                .Include(x => x.Items)
                .ThenInclude(p => p.Product)
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (cart == null || !cart.Items.Any())
                return Ok(new List<CartItemDto>());

            var result = _mapper.Map<List<CartItemDto>>(cart.Items);
            return Ok(result);
        }

        [Authorize]
        [HttpPost]
        public async Task<ActionResult> AddToCart([FromForm] AddCartItemDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User context is missing.");

            // Business logic fix (#10): verify the product actually exists in the database
            var product = await _context.products.FindAsync(dto.ProductId);
            if (product == null)
                return NotFound("Product not found.");

            // Business logic fix (#10): validate sufficient stock
            if (product.Stock < dto.Quantity)
                return BadRequest($"Insufficient stock. Available: {product.Stock}.");

            try
            {
                var cart = await _context.Carts
                    .Include(x => x.Items)
                    .FirstOrDefaultAsync(x => x.UserId == userId);

                if (cart == null)
                {
                    cart = new Cart { UserId = userId, Items = new List<CartItem>() };
                    _context.Carts.Add(cart);
                    await _context.SaveChangesAsync();
                }

                var existingItem = cart.Items.FirstOrDefault(i => i.ProductId == dto.ProductId && i.Size == dto.Size);

                if (existingItem != null)
                {
                    // Business logic fix (#10): also check stock for cumulative quantity
                    if (product.Stock < existingItem.Quantity + dto.Quantity)
                        return BadRequest($"Insufficient stock. Available: {product.Stock}.");

                    existingItem.Quantity += dto.Quantity;
                }
                else
                {
                    var newItem = new CartItem
                    {
                        ProductId = dto.ProductId,
                        Quantity = dto.Quantity,
                        Size = dto.Size,
                        CartId = cart.Id
                    };
                    _context.CartItems.Add(newItem);
                }

                await _context.SaveChangesAsync();
                try
                {
                    await _trackingService.TrackAsync(new BehaviorEventRequestDto
                    {
                        EventType = "add_to_cart",
                        ProductId = dto.ProductId,
                        Quantity = dto.Quantity,
                        Source = "cart_api"
                    }, userId, GetSessionId());
                }
                catch (Exception trackingEx)
                {
                    _logger.LogWarning(trackingEx, "Recommendation tracking failed for cart add. User: {UserId}, Product: {ProductId}.", userId, dto.ProductId);
                }
                _logger.LogInformation("User {UserId} added product {ProductId} (qty {Qty}) to cart.", userId, dto.ProductId, dto.Quantity);
                return Ok("Item Added To Cart");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding item to cart for user {UserId}.", userId);
                return StatusCode(500, "An error occurred while updating the cart.");
            }
        }

        [Authorize]
        [HttpDelete("{productId}")]
        public async Task<ActionResult> RemoveFromCart(Guid productId, [FromQuery] string? size = null)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User context is missing.");

            try
            {
                // IDOR fix (#4): filter by userId via cart ownership
                var cartItem = await _context.CartItems
                    .Include(c => c.Cart)
                    .FirstOrDefaultAsync(x => x.Cart.UserId == userId && x.ProductId == productId && x.Size == size);

                if (cartItem == null)
                    return NotFound("Item not found in cart.");

                _context.CartItems.Remove(cartItem);
                await _context.SaveChangesAsync();
                _logger.LogInformation("User {UserId} removed product {ProductId} from cart.", userId, productId);
                return Ok("Item removed from cart.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing item from cart for user {UserId}.", userId);
                return StatusCode(500, "An error occurred while removing the item.");
            }
        }

        [Authorize]
        [HttpPut]
        public async Task<ActionResult> UpdateCart([FromForm] AddCartItemDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User context is missing.");

            // Business logic fix (#10): verify product exists and check stock
            var product = await _context.products.FindAsync(dto.ProductId);
            if (product == null)
                return NotFound("Product not found.");

            if (product.Stock < dto.Quantity)
                return BadRequest($"Insufficient stock. Available: {product.Stock}.");

            try
            {
                // IDOR fix (#4): filter by userId via cart ownership
                var cartItem = await _context.CartItems
                    .Include(c => c.Cart)
                    .FirstOrDefaultAsync(x => x.Cart.UserId == userId && x.ProductId == dto.ProductId);

                if (cartItem == null)
                    return NotFound("Item not found in cart.");

                cartItem.Quantity = dto.Quantity;
                await _context.SaveChangesAsync();
                _logger.LogInformation("User {UserId} updated product {ProductId} qty to {Qty} in cart.", userId, dto.ProductId, dto.Quantity);
                return Ok("Item updated in cart.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating cart for user {UserId}.", userId);
                return StatusCode(500, "An error occurred while updating the cart.");
            }
        }
    }
}
