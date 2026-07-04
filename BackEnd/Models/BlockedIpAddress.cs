using System;

namespace BackEnd.Models
{
    public class BlockedIpAddress
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string IpAddress { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public string? BlockedBy { get; set; }
        public DateTime BlockedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ExpiresAt { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
