using BackEnd.DTO;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using OtpNet;

namespace BackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("auth")]
    public class AuthController : ControllerBase
    {
        private const string SelfServiceRole = "Customer";
        private static readonly ConfigurationManager<OpenIdConnectConfiguration> GoogleOpenIdConfiguration =
            new(
                "https://accounts.google.com/.well-known/openid-configuration",
                new OpenIdConnectConfigurationRetriever());

        private readonly UserManager<ApplicationUser> _userManager;
        public readonly SignInManager<ApplicationUser> _signInManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthController> _logger;
        private readonly IEmailService _emailService;
        private readonly ApplicationDbContext _db;
        private readonly IRecaptchaService _recaptchaService;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            RoleManager<IdentityRole> roleManager,
            IConfiguration config,
            ILogger<AuthController> logger,
            IEmailService emailService,
            IRecaptchaService recaptchaService,
            ApplicationDbContext db)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _roleManager = roleManager;
            _config = config;
            _logger = logger;
            _emailService = emailService;
            _recaptchaService = recaptchaService;
            _db = db;
        }


        [HttpPost("Register")]
        public async Task<IActionResult> Register([FromForm] RegisterDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!string.IsNullOrWhiteSpace(model.Role)
                && !string.Equals(model.Role, SelfServiceRole, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Privilege escalation attempt: registration with role '{Role}' from IP {IP}.",
                    model.Role, HttpContext.Connection.RemoteIpAddress);
                return BadRequest(new { message = "Self-registration is only allowed for the Customer role." });
            }

            var existingUser = await _userManager.FindByEmailAsync(model.Email);
            if (existingUser != null)
            {
                return BadRequest(new { message = "Email is already taken." });
            }

            var pending = await _db.PendingRegistrations.FirstOrDefaultAsync(pr => pr.Email == model.Email);
            var passwordHash = _userManager.PasswordHasher.HashPassword(new ApplicationUser(), model.Password);
            var otpSecret = Base32Encoding.ToString(KeyGeneration.GenerateRandomKey(20));

            if (pending != null)
            {
                if (pending.ExpiresAt > DateTime.UtcNow)
                {
                    pending.FullName = model.FullName;
                    pending.PasswordHash = passwordHash;
                    pending.OtpSecret = otpSecret;
                    pending.CreatedAt = DateTime.UtcNow;
                    pending.ExpiresAt = DateTime.UtcNow.AddMinutes(15);
                    _db.PendingRegistrations.Update(pending);
                    await _db.SaveChangesAsync();
                }
                else
                {
                    _db.PendingRegistrations.Remove(pending);
                    pending = null;
                    await _db.SaveChangesAsync();
                }
            }

            if (pending == null)
            {
                pending = new PendingRegistration
                {
                    Email = model.Email,
                    FullName = model.FullName,
                    PasswordHash = passwordHash,
                    OtpSecret = otpSecret,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(15)
                };
                _db.PendingRegistrations.Add(pending);
                await _db.SaveChangesAsync();
            }

            var totp = new Totp(Base32Encoding.ToBytes(otpSecret));
            var otp = totp.ComputeTotp();
            _logger.LogInformation("Generated OTP for {Email}", model.Email);

            try
            {
                await _emailService.SendOtpEmailAsync(model.Email, otp);
                _logger.LogInformation("OTP email sent successfully to {Email}", model.Email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send registration OTP to {Email}.", model.Email);
                return StatusCode(500, new { message = "Failed to send verification code. Please try again later." });
            }

            return Ok(new { message = "A verification code has been sent to your email. Please verify before logging in." });
        }

        [HttpPost("VerifyRegistration")]
        public async Task<IActionResult> VerifyRegistration([FromForm] string email, [FromForm] string code)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(code))
            {
                return BadRequest(new { message = "Email and verification code are required." });
            }

            var pending = await _db.PendingRegistrations.FirstOrDefaultAsync(pr => pr.Email == email);
            if (pending == null)
            {
                return BadRequest(new { message = "No pending registration found. Please register again." });
            }

            if (pending.ExpiresAt < DateTime.UtcNow)
            {
                _db.PendingRegistrations.Remove(pending);
                await _db.SaveChangesAsync();
                return BadRequest(new { message = "Verification code has expired. Please register again." });
            }

            var totp = new Totp(Base32Encoding.ToBytes(pending.OtpSecret));
            var cleanedCode = code.Trim().Replace(" ", "").Replace("-", "");
            var currentCode = totp.ComputeTotp();
            _logger.LogInformation("Verifying OTP for {Email}. Received: {Received}", email, cleanedCode);
            
            if (!totp.VerifyTotp(cleanedCode, out _, new VerificationWindow(20, 1)))
            {
                return BadRequest(new { message = "Invalid or expired verification code." });
            }

            var existingUser = await _userManager.FindByEmailAsync(email);
            if (existingUser != null)
            {
                _db.PendingRegistrations.Remove(pending);
                await _db.SaveChangesAsync();
                return BadRequest(new { message = "Email is already taken." });
            }

            var user = new ApplicationUser
            {
                Email = pending.Email,
                UserName = pending.Email,
                FullName = pending.FullName,
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow
            };
            user.PasswordHash = pending.PasswordHash;

            var creationResult = await _userManager.CreateAsync(user);
            if (!creationResult.Succeeded)
            {
                var errors = creationResult.Errors.Select(e => e.Description ?? string.Empty)
                    .Where(m => !string.IsNullOrWhiteSpace(m))
                    .Distinct()
                    .ToList();

                _logger.LogWarning("Failed to finalize registration for {Email}: {Errors}", email, string.Join("; ", errors));
                return BadRequest(new { errors });
            }

            if (!await _roleManager.RoleExistsAsync(SelfServiceRole))
            {
                await _roleManager.CreateAsync(new IdentityRole(SelfServiceRole));
            }
            await _userManager.AddToRoleAsync(user, SelfServiceRole);

            _db.PendingRegistrations.Remove(pending);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Registration completed successfully. You can now log in." });
        }

        [HttpPost("ResendRegistrationOtp")]
        public async Task<IActionResult> ResendRegistrationOtp([FromForm] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { message = "Email is required." });
            }

            var pending = await _db.PendingRegistrations.FirstOrDefaultAsync(pr => pr.Email == email);
            if (pending == null || pending.ExpiresAt < DateTime.UtcNow)
            {
                if (pending != null)
                {
                    _db.PendingRegistrations.Remove(pending);
                    await _db.SaveChangesAsync();
                }

                return BadRequest(new { message = "No pending registration found. Please register again." });
            }

            pending.OtpSecret = Base32Encoding.ToString(KeyGeneration.GenerateRandomKey(20));
            pending.CreatedAt = DateTime.UtcNow;
            pending.ExpiresAt = DateTime.UtcNow.AddMinutes(15);
            _db.PendingRegistrations.Update(pending);
            await _db.SaveChangesAsync();

            var totp = new Totp(Base32Encoding.ToBytes(pending.OtpSecret));
            var otp = totp.ComputeTotp();

            try
            {
                await _emailService.SendOtpEmailAsync(pending.Email, otp);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to resend registration OTP to {Email}.", pending.Email);
                return StatusCode(500, new { message = "Failed to resend verification code. Please try again later." });
            }

            return Ok(new { message = "A new verification code has been sent to your email." });
        }

        [HttpPost("Login")]

        public async Task<IActionResult> Login([FromForm] LoginDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                _logger.LogWarning("Login failed — unknown email {Email} from IP {IP}.",
                    model.Email, HttpContext.Connection.RemoteIpAddress);
                return Unauthorized(new { message = "Invalid email or password" });
            }

            if (await _userManager.IsLockedOutAsync(user))
            {
                _logger.LogWarning("Login attempt on locked account {Email} from IP {IP}.",
                    model.Email, HttpContext.Connection.RemoteIpAddress);
                return Unauthorized(new { message = "This email is suspended. Please contact support or our email." });
            }

            bool isPasswordValid = await _userManager.CheckPasswordAsync(user, model.Password);
            if (!isPasswordValid)
            {
                await _userManager.AccessFailedAsync(user);
                _logger.LogWarning("Invalid password for {Email} from IP {IP}. Failed attempts: {Attempts}.",
                    model.Email, HttpContext.Connection.RemoteIpAddress,
                    await _userManager.GetAccessFailedCountAsync(user));
                return Unauthorized(new { message = "Invalid email or password" });
            }

            await _userManager.ResetAccessFailedCountAsync(user);

            // Skip 2FA for specific admin account if requested
            if (user.Email?.ToLower() == "admin@gmail.com" || !user.TwoFactorEnabled)
            {
                if (user.Email?.ToLower() == "admin@gmail.com")
                {
                    _logger.LogInformation("Admin login detected, skipping 2FA.");
                }
                else
                {
                    _logger.LogInformation("User {Email} logging in with 2FA disabled.", model.Email);
                }

                var roles = await _userManager.GetRolesAsync(user);
                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.NameIdentifier, user.Id),
                    new Claim(ClaimTypes.Name, user.FullName ?? user.Email ?? string.Empty)
                };
                foreach (var role in roles) claims.Add(new Claim(ClaimTypes.Role, role));

                var keyStr = _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyStr));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

                user.LastLogin = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);

                var token = new JwtSecurityToken(
                  issuer: _config["Jwt:Issuer"],
                  audience: _config["Jwt:Audience"],
                  claims: claims,
                  expires: DateTime.UtcNow.AddMinutes(15),
                  signingCredentials: creds
                );

                return Ok(new
                {
                    token = new JwtSecurityTokenHandler().WriteToken(token),
                    expires = token.ValidTo,
                    user = new { user.FullName, user.Email, user.PhoneNumber, user.Address, Roles = roles, user.CreatedAt, user.LastLogin, user.TwoFactorEnabled }
                });
            }

            _logger.LogInformation("User {Email} initiating login, 2FA required.", model.Email);

            // 1. Ensure user has a TOTP secret
            if (string.IsNullOrEmpty(user.TotpSecret))
            {
                var key = KeyGeneration.GenerateRandomKey(20);
                user.TotpSecret = Base32Encoding.ToString(key);
                await _userManager.UpdateAsync(user);
            }

            // 2. Generate OTP using Otp.NET
            var totp = new Totp(Base32Encoding.ToBytes(user.TotpSecret));
            var otp = totp.ComputeTotp();

            // 3. Send Email
            try
            {
                await _emailService.SendOtpEmailAsync(user.Email, otp);
                return Ok(new { 
                    requires2FA = true, 
                    email = user.Email,
                    message = "Please enter the OTP sent to your email to complete login." 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send 2FA email during login for {Email}", user.Email);
                return StatusCode(500, "Error sending verification code. Please try again.");
            }
        }

        [HttpGet("GoogleConfig")]
        public IActionResult GetGoogleConfig()
        {
            var clientId = _config["GoogleAuth:ClientId"]?.Trim() ?? string.Empty;
            return Ok(new
            {
                enabled = !string.IsNullOrWhiteSpace(clientId),
                clientId
            });
        }

        [HttpPost("Google")]
        public async Task<IActionResult> GoogleAuth([FromBody] GoogleAuthDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var clientId = _config["GoogleAuth:ClientId"]?.Trim();
            if (string.IsNullOrWhiteSpace(clientId))
            {
                _logger.LogWarning("Google authentication was requested but GoogleAuth:ClientId is not configured.");
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Google Sign-In is not configured yet."
                });
            }

            TokenValidationResult validationResult;
            try
            {
                var openIdConfiguration = await GoogleOpenIdConfiguration.GetConfigurationAsync(
                    HttpContext.RequestAborted);
                var tokenHandler = new JsonWebTokenHandler();
                validationResult = await tokenHandler.ValidateTokenAsync(
                    model.Credential,
                    new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKeys = openIdConfiguration.SigningKeys,
                        ValidateIssuer = true,
                        ValidIssuer = openIdConfiguration.Issuer,
                        ValidateAudience = true,
                        ValidAudience = clientId,
                        ValidateLifetime = true,
                        RequireExpirationTime = true,
                        RequireSignedTokens = true,
                        ClockSkew = TimeSpan.FromMinutes(1)
                    });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unable to retrieve Google OpenID configuration.");
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Google Sign-In is temporarily unavailable. Please try again."
                });
            }

            if (!validationResult.IsValid || validationResult.ClaimsIdentity == null)
            {
                _logger.LogWarning(
                    validationResult.Exception,
                    "Rejected an invalid Google ID token from IP {IP}.",
                    HttpContext.Connection.RemoteIpAddress);
                return Unauthorized(new { message = "Google authentication failed. Please try again." });
            }

            var identity = validationResult.ClaimsIdentity;
            var subject = identity.FindFirst("sub")?.Value;
            var email = identity.FindFirst("email")?.Value;
            var fullName = identity.FindFirst("name")?.Value;
            var emailVerifiedValue = identity.FindFirst("email_verified")?.Value;
            var emailVerified = bool.TryParse(emailVerifiedValue, out var verified) && verified;

            if (string.IsNullOrWhiteSpace(subject) ||
                string.IsNullOrWhiteSpace(email) ||
                !emailVerified)
            {
                return Unauthorized(new { message = "Google did not provide a verified email address." });
            }

            var user = await _userManager.FindByLoginAsync("Google", subject)
                       ?? await _userManager.FindByEmailAsync(email);
            var isNewUser = user == null;

            if (isNewUser)
            {
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    FullName = string.IsNullOrWhiteSpace(fullName) ? email.Split('@')[0] : fullName,
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow
                };

                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    var errors = createResult.Errors
                        .Select(error => error.Description)
                        .Where(message => !string.IsNullOrWhiteSpace(message))
                        .Distinct()
                        .ToArray();
                    _logger.LogWarning(
                        "Google user creation failed for {Email}: {Errors}",
                        email,
                        string.Join("; ", errors));
                    return BadRequest(new { errors });
                }

                if (!await _roleManager.RoleExistsAsync(SelfServiceRole))
                    await _roleManager.CreateAsync(new IdentityRole(SelfServiceRole));

                var roleResult = await _userManager.AddToRoleAsync(user, SelfServiceRole);
                if (!roleResult.Succeeded)
                {
                    _logger.LogError("Unable to add Google user {UserId} to the Customer role.", user.Id);
                    return StatusCode(500, new { message = "Unable to finish creating the Google account." });
                }

                var pending = await _db.PendingRegistrations.FirstOrDefaultAsync(
                    registration => registration.Email == email);
                if (pending != null)
                {
                    _db.PendingRegistrations.Remove(pending);
                    await _db.SaveChangesAsync();
                }
            }

            if (await _userManager.IsLockedOutAsync(user!))
            {
                return Unauthorized(new
                {
                    message = "This email is suspended. Please contact support."
                });
            }

            var existingLogins = await _userManager.GetLoginsAsync(user!);
            if (!existingLogins.Any(login =>
                    login.LoginProvider == "Google" && login.ProviderKey == subject))
            {
                var loginResult = await _userManager.AddLoginAsync(
                    user!,
                    new UserLoginInfo("Google", subject, "Google"));
                if (!loginResult.Succeeded)
                {
                    _logger.LogWarning(
                        "Unable to link Google login to user {UserId}: {Errors}",
                        user!.Id,
                        string.Join("; ", loginResult.Errors.Select(error => error.Description)));
                    return BadRequest(new { message = "Unable to link this Google account." });
                }
            }

            user!.EmailConfirmed = true;
            user.LastLogin = DateTime.UtcNow;
            if (string.IsNullOrWhiteSpace(user.FullName) && !string.IsNullOrWhiteSpace(fullName))
                user.FullName = fullName;

            await _userManager.UpdateAsync(user);
            _logger.LogInformation(
                "Google authentication succeeded for user {UserId}. New user: {IsNewUser}",
                user.Id,
                isNewUser);

            return Ok(await CreateAuthResponseAsync(user));
        }

        [HttpPost("Verify2FA")]
        public async Task<IActionResult> Verify2FA([FromForm] string email, [FromForm] string code)
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null || string.IsNullOrEmpty(user.TotpSecret))
                return Unauthorized("Invalid session.");

            var totp = new Totp(Base32Encoding.ToBytes(user.TotpSecret));
            // Extend validity to 10 minutes (20 steps of 30s)
            bool isValid = totp.VerifyTotp(code.Trim(), out long step, new VerificationWindow(previous: 20, future: 1));

            if (!isValid)
            {
                _logger.LogWarning("Invalid 2FA attempt for {Email}. Secret exists: {HasSecret}", email, !string.IsNullOrEmpty(user.TotpSecret));
                return BadRequest("Invalid or expired verification code.");
            }

            user.LastLogin = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            // If valid, generate JWT
            var roles = await _userManager.GetRolesAsync(user);
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.FullName ?? user.Email ?? string.Empty)
            };

            foreach (var role in roles)
                claims.Add(new Claim(ClaimTypes.Role, role));

            var jwtKey = _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
              issuer: _config["Jwt:Issuer"],
              audience: _config["Jwt:Audience"],
              claims: claims,
              expires: DateTime.UtcNow.AddMinutes(15),
              signingCredentials: creds
            );

            return Ok(new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                expires = token.ValidTo,
                user = new { user.FullName, user.Email, user.PhoneNumber, user.Address, Roles = roles, user.CreatedAt, user.LastLogin, user.TwoFactorEnabled }
            });
        }


        [HttpGet("CurrentUser")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Invalid user token." });

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return Unauthorized(new { message = "User not found." });

            var roles = await _userManager.GetRolesAsync(user);
            return Ok(new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.PhoneNumber,
                user.Address,
                user.CreatedAt,
                user.LastLogin,
                user.DateOfBirth,
                user.TwoFactorEnabled,
                Roles = roles
            });
        }

        [HttpPost("ToggleTwoFactor")]
        [Authorize]
        public async Task<IActionResult> ToggleTwoFactor([FromForm] bool enabled)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (enabled && string.IsNullOrEmpty(user.TotpSecret))
            {
                var key = KeyGeneration.GenerateRandomKey(20);
                user.TotpSecret = Base32Encoding.ToString(key);
            }

            user.TwoFactorEnabled = enabled;
            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded) return BadRequest(result.Errors);

            return Ok(new { message = "Two-factor authentication setting updated.", user.TwoFactorEnabled });
        }

        [HttpPost("UpdateProfile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromForm] UpdateProfileDto model)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            user.FullName = model.FullName;
            user.PhoneNumber = model.PhoneNumber;
            user.Address = model.Address;
            if (model.DateOfBirth.HasValue)
            {
                user.DateOfBirth = model.DateOfBirth.Value;
            }

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded) return BadRequest(result.Errors);

            return Ok(new { message = "Profile updated successfully.", user = new { user.FullName, user.Email, user.PhoneNumber, user.Address, user.DateOfBirth } });
        }

        [HttpPost("Resend2FA")]
        public async Task<IActionResult> Resend2FA([FromForm] string email)
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null) return BadRequest("Invalid request.");

            if (string.IsNullOrEmpty(user.TotpSecret))
            {
                var key = KeyGeneration.GenerateRandomKey(20);
                user.TotpSecret = Base32Encoding.ToString(key);
                await _userManager.UpdateAsync(user);
            }

            var totp = new Totp(Base32Encoding.ToBytes(user.TotpSecret));
            var otp = totp.ComputeTotp();

            try
            {
                await _emailService.SendOtpEmailAsync(user.Email, otp);
                return Ok(new { message = "A new verification code has been sent to your email." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to resend 2FA email for {Email}", email);
                return StatusCode(500, "Error sending verification code.");
            }
        }

        [HttpPost("SendOTP")]
        public async Task<IActionResult> SendOTP([FromForm] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { message = "Email is required." });

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                // To prevent email enumeration, return Ok even if user not found.
                return Ok(new { message = "If the email is registered, an OTP has been sent." });
            }

            // Generate secure OTP using ASP.NET Core Identity
            var otp = await _userManager.GenerateTwoFactorTokenAsync(user, "Email");

            try
            {
                await _emailService.SendOtpEmailAsync(user.Email, otp);
                _logger.LogInformation("OTP email sent successfully to {Email}", user.Email);
                return Ok(new { message = "If the email is registered, an OTP has been sent." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send OTP email to {Email}", user.Email);
                return StatusCode(500, new { message = "Failed to send the OTP email. Please try again later." });
            }
        }



        //private string GetUserId()
        //{
        //    return ;
        //}
        [HttpPost("RequestPasswordChange")]
        [Authorize]
        public async Task<IActionResult> RequestPasswordChange()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            // Clear any existing password change requests for this user
            var existing = _db.PendingEmailChanges.Where(p => p.UserId == user.Id && p.Type == "PASSWORD_CHANGE");
            _db.PendingEmailChanges.RemoveRange(existing);

            var otp = Random.Shared.Next(100000, 999999).ToString();
            
            var pending = new PendingEmailChange
            {
                UserId = user.Id,
                Otp = otp,
                Type = "PASSWORD_CHANGE",
                ExpiresAt = DateTime.UtcNow.AddMinutes(15)
            };

            _db.PendingEmailChanges.Add(pending);
            await _db.SaveChangesAsync();

            try
            {
                await _emailService.SendOtpEmailAsync(user.Email!, otp);
                return Ok(new { message = "Verification code sent to your email." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password change OTP to {Email}", user.Email);
                return StatusCode(500, new { message = "Failed to send verification email. Please check your SMTP settings." });
            }
        }

        [HttpPost("ConfirmPasswordChange")]
        [Authorize]
        public async Task<IActionResult> ConfirmPasswordChange([FromForm] string code, [FromForm] string newPassword)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var pending = await _db.PendingEmailChanges
                .FirstOrDefaultAsync(p => p.UserId == user.Id && p.Type == "PASSWORD_CHANGE");

            if (pending == null || pending.ExpiresAt < DateTime.UtcNow)
                return BadRequest(new { message = "Verification code expired or not found." });

            if (pending.Otp != code.Trim())
                return BadRequest(new { message = "Invalid verification code." });

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, token, newPassword);

            if (!result.Succeeded)
                return BadRequest(new { message = string.Join(" ", result.Errors.Select(e => e.Description)) });

            _db.PendingEmailChanges.Remove(pending);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Password changed successfully." });
        }

        [HttpPost("ForgotPassword")]
        public async Task<IActionResult> ForgotPassword([FromForm] ForgotPasswordDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!await _recaptchaService.ValidateTokenAsync(model.RecaptchaToken, "forgot_password", 0.4m))
            {
                return BadRequest(new { message = "reCAPTCHA validation failed. Please refresh the page and try again." });
            }

            if (string.IsNullOrWhiteSpace(model.Email))
                return BadRequest(new { message = "Email is required." });

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                // Don't reveal if email exists or not for security
                return Ok(new { message = "If the email is registered, a password reset link has been sent." });
            }

            // Generate the standard ASP.NET Identity token
            var identityToken = await _userManager.GeneratePasswordResetTokenAsync(user);

            // Create expiration timestamp (15 minutes from now)
            var expirationTime = DateTimeOffset.UtcNow.AddMinutes(15).ToUnixTimeSeconds();

            // Combine expiration and token with a delimiter
            var customToken = $"{expirationTime}|{identityToken}";

            var resetLink = $"http://localhost:3000/reset-password?email={Uri.EscapeDataString(model.Email)}&token={Uri.EscapeDataString(customToken)}";

            try
            {
                await _emailService.SendPasswordResetEmailAsync(user.Email, resetLink);
                _logger.LogInformation("Password reset email sent to {Email}", user.Email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email to {Email}", user.Email);
                return StatusCode(500, new { message = "Failed to send password reset email. Please try again later." });
            }

            return Ok(new { message = "If the email is registered, a password reset link has been sent." });
        }

        [HttpPost("ResetPassword")]
        public async Task<IActionResult> ResetPassword([FromForm] string email, [FromForm] string token, [FromForm] string newPassword)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(newPassword))
                return BadRequest(new { message = "Email, token, and new password are required." });

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                // Don't reveal if email exists or not for security
                return BadRequest(new { message = "Invalid password reset request." });
            }

            // Parse the custom token (format: "expiration_timestamp|identity_token")
            var tokenParts = token.Split('|', 2);
            if (tokenParts.Length != 2)
            {
                return BadRequest(new { message = "Invalid password reset token format." });
            }

            if (!long.TryParse(tokenParts[0], out var expirationTimestamp))
            {
                return BadRequest(new { message = "Invalid password reset token." });
            }

            // Check if token has expired (15 minutes)
            var expirationTime = DateTimeOffset.FromUnixTimeSeconds(expirationTimestamp);
            if (DateTimeOffset.UtcNow > expirationTime)
            {
                return BadRequest(new { message = "Password reset link has expired. Please request a new one." });
            }

            var identityToken = tokenParts[1];
            var result = await _userManager.ResetPasswordAsync(user, identityToken, newPassword);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description).ToList();
                _logger.LogWarning("Password reset failed for {Email}: {Errors}", email, string.Join("; ", errors));
                return BadRequest(new { message = "Invalid or expired password reset token." });
            }

            _logger.LogInformation("Password reset successful for {Email}", email);
            return Ok(new { message = "Password has been reset successfully. You can now log in with your new password." });
        }

        private async Task<object> CreateAuthResponseAsync(ApplicationUser user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var claims = new List<Claim>
            {
                new(ClaimTypes.Email, user.Email ?? string.Empty),
                new(ClaimTypes.NameIdentifier, user.Id),
                new(ClaimTypes.Name, user.FullName ?? user.Email ?? string.Empty)
            };
            foreach (var role in roles)
                claims.Add(new Claim(ClaimTypes.Role, role));

            var keyValue = _config["Jwt:Key"]
                           ?? throw new InvalidOperationException("Jwt:Key is not configured.");
            var credentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyValue)),
                SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(15),
                signingCredentials: credentials);

            return new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                expires = token.ValidTo,
                user = new
                {
                    user.Id,
                    user.FullName,
                    user.Email,
                    user.PhoneNumber,
                    user.Address,
                    Roles = roles,
                    user.CreatedAt,
                    user.LastLogin,
                    user.TwoFactorEnabled
                }
            };
        }
    }
}
