using BackEnd.DTO.Support;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace BackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SupportController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<SupportController> _logger;
        private readonly IRecaptchaService _recaptchaService;
        private readonly ISupportTicketAiService _supportTicketAiService;

        public SupportController(
            ApplicationDbContext context,
            IEmailService emailService,
            ILogger<SupportController> logger,
            IRecaptchaService recaptchaService,
            ISupportTicketAiService supportTicketAiService)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
            _recaptchaService = recaptchaService;
            _supportTicketAiService = supportTicketAiService;
        }

        // ── Submit a support ticket (public or logged-in) ──────────────────
        [HttpPost]
        public async Task<IActionResult> Submit([FromBody] SubmitTicketDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!await _recaptchaService.ValidateTokenAsync(dto.RecaptchaToken, "submit_support", 0.4m))
            {
                return BadRequest(new { message = "reCAPTCHA validation failed. Please refresh the page and try again." });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var ticket = new SupportTicket
            {
                Name = dto.Name.Trim(),
                Email = dto.Email.Trim(),
                Phone = dto.Phone?.Trim(),
                Subject = dto.Subject.Trim(),
                Message = dto.Message.Trim(),
                UserId = userId,
                Status = TicketStatus.Open,
                CreatedAt = DateTime.UtcNow
            };

            _context.SupportTickets.Add(ticket);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Support ticket {TicketId} submitted by {Email}.", ticket.Id, ticket.Email);

            return Ok(new { message = "Your message has been sent successfully. We will get back to you soon!", ticketId = ticket.Id });
        }

        // ── Get all tickets (Admin/Manager only) ──────────────────────────
        [HttpGet]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult> GetAll([FromQuery] string? status)
        {
            var query = _context.SupportTickets.AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<TicketStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(t => t.Status == parsedStatus);
            }

            var tickets = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    t.Email,
                    t.Phone,
                    t.Subject,
                    t.Message,
                    Status = t.Status.ToString(),
                    t.CreatedAt,
                    t.AdminReply,
                    t.RepliedAt,
                    t.RepliedBy
                })
                .ToListAsync();

            return Ok(tickets);
        }

        // ── Get my tickets (Logged-in user) ───────────────────────────────
        [HttpGet("mine")]
        [Authorize]
        public async Task<ActionResult> GetMine()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var tickets = await _context.SupportTickets
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.Subject,
                    t.Message,
                    Status = t.Status.ToString(),
                    t.CreatedAt,
                    t.AdminReply,
                    t.RepliedAt,
                    t.RepliedBy
                })
                .ToListAsync();

            return Ok(tickets);
        }

        // ── Get single ticket ─────────────────────────────────────────────
        [HttpGet("{id:guid}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult> GetById(Guid id)
        {
            var ticket = await _context.SupportTickets.FindAsync(id);
            if (ticket == null) return NotFound();

            return Ok(new
            {
                ticket.Id,
                ticket.Name,
                ticket.Email,
                ticket.Phone,
                ticket.Subject,
                ticket.Message,
                Status = ticket.Status.ToString(),
                ticket.CreatedAt,
                ticket.AdminReply,
                ticket.RepliedAt,
                ticket.RepliedBy
            });
        }

        [HttpPost("{id:guid}/ai/summarize")]
        [Authorize(Roles = "Admin,Manager")]
        [EnableRateLimiting("ai")]
        public async Task<IActionResult> Summarize(Guid id, CancellationToken cancellationToken)
        {
            var ticket = await _context.SupportTickets.FindAsync(new object[] { id }, cancellationToken);
            if (ticket == null) return NotFound();

            return Ok(await _supportTicketAiService.SummarizeAsync(ticket, cancellationToken));
        }

        [HttpPost("{id:guid}/ai/suggest-reply")]
        [Authorize(Roles = "Admin,Manager")]
        [EnableRateLimiting("ai")]
        public async Task<IActionResult> SuggestReply(Guid id, [FromBody] SupportTicketAiTextRequestDto? dto, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var ticket = await _context.SupportTickets.FindAsync(new object[] { id }, cancellationToken);
            if (ticket == null) return NotFound();

            return Ok(await _supportTicketAiService.SuggestReplyAsync(ticket, dto?.AdditionalContext, cancellationToken));
        }

        [HttpPost("{id:guid}/ai/classify")]
        [Authorize(Roles = "Admin,Manager")]
        [EnableRateLimiting("ai")]
        public async Task<IActionResult> Classify(Guid id, CancellationToken cancellationToken)
        {
            var ticket = await _context.SupportTickets.FindAsync(new object[] { id }, cancellationToken);
            if (ticket == null) return NotFound();

            return Ok(await _supportTicketAiService.ClassifyAsync(ticket, cancellationToken));
        }

        // ── Reply to a ticket (sends email to user) ───────────────────────
        [HttpPost("{id:guid}/reply")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Reply(Guid id, [FromBody] ReplyTicketDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var ticket = await _context.SupportTickets.FindAsync(id);
            if (ticket == null) return NotFound();

            var adminName = User.FindFirstValue(ClaimTypes.Name) ?? "Support Team";

            ticket.AdminReply = dto.Reply.Trim();
            ticket.RepliedAt = DateTime.UtcNow;
            ticket.RepliedBy = adminName;
            ticket.Status = TicketStatus.Replied;

            // Find if the user is registered to create an in-app notification and check settings
            ApplicationUser? user = null;
            if (!string.IsNullOrEmpty(ticket.UserId))
            {
                user = await _context.Users.FindAsync(ticket.UserId);
            }
            else
            {
                // Try finding by email just in case they used the contact form without logging in but exist
                user = await _context.Users.FirstOrDefaultAsync(u => u.Email == ticket.Email);
            }

            if (user != null)
            {
                // Create an in-app notification
                var notification = new Notification
                {
                    UserId = user.Id,
                    Title = "Support Ticket Replied",
                    Message = $"Your support ticket '{ticket.Subject}' has received a reply.",
                    Type = "Support",
                    Link = "/contact",
                    CreatedAt = DateTime.UtcNow
                };
                _context.Notifications.Add(notification);
            }

            await _context.SaveChangesAsync();

            // Send email notification to the user if they allow it
            bool sendEmail = true;
            string targetEmail = ticket.Email;

            if (user != null)
            {
                if (!user.ReceiveSupportEmails)
                {
                    sendEmail = false;
                }
                if (!string.IsNullOrEmpty(user.NotificationEmail))
                {
                    targetEmail = user.NotificationEmail;
                }
            }

            if (sendEmail)
            {
                try
                {
                    var emailBody = $@"
<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
    <div style='background: linear-gradient(135deg, #5B3DC8, #7C5FE0); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;'>
        <h1 style='color: white; margin: 0; font-size: 24px;'>Markety Support</h1>
    </div>
    <div style='background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;'>
        <p style='color: #374151; font-size: 16px;'>Hi <strong>{ticket.Name}</strong>,</p>
        <p style='color: #374151;'>Thank you for contacting us. Here is our response to your inquiry:</p>
        <div style='background: #f3f4f6; padding: 20px; border-radius: 8px; border-left: 4px solid #5B3DC8; margin: 20px 0;'>
            <p style='color: #6b7280; font-size: 13px; margin: 0 0 8px 0;'><strong>Your Subject:</strong> {ticket.Subject}</p>
            <p style='color: #6b7280; font-size: 13px; margin: 0;'><strong>Your Message:</strong> {ticket.Message}</p>
        </div>
        <div style='background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10B981; margin: 20px 0;'>
            <p style='color: #065f46; font-size: 13px; margin: 0 0 8px 0;'><strong>Our Response:</strong></p>
            <p style='color: #065f46; font-size: 14px; margin: 0;'>{ticket.AdminReply}</p>
        </div>
        <p style='color: #6b7280; font-size: 14px;'>If you have any more questions, feel free to reach out again!</p>
        <p style='color: #374151;'>Best regards,<br/><strong>Markety Support Team</strong></p>
    </div>
    <div style='background: #f9fafb; padding: 15px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;'>
        <p style='color: #9ca3af; font-size: 12px; margin: 0;'>© 2026 Markety. All rights reserved.</p>
    </div>
</div>";

                    await _emailService.SendEmailAsync(targetEmail, $"Re: {ticket.Subject} — Markety Support", emailBody);
                    _logger.LogInformation("Support reply email sent to {Email} for ticket {TicketId}.", targetEmail, ticket.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send support reply email to {Email} for ticket {TicketId}.", targetEmail, ticket.Id);
                    // Don't fail the reply if email fails — the reply is already saved
                }
            }

            return Ok(new { message = "Reply sent successfully." });
        }

        // ── Close a ticket ────────────────────────────────────────────────
        [HttpPut("{id:guid}/close")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Close(Guid id)
        {
            var ticket = await _context.SupportTickets.FindAsync(id);
            if (ticket == null) return NotFound();

            ticket.Status = TicketStatus.Closed;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Ticket closed." });
        }

        // ── Delete a ticket ───────────────────────────────────────────────
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var ticket = await _context.SupportTickets.FindAsync(id);
            if (ticket == null) return NotFound();

            _context.SupportTickets.Remove(ticket);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    // ── DTOs ──────────────────────────────────────────────────────────────

    public class SubmitTicketDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(200)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Phone { get; set; }

        [Required]
        [MaxLength(200)]
        public string Subject { get; set; } = string.Empty;

        [Required]
        [MaxLength(4000)]
        public string Message { get; set; } = string.Empty;

        [Required]
        public string RecaptchaToken { get; set; } = string.Empty;
    }

    public class ReplyTicketDto
    {
        [Required]
        [MaxLength(4000)]
        public string Reply { get; set; } = string.Empty;
    }
}
