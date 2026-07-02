using Microsoft.EntityFrameworkCore;

namespace BackEnd.Models
{
    [Index(nameof(UserId))]
    public class Cart : BaseEntity
    {
        public string UserId { get; set; } // foreign key
        public ApplicationUser User { get; set; }//navigation
        public ICollection<CartItem> Items { get; set; }
    }

    
}
