using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackEnd.Models
{
    [Table("product_reviews")]
    public class Review : BaseEntity
    {
        [Required]
        public Guid ProductId { get; set; }
        public Product Product { get; set; }

        [Required]
        public string UserId { get; set; }
        public ApplicationUser User { get; set; }

        [Range(1, 5)]
        public int Rating { get; set; }

        [Required]
        [MaxLength(2000)]
        public string Comment { get; set; }

        public bool IsVerifiedPurchase { get; set; } = false;
    }
}
