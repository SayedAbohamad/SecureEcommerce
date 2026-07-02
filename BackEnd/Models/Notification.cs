using System.ComponentModel.DataAnnotations;

namespace BackEnd.Models
{
    public class Notification : BaseEntity
    {
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser? User { get; set; }

        [Required, MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        [Required, MaxLength(1000)]
        public string Message { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Type { get; set; } = string.Empty; // "Support", "Offer", "Order", "System"

        public bool IsRead { get; set; } = false;

        public string? Link { get; set; } // Optional frontend route link
    }
}
