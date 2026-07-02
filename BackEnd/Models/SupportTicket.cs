using System.ComponentModel.DataAnnotations;

namespace BackEnd.Models
{
    public class SupportTicket
    {
        public Guid Id { get; set; } = Guid.NewGuid();

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

        public TicketStatus Status { get; set; } = TicketStatus.Open;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Admin reply
        [MaxLength(4000)]
        public string? AdminReply { get; set; }

        public DateTime? RepliedAt { get; set; }

        public string? RepliedBy { get; set; }

        // Optional: link to logged-in user
        public string? UserId { get; set; }
    }

    public enum TicketStatus
    {
        Open,
        Replied,
        Closed
    }
}
