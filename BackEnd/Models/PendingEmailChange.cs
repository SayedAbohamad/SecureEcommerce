using System;

namespace BackEnd.Models
{
    public class PendingEmailChange
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string? NewEmail { get; set; }
        public string? Otp { get; set; }
        public string? Type { get; set; } // VERIFY_OLD_EMAIL, VERIFY_NEW_EMAIL
        public string? Token { get; set; } // changeEmailToken
        public int FailedAttempts { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(15);
    }
}
