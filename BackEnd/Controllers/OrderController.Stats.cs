using BackEnd.DTO.Order;
using BackEnd.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Controllers
{
    public partial class OrderController
    {
        [Authorize]
        [HttpGet("favorite-category")]
        public async Task<ActionResult<string>> GetFavoriteCategory()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var favoriteCategory = await _context.OrderItems
                .Where(oi => oi.Order.UserId == userId)
                .Include(oi => oi.Product)
                    .ThenInclude(p => p.Category)
                .GroupBy(oi => oi.Product.Category.Name)
                .OrderByDescending(g => g.Count())
                .Select(g => g.Key)
                .FirstOrDefaultAsync();

            return Ok(favoriteCategory ?? "No purchases yet");
        }
    }
}
