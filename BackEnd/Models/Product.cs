using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Models
{
    [Index(nameof(Slug))]
    [Index(nameof(CategoryId))]
    public class Product : BaseEntity
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public string Slug { get; set; }
        public int Stock { get; set; }
        public Guid CategoryId { get; set; }
        [JsonIgnore]
        public Category Category { get; set; } //Navigation Property
        public string ImageUrl { get; set; }
        public string? Sizes { get; set; } // JSON array of available sizes, e.g., ["Small","Medium","Large"]
        public string? AdditionalImages { get; set; } // JSON array of additional image URLs
        public ICollection<Review> Reviews { get; set; } = new List<Review>();

        /// <summary>
        /// Optimistic concurrency token — EF Core uses this to detect concurrent modifications (#11 race condition fix).
        /// </summary>
        [Timestamp]
        [JsonIgnore]
        public byte[]? RowVersion { get; set; }
    }
}
