using BackEnd.DTO;
using BackEnd.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public NotificationController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ── Get My Notifications ──────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetMyNotifications()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new
                {
                    n.Id,
                    n.Title,
                    n.Message,
                    n.Type,
                    n.IsRead,
                    n.Link,
                    n.CreatedAt
                })
                .ToListAsync();

            return Ok(notifications);
        }

        // ── Mark as Read ──────────────────────────────────────────────────
        [HttpPut("{id:guid}/read")]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var notification = await _context.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
            if (notification == null) return NotFound();

            notification.IsRead = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Marked as read" });
        }

        // ── Mark All as Read ──────────────────────────────────────────────
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var n in notifications)
            {
                n.IsRead = true;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "All marked as read" });
        }

        // ── Get Notification Settings ─────────────────────────────────────
        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            return Ok(new
            {
                user.ReceiveSupportEmails,
                user.ReceiveOfferEmails,
                user.NotificationEmail
            });
        }

        // ── Update Notification Settings ──────────────────────────────────
        [HttpPut("settings")]
        public async Task<IActionResult> UpdateSettings([FromBody] UpdateNotificationSettingsDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            user.ReceiveSupportEmails = dto.ReceiveSupportEmails;
            user.ReceiveOfferEmails = dto.ReceiveOfferEmails;
            
            if (string.IsNullOrWhiteSpace(dto.NotificationEmail))
            {
                user.NotificationEmail = null;
            }
            else
            {
                user.NotificationEmail = dto.NotificationEmail.Trim();
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Notification settings updated successfully." });
        }
    }

    public class UpdateNotificationSettingsDto
    {
        public bool ReceiveSupportEmails { get; set; }
        public bool ReceiveOfferEmails { get; set; }
        public string? NotificationEmail { get; set; }
    }
}
