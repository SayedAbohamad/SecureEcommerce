using System;
using System.Threading;
using System.Threading.Tasks;
using BackEnd.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace BackEnd.Services
{
    public sealed class FailedLoginTrackingService : IFailedLoginTrackingService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<FailedLoginTrackingService> _logger;

        public FailedLoginTrackingService(ApplicationDbContext context, ILogger<FailedLoginTrackingService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task RecordFailedLoginAsync(HttpContext context, string? email, string reason, CancellationToken cancellationToken)
        {
            try
            {
                var attempt = new FailedLoginAttempt
                {
                    Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim(),
                    IpAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    UserAgent = context.Request.Headers.UserAgent.ToString(),
                    Reason = reason,
                    AttemptedAt = DateTime.UtcNow
                };

                _context.FailedLoginAttempts.Add(attempt);
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                // Auth flow must never fail because audit logging failed.
                _logger.LogError(ex, "Failed to record failed login attempt.");
            }
        }
    }
}
