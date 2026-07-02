using BackEnd.DTO.Profile;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BackEnd.Controllers
{
    [Route("api/profile/email")]
    [ApiController]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _db;
        private readonly IEmailService _emailService;
        private readonly ILogger<ProfileController> _logger;

        public ProfileController(
            UserManager<ApplicationUser> userManager,
            ApplicationDbContext db,
            IEmailService emailService,
            ILogger<ProfileController> logger)
        {
            _userManager = userManager;
            _db = db;
            _emailService = emailService;
            _logger = logger;
        }

        // 1) PATCH /api/profile/email/request
        [HttpPatch("request")]
        public async Task<IActionResult> RequestEmailChange([FromBody] EmailRequestDto model)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (string.IsNullOrWhiteSpace(model.NewEmail))
                return BadRequest(new { message = "New email is required." });

            if (model.NewEmail.Trim().Equals(user.Email, StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "New email must be different from current email." });

            var existingUser = await _userManager.FindByEmailAsync(model.NewEmail);
            if (existingUser != null)
                return BadRequest(new { message = "Email is already in use." });

            // Remove any existing pending changes for this user to start fresh
            var existingPending = _db.PendingEmailChanges.Where(p => p.UserId == user.Id);
            _db.PendingEmailChanges.RemoveRange(existingPending);

            var otp = Random.Shared.Next(100000, 999999).ToString();
            
            var pending = new PendingEmailChange
            {
                UserId = user.Id,
                NewEmail = model.NewEmail.Trim(),
                Otp = otp,
                Type = "VERIFY_OLD_EMAIL",
                ExpiresAt = DateTime.UtcNow.AddMinutes(15)
            };

            _db.PendingEmailChanges.Add(pending);
            await _db.SaveChangesAsync();

            try
            {
                await _emailService.SendOtpEmailAsync(user.Email!, otp);
                return Ok(new { message = "OTP sent to current email" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email change OTP to {Email}", user.Email);
                return StatusCode(500, new { message = "Failed to send verification code." });
            }
        }

        // 2) POST /api/profile/email/verify-old
        [HttpPost("verify-old")]
        public async Task<IActionResult> VerifyOldEmail([FromBody] VerifyOldEmailDto model)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var pending = await _db.PendingEmailChanges
                .FirstOrDefaultAsync(p => p.UserId == userId && p.Type == "VERIFY_OLD_EMAIL");

            if (pending == null || pending.ExpiresAt < DateTime.UtcNow)
                return BadRequest(new { message = "Verification session expired or not found." });

            if (pending.Otp != model.Otp)
                return BadRequest(new { message = "Invalid OTP." });

            var tempToken = Guid.NewGuid().ToString("N");
            pending.Token = tempToken;
            pending.Otp = null; // Clear old OTP
            // We keep the record but update it for the next step or could use a new one. 
            // The user suggested "type = VERIFY_OLD_EMAIL" so maybe they want separate ones, 
            // but a flow-based update is cleaner.
            
            await _db.SaveChangesAsync();

            return Ok(new { changeEmailToken = tempToken });
        }

        // 3) POST /api/profile/email/send-new-otp
        [HttpPost("send-new-otp")]
        public async Task<IActionResult> SendNewOtp([FromBody] SendNewOtpDto model)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var pending = await _db.PendingEmailChanges
                .FirstOrDefaultAsync(p => p.UserId == userId && p.Token == model.ChangeEmailToken);

            if (pending == null || pending.ExpiresAt < DateTime.UtcNow)
                return BadRequest(new { message = "Invalid or expired token." });

            if (!pending.NewEmail!.Equals(model.NewEmail, StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Email mismatch." });

            var otp = Random.Shared.Next(100000, 999999).ToString();
            pending.Otp = otp;
            pending.Type = "VERIFY_NEW_EMAIL";
            pending.ExpiresAt = DateTime.UtcNow.AddMinutes(15);

            await _db.SaveChangesAsync();

            try
            {
                await _emailService.SendOtpEmailAsync(model.NewEmail, otp);
                return Ok(new { message = "OTP sent to new email" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send OTP to new email {Email}", model.NewEmail);
                return StatusCode(500, new { message = "Failed to send verification code." });
            }
        }

        // 4) POST /api/profile/email/confirm
        [HttpPost("confirm")]
        public async Task<IActionResult> ConfirmEmailChange([FromBody] ConfirmEmailChangeDto model)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var pending = await _db.PendingEmailChanges
                .FirstOrDefaultAsync(p => p.UserId == userId && p.Token == model.ChangeEmailToken && p.Type == "VERIFY_NEW_EMAIL");

            if (pending == null || pending.ExpiresAt < DateTime.UtcNow)
                return BadRequest(new { message = "Invalid or expired session." });

            if (pending.Otp != model.Otp)
                return BadRequest(new { message = "Invalid OTP." });

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            // Final check if email was taken in the meantime
            var existingUser = await _userManager.FindByEmailAsync(pending.NewEmail!);
            if (existingUser != null && existingUser.Id != user.Id)
                return BadRequest(new { message = "This email address is already in use." });

            var token = await _userManager.GenerateChangeEmailTokenAsync(user, pending.NewEmail!);
            var result = await _userManager.ChangeEmailAsync(user, pending.NewEmail!, token);

            if (!result.Succeeded)
                return BadRequest(new { message = string.Join(" ", result.Errors.Select(e => e.Description)) });

            // Also update username if email is used as username
            await _userManager.SetUserNameAsync(user, pending.NewEmail!);
            
            _db.PendingEmailChanges.Remove(pending);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Email updated successfully" });
        }

        // 5) POST /api/profile/delete-request
        [HttpPost("~/api/profile/delete-request")]
        public async Task<IActionResult> RequestAccountDeletion([FromBody] DeleteAccountRequestDto model)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var isPasswordValid = await _userManager.CheckPasswordAsync(user, model.Password);
            if (!isPasswordValid)
                return BadRequest(new { message = "Invalid password." });

            var existingPending = _db.PendingEmailChanges.Where(p => p.UserId == user.Id && p.Type == "DELETE_ACCOUNT");
            _db.PendingEmailChanges.RemoveRange(existingPending);

            var otp = Random.Shared.Next(100000, 999999).ToString();
            
            var pending = new PendingEmailChange
            {
                UserId = user.Id,
                NewEmail = user.Email, // Store current email here for reference if needed
                Otp = otp,
                Type = "DELETE_ACCOUNT",
                ExpiresAt = DateTime.UtcNow.AddMinutes(15)
            };

            _db.PendingEmailChanges.Add(pending);
            await _db.SaveChangesAsync();

            try
            {
                await _emailService.SendDeleteAccountOtpEmailAsync(user.Email!, otp);
                return Ok(new { message = "Account deletion OTP sent to your email" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send account deletion OTP to {Email}", user.Email);
                return StatusCode(500, new { message = "Failed to send verification code." });
            }
        }

        // 6) POST /api/profile/delete-confirm
        [HttpPost("~/api/profile/delete-confirm")]
        public async Task<IActionResult> ConfirmAccountDeletion([FromBody] DeleteAccountConfirmDto model)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            var isPasswordValid = await _userManager.CheckPasswordAsync(user, model.Password);
            if (!isPasswordValid)
                return BadRequest(new { message = "Invalid password." });

            var pending = await _db.PendingEmailChanges
                .FirstOrDefaultAsync(p => p.UserId == userId && p.Type == "DELETE_ACCOUNT");

            if (pending == null || pending.ExpiresAt < DateTime.UtcNow)
                return BadRequest(new { message = "Verification session expired or not found." });

            if (pending.Otp != model.Otp)
                return BadRequest(new { message = "Invalid OTP." });

            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                return BadRequest(new { message = "Failed to delete account." });
            }

            // Cleanup pending states
            _db.PendingEmailChanges.Remove(pending);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Account deleted successfully" });
        }
    }
}
