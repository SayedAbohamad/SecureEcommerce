using System.ComponentModel.DataAnnotations;

namespace BackEnd.Models
{
    public enum DiscountType
    {
        Percentage,
        FixedAmount,
        FreeShipping,
        BuyXGetY
    }

    public class PromoCode : BaseEntity
    {
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string Description { get; set; } = string.Empty;

        [Required]
        public DiscountType DiscountType { get; set; } = DiscountType.Percentage;

        /// <summary>
        /// For Percentage: value 0-100.  For FixedAmount: the currency amount.
        /// For FreeShipping / BuyXGetY: typically 0 or the Y quantity.
        /// </summary>
        [Required]
        [Range(0, double.MaxValue)]
        public decimal DiscountValue { get; set; }

        /// <summary>Minimum order total to activate this promo.</summary>
        public decimal? MinimumOrderAmount { get; set; }

        /// <summary>Cap on the discount (useful for percentage discounts).</summary>
        public decimal? MaxDiscountAmount { get; set; }

        /// <summary>How many times total this code can be used. Null = unlimited.</summary>
        public int? MaxUsageCount { get; set; }

        /// <summary>How many times the code has been used so far.</summary>
        public int CurrentUsageCount { get; set; } = 0;

        /// <summary>How many times each individual user can use this code. Null = unlimited.</summary>
        public int? MaxUsagePerUser { get; set; }

        /// <summary>Start date – code is not valid before this date.</summary>
        public DateTime? StartDate { get; set; }

        /// <summary>Expiration date – code is not valid after this date.</summary>
        public DateTime? ExpirationDate { get; set; }

        /// <summary>
        /// Optional: restrict to specific category. Null = all categories.
        /// </summary>
        public Guid? ApplicableCategoryId { get; set; }

        /// <summary>
        /// Optional: restrict to specific product. Null = all products.
        /// </summary>
        public Guid? ApplicableProductId { get; set; }

        /// <summary>For BuyXGetY: the quantity required to buy.</summary>
        public int? BuyQuantity { get; set; }

        /// <summary>For BuyXGetY: the quantity given free.</summary>
        public int? GetQuantity { get; set; }
    }
}
