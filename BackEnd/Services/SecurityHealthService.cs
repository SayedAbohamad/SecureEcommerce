using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BackEnd.DTO.Security;
using BackEnd.Helper;
using BackEnd.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace BackEnd.Services
{
    public sealed class SecurityHealthService : ISecurityHealthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IOptions<IdentityOptions> _identityOptions;
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;

        public SecurityHealthService(
            ApplicationDbContext context,
            IOptions<IdentityOptions> identityOptions,
            IWebHostEnvironment environment,
            IConfiguration configuration)
        {
            _context = context;
            _identityOptions = identityOptions;
            _environment = environment;
            _configuration = configuration;
        }

        public async Task<SecurityHealthDto> GetHealthAsync(HttpContext httpContext, CancellationToken cancellationToken)
        {
            var score = 100;
            var dto = new SecurityHealthDto();

            // --- Password policy -------------------------------------------------
            var pw = _identityOptions.Value.Password;
            var rules = new (bool met, string label)[]
            {
                (pw.RequiredLength >= 8, $"minimum length {pw.RequiredLength}"),
                (pw.RequireDigit, "requires a digit"),
                (pw.RequireUppercase, "requires an uppercase letter"),
                (pw.RequireLowercase, "requires a lowercase letter"),
                (pw.RequireNonAlphanumeric, "requires a special character"),
            };
            var metCount = rules.Count(r => r.met);
            var missing = rules.Where(r => !r.met).Select(r => r.label).ToList();
            dto.PasswordPolicy = new SecurityCheckDto
            {
                Key = "passwordPolicy",
                Label = "Password strength policy",
                Status = metCount == rules.Length ? HealthStatus.Good : metCount >= 3 ? HealthStatus.Warning : HealthStatus.Critical,
                Value = metCount == rules.Length ? "Strong policy enforced" : $"{metCount}/{rules.Length} rules enforced",
                Explanation = metCount == rules.Length
                    ? "Password policy requires length, case mixing, digits, and symbols."
                    : $"Missing: {string.Join(", ", missing)}."
            };
            score -= (rules.Length - metCount) * 4;

            // --- Active sessions (estimated) --------------------------------------
            var recentLoginWindow = DateTime.UtcNow.AddMinutes(-15);
            var activeSessionsEstimate = await _context.Users
                .AsNoTracking()
                .CountAsync(u => u.LastLogin != null && u.LastLogin >= recentLoginWindow, cancellationToken);
            dto.ActiveSessions = new SecurityCheckDto
            {
                Key = "activeSessions",
                Label = "Active sessions",
                Status = HealthStatus.Info,
                Value = activeSessionsEstimate.ToString(),
                Explanation = "Estimated from users with a login within the last 15 minutes (JWT lifetime). " +
                              "This app is stateless (JWT), so it does not track a live session store; " +
                              "this metric is structured for future expansion (e.g. refresh-token/session table)."
            };

            // --- Failed logins -----------------------------------------------------
            var since24h = DateTime.UtcNow.AddHours(-24);
            var failedLogins24h = await _context.FailedLoginAttempts
                .AsNoTracking()
                .CountAsync(f => f.AttemptedAt >= since24h, cancellationToken);
            var failedStatus = failedLogins24h >= 50 ? HealthStatus.Critical
                : failedLogins24h >= 10 ? HealthStatus.Warning
                : HealthStatus.Good;
            dto.FailedLogins = new SecurityCheckDto
            {
                Key = "failedLogins",
                Label = "Failed logins (24h)",
                Status = failedStatus,
                Value = failedLogins24h.ToString(),
                Explanation = "Count of failed password/2FA/lockout events in the last 24 hours."
            };
            score -= failedStatus switch { HealthStatus.Critical => 20, HealthStatus.Warning => 10, _ => 0 };

            // --- Last attack detected (honeypot + failed logins) --------------------
            var lastHoneypotHit = await _context.HoneypotEvents
                .AsNoTracking()
                .OrderByDescending(e => e.CreatedAt)
                .Select(e => (DateTime?)e.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
            var lastFailedLogin = await _context.FailedLoginAttempts
                .AsNoTracking()
                .OrderByDescending(e => e.AttemptedAt)
                .Select(e => (DateTime?)e.AttemptedAt)
                .FirstOrDefaultAsync(cancellationToken);
            DateTime? lastAttack = new[] { lastHoneypotHit, lastFailedLogin }
                .Where(d => d.HasValue)
                .OrderByDescending(d => d)
                .FirstOrDefault();

            var recentAttack = lastAttack.HasValue && lastAttack.Value >= DateTime.UtcNow.AddHours(-1);
            dto.LastAttackDetected = new SecurityCheckDto
            {
                Key = "lastAttackDetected",
                Label = "Last attack detected",
                Status = recentAttack ? HealthStatus.Warning : HealthStatus.Good,
                Value = lastAttack.HasValue ? lastAttack.Value.ToString("u") : "No attacks detected",
                Explanation = "Derived from the most recent honeypot hit or failed login attempt."
            };
            if (recentAttack) score -= 5;

            // --- Blocked IPs --------------------------------------------------------
            var blockedIpCount = await _context.BlockedIpAddresses
                .AsNoTracking()
                .CountAsync(b => b.IsActive, cancellationToken);
            dto.BlockedIps = new SecurityCheckDto
            {
                Key = "blockedIps",
                Label = "Blocked IPs",
                Status = HealthStatus.Info,
                Value = blockedIpCount.ToString(),
                Explanation = "Admin-managed IP blocklist. Currently informational; enforcement middleware can consume this list."
            };

            // --- Security headers ----------------------------------------------------
            var headerDetails = new List<SecurityCheckDto>
            {
                new() { Key = "csp", Label = "Content-Security-Policy", Status = HealthStatus.Good, Value = "Configured", Explanation = SecurityHeaderPolicy.ContentSecurityPolicy },
                new() { Key = "xfo", Label = "X-Frame-Options", Status = HealthStatus.Good, Value = SecurityHeaderPolicy.FrameOptions, Explanation = "Blocks the app from being framed (clickjacking protection)." },
                new() { Key = "xcto", Label = "X-Content-Type-Options", Status = HealthStatus.Good, Value = SecurityHeaderPolicy.ContentTypeOptions, Explanation = "Prevents MIME-type sniffing." },
                new() { Key = "referrer", Label = "Referrer-Policy", Status = HealthStatus.Good, Value = SecurityHeaderPolicy.ReferrerPolicy, Explanation = "Limits referrer leakage across origins." },
                new() { Key = "permissions", Label = "Permissions-Policy", Status = HealthStatus.Good, Value = "Configured", Explanation = SecurityHeaderPolicy.PermissionsPolicy },
            };
            var isHttps = httpContext.Request.IsHttps;
            var hstsEnabled = !_environment.IsDevelopment();
            headerDetails.Add(new SecurityCheckDto
            {
                Key = "hsts",
                Label = "Strict-Transport-Security",
                Status = hstsEnabled ? HealthStatus.Good : HealthStatus.Info,
                Value = hstsEnabled ? "Enabled (non-development)" : "Disabled in Development",
                Explanation = "HSTS is enforced outside Development. It is intentionally skipped locally so HTTP dev workflows keep working."
            });
            dto.HeaderDetails = headerDetails;
            dto.SecurityHeaders = new SecurityCheckDto
            {
                Key = "securityHeaders",
                Label = "Security headers",
                Status = HealthStatus.Good,
                Value = $"{headerDetails.Count(h => h.Status == HealthStatus.Good)}/{headerDetails.Count} configured",
                Explanation = "OWASP-recommended response headers applied globally via middleware."
            };

            // --- SSL/TLS --------------------------------------------------------------
            dto.SslTls = new SecurityCheckDto
            {
                Key = "sslTls",
                Label = "SSL/TLS",
                Status = isHttps ? HealthStatus.Good : (_environment.IsDevelopment() ? HealthStatus.Info : HealthStatus.Critical),
                Value = isHttps ? "Active (HTTPS)" : "Not active (plain HTTP)",
                Explanation = isHttps
                    ? "This request was served over HTTPS."
                    : _environment.IsDevelopment()
                        ? "Running over local HTTP in Development. Production is configured to require HTTPS/HSTS."
                        : "Production traffic is not using HTTPS. This should be fixed immediately."
            };
            if (!isHttps && !_environment.IsDevelopment()) score -= 20;

            // --- CSP summary ------------------------------------------------------------
            dto.ContentSecurityPolicy = new SecurityCheckDto
            {
                Key = "csp",
                Label = "Content-Security-Policy",
                Status = HealthStatus.Good,
                Value = "Configured",
                Explanation = SecurityHeaderPolicy.ContentSecurityPolicy
            };

            score = Math.Clamp(score, 0, 100);
            dto.Score = score;
            dto.ScoreStatus = score >= 85 ? HealthStatus.Good : score >= 60 ? HealthStatus.Warning : HealthStatus.Critical;
            dto.GeneratedAt = DateTime.UtcNow;

            return dto;
        }

        public async Task<List<BlockedIpDto>> GetBlockedIpsAsync(CancellationToken cancellationToken)
        {
            return await _context.BlockedIpAddresses
                .AsNoTracking()
                .OrderByDescending(b => b.BlockedAt)
                .Select(b => new BlockedIpDto
                {
                    Id = b.Id,
                    IpAddress = b.IpAddress,
                    Reason = b.Reason,
                    BlockedBy = b.BlockedBy,
                    BlockedAt = b.BlockedAt,
                    ExpiresAt = b.ExpiresAt,
                    IsActive = b.IsActive
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<BlockedIpDto> AddBlockedIpAsync(AddBlockedIpDto dto, string? actor, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(dto.IpAddress))
                throw new ArgumentException("IP address is required.");

            var existing = await _context.BlockedIpAddresses
                .FirstOrDefaultAsync(b => b.IpAddress == dto.IpAddress.Trim(), cancellationToken);

            if (existing != null)
            {
                existing.IsActive = true;
                existing.Reason = dto.Reason;
                existing.ExpiresAt = dto.ExpiresAt;
                existing.BlockedBy = actor;
                existing.BlockedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
                return Map(existing);
            }

            var entity = new BlockedIpAddress
            {
                IpAddress = dto.IpAddress.Trim(),
                Reason = dto.Reason,
                ExpiresAt = dto.ExpiresAt,
                BlockedBy = actor,
                BlockedAt = DateTime.UtcNow,
                IsActive = true
            };
            _context.BlockedIpAddresses.Add(entity);
            await _context.SaveChangesAsync(cancellationToken);
            return Map(entity);
        }

        public async Task<bool> RemoveBlockedIpAsync(Guid id, CancellationToken cancellationToken)
        {
            var entity = await _context.BlockedIpAddresses.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
            if (entity == null) return false;

            entity.IsActive = false;
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        private static BlockedIpDto Map(BlockedIpAddress entity) => new()
        {
            Id = entity.Id,
            IpAddress = entity.IpAddress,
            Reason = entity.Reason,
            BlockedBy = entity.BlockedBy,
            BlockedAt = entity.BlockedAt,
            ExpiresAt = entity.ExpiresAt,
            IsActive = entity.IsActive
        };
    }
}
