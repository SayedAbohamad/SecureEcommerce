using Microsoft.AspNetCore.Identity;

namespace BackEnd.Models
{
    public class ApplicationUser:IdentityUser
    {
        public string FullName { get; set; }
        public string? Address { get; set; }
        public string? TotpSecret { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLogin { get; set; }

        public string? NotificationEmail { get; set; }
        public bool ReceiveOfferEmails { get; set; } = false;
        public bool ReceiveSupportEmails { get; set; } = false;

        public ICollection<Order> Orders { get; set; } = new List<Order>();
        public ICollection<UserAddress> Addresses { get; set; } = new List<UserAddress>();
        public Cart? Cart { get; set; }
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    }
}
