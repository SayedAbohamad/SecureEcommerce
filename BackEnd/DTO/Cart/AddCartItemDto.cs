using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTO.Cart
{
    public class AddCartItemDto
    {
        [Required(ErrorMessage = "ProductId is required.")]
        public Guid ProductId { get; set; }

        [Required(ErrorMessage = "Quantity is required.")]
        [Range(1, 100, ErrorMessage = "Quantity must be between 1 and 100.")]
        public int Quantity { get; set; }

        /// <summary>Selected size for this cart item (optional).</summary>
        [StringLength(50, ErrorMessage = "Size must not exceed 50 characters.")]
        public string? Size { get; set; }
    }
}
