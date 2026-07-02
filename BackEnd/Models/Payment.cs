namespace BackEnd.Models
{
    public class Payment : BaseEntity
    {
        // الربط بالطلب
        public Guid OrderId { get; set; }
        public Order Order { get; set; }

        public PaymentMethod Method { get; set; }
        public decimal Amount { get; set; }

        // لتتبع حالة الدفع (تم – مرفوض – معلق)
        public string Status { get; set; } = "Pending";

        // وقت الدفع
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    }

}
