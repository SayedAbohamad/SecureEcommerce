using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTO
{
    public class CheckOutDto
    {
        [Required(ErrorMessage = "PaymentMethod is required.")]
        [StringLength(50)]
        [RegularExpression(@"^(CashOnDelivery|Stripe|Card|CreditCard)$",
            ErrorMessage = "Invalid payment method. Allowed values: CashOnDelivery, Stripe, Card, CreditCard.")]
        public string PaymentMethod { get; set; } = string.Empty;

        [StringLength(50)]
        public string? PromoCode { get; set; }

        public string? RecaptchaToken { get; set; }
    }
}
