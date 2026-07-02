using Microsoft.EntityFrameworkCore;

namespace BackEnd.Models
{
    [Index(nameof(UserId))]
    [Index(nameof(OrderDate))]
    public class Order : BaseEntity
    {
        public DateTime OrderDate { get; set; }=DateTime.UtcNow;
        public string  UserId { get; set; }
        public ApplicationUser User { get; set; }
        public ICollection<OrderItem> Items { get; set; }
        
        // Missing navigation property
        public Payment? Payment { get; set; }

        public decimal TotalAmount { get; set; }
        public  OrderStatus Status { get; set; }=OrderStatus.Pending;
        public string PaymentMethod { get; set; }
        
        public string? PromoCode { get; set; }
        public decimal DiscountAmount { get; set; } = 0;
    }

    
}
