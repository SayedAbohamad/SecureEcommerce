using System;
using System.Collections.Generic;

namespace BackEnd.DTO.Security
{
    /// <summary>Status color used for traffic-light UI rendering.</summary>
    public enum HealthStatus
    {
        Good,
        Warning,
        Critical,
        Info
    }

    public class SecurityCheckDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public HealthStatus Status { get; set; } = HealthStatus.Info;
        public string Value { get; set; } = string.Empty;
        public string Explanation { get; set; } = string.Empty;
    }

    public class SecurityHealthDto
    {
        public int Score { get; set; }
        public HealthStatus ScoreStatus { get; set; }
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        public SecurityCheckDto PasswordPolicy { get; set; } = new();
        public SecurityCheckDto ActiveSessions { get; set; } = new();
        public SecurityCheckDto FailedLogins { get; set; } = new();
        public SecurityCheckDto LastAttackDetected { get; set; } = new();
        public SecurityCheckDto BlockedIps { get; set; } = new();
        public SecurityCheckDto SecurityHeaders { get; set; } = new();
        public SecurityCheckDto SslTls { get; set; } = new();
        public SecurityCheckDto ContentSecurityPolicy { get; set; } = new();

        public List<SecurityCheckDto> HeaderDetails { get; set; } = new();
    }

    public class BlockedIpDto
    {
        public Guid Id { get; set; }
        public string IpAddress { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public string? BlockedBy { get; set; }
        public DateTime BlockedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public bool IsActive { get; set; }
    }

    public class AddBlockedIpDto
    {
        public string IpAddress { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}
