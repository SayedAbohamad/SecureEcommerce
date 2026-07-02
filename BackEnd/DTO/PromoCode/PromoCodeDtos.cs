using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTO.PromoCode
{
    public class CreatePromoCodeDto
    {
        [Required(ErrorMessage = "Promo code is required.")]
        [MaxLength(50, ErrorMessage = "Code must be 50 characters or fewer.")]
        public string Code { get; set; } = string.Empty;

        [Required(ErrorMessage = "Description is required.")]
        [MaxLength(200, ErrorMessage = "Description must be 200 characters or fewer.")]
        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Discount type is required.")]
        public string DiscountType { get; set; } = "Percentage";

        [Required(ErrorMessage = "Discount value is required.")]
        [Range(0, double.MaxValue, ErrorMessage = "Discount value must be non-negative.")]
        public decimal DiscountValue { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? MinimumOrderAmount { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? MaxDiscountAmount { get; set; }

        [Range(1, int.MaxValue)]
        public int? MaxUsageCount { get; set; }

        [Range(1, int.MaxValue)]
        public int? MaxUsagePerUser { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? ExpirationDate { get; set; }

        public Guid? ApplicableCategoryId { get; set; }
        public Guid? ApplicableProductId { get; set; }

        public int? BuyQuantity { get; set; }
        public int? GetQuantity { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class UpdatePromoCodeDto
    {
        [Required(ErrorMessage = "Promo code is required.")]
        [MaxLength(50, ErrorMessage = "Code must be 50 characters or fewer.")]
        public string Code { get; set; } = string.Empty;

        [Required(ErrorMessage = "Description is required.")]
        [MaxLength(200, ErrorMessage = "Description must be 200 characters or fewer.")]
        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Discount type is required.")]
        public string DiscountType { get; set; } = "Percentage";

        [Required(ErrorMessage = "Discount value is required.")]
        [Range(0, double.MaxValue, ErrorMessage = "Discount value must be non-negative.")]
        public decimal DiscountValue { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? MinimumOrderAmount { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? MaxDiscountAmount { get; set; }

        [Range(1, int.MaxValue)]
        public int? MaxUsageCount { get; set; }

        [Range(1, int.MaxValue)]
        public int? MaxUsagePerUser { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? ExpirationDate { get; set; }

        public Guid? ApplicableCategoryId { get; set; }
        public Guid? ApplicableProductId { get; set; }

        public int? BuyQuantity { get; set; }
        public int? GetQuantity { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class GetPromoCodeDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string DiscountType { get; set; } = string.Empty;
        public decimal DiscountValue { get; set; }
        public decimal? MinimumOrderAmount { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public int? MaxUsageCount { get; set; }
        public int CurrentUsageCount { get; set; }
        public int? MaxUsagePerUser { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public Guid? ApplicableCategoryId { get; set; }
        public Guid? ApplicableProductId { get; set; }
        public int? BuyQuantity { get; set; }
        public int? GetQuantity { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }

        // Computed properties
        public string Status
        {
            get
            {
                if (!IsActive) return "Inactive";
                if (ExpirationDate.HasValue && ExpirationDate.Value < DateTime.Now) return "Expired";
                if (StartDate.HasValue && StartDate.Value > DateTime.Now) return "Scheduled";
                if (MaxUsageCount.HasValue && CurrentUsageCount >= MaxUsageCount.Value) return "Exhausted";
                return "Active";
            }
        }
    }
}
