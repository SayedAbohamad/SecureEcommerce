using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTO.Review
{
    public class CreateReviewDto
    {
        [Range(1, 5)]
        public int Rating { get; set; }

        [Required]
        [MaxLength(2000)]
        public string Comment { get; set; } = string.Empty;

        public string? RecaptchaToken { get; set; }
    }

    public class ReviewDto
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public string UserId { get; set; }
        public string UserName { get; set; }
        public int Rating { get; set; }
        public string Comment { get; set; }
        public bool IsVerifiedPurchase { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ReviewDistributionDto
    {
        public int FiveStars { get; set; }
        public int FourStars { get; set; }
        public int ThreeStars { get; set; }
        public int TwoStars { get; set; }
        public int OneStar { get; set; }
    }

    public class ProductReviewResponseDto
    {
        public List<ReviewDto> Reviews { get; set; } = new();
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public ReviewDistributionDto Distribution { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public bool HasMore { get; set; }
        public bool HasReviewed { get; set; }
    }
}
