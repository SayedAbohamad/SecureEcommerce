using System;

namespace BackEnd.Models
{
    public class FailedLoginAttempt
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string? Email { get; set; }
        public string IpAddress { get; set; } = string.Empty;
        public string? UserAgent { get; set; }
        public string Reason { get; set; } = string.Empty;
        public DateTime AttemptedAt { get; set; } = DateTime.UtcNow;
    }
}
