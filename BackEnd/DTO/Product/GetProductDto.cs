using System.Text.Json.Serialization;

namespace BackEnd.DTO.Product
{
    public class GetProductDto
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public string Slug { get; set; }
        public int Stock { get; set; }
        public Guid CategoryId { get; set; }
        public string CategoryName { get; set; }

        public decimal oldPrice { get; set; }

        public string ImageUrl { get; set; }
        public string? AdditionalImages { get; set; } // JSON array of additional image URLs
        public string? Sizes { get; set; } // JSON array of sizes
    }
}
