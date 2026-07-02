using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTO.Product
{
    public class UpdateProductDto
    {
        [Required(ErrorMessage = "Product name is required.")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Description is required.")]
        [StringLength(2000, ErrorMessage = "Description must not exceed 2000 characters.")]
        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Price is required.")]
        [Range(0.01, 1_000_000, ErrorMessage = "Price must be between 0.01 and 1,000,000.")]
        public decimal Price { get; set; }

        [Required(ErrorMessage = "Slug is required.")]
        [StringLength(250, MinimumLength = 1)]
        [RegularExpression(@"^[a-z0-9\-]+$", ErrorMessage = "Slug must only contain lowercase letters, digits, and hyphens.")]
        public string Slug { get; set; } = string.Empty;

        [Range(0, 100_000, ErrorMessage = "Stock must be between 0 and 100,000.")]
        public int Stock { get; set; }

        [Required(ErrorMessage = "CategoryId is required.")]
        public Guid CategoryId { get; set; }

        /// <summary>JSON array of sizes, e.g., ["Small","Medium","Large"]</summary>
        [StringLength(500)]
        public string? Sizes { get; set; }

        /// <summary>Optional — only required when updating the product image.</summary>
        public IFormFile? Image { get; set; }

        public List<IFormFile>? AdditionalImages { get; set; }
    }
}
