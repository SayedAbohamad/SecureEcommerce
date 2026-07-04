using System;

namespace BackEnd.Models
{
    public class HoneypotEvent
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string IpAddress { get; set; } = string.Empty;
        public string? UserAgent { get; set; }
        public string Path { get; set; } = string.Empty;
        public string Method { get; set; } = string.Empty;
        public string? QueryString { get; set; }
        public string? Body { get; set; }
        public string? HeadersJson { get; set; }
        public string? Referrer { get; set; }
        public string? Country { get; set; }
        public string TrapType { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
