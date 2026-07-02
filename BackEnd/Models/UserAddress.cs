using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackEnd.Models
{
    public class UserAddress
    {
        [Key]
        public Guid Id { get; set; }
        
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        [ForeignKey(nameof(UserId))]
        public ApplicationUser? User { get; set; }

        [Required]
        public string Street { get; set; } = string.Empty;
        
        [Required]
        public string City { get; set; } = string.Empty;
        
        public string? State { get; set; }
        public string? Country { get; set; } = "Egypt";
        public string? ZipCode { get; set; }
        
        public bool IsDefault { get; set; }
    }
}
