using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTO
{
    public class RegisterDto
    {
        [Required(ErrorMessage = "Full name is required.")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Full name must be between 2 and 100 characters.")]
        [RegularExpression(@"^[\p{L}\s'\-]+$", ErrorMessage = "Full name contains invalid characters.")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [StringLength(256, ErrorMessage = "Email must not exceed 256 characters.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        [StringLength(128, MinimumLength = 8, ErrorMessage = "Password must be between 8 and 128 characters.")]
        public string Password { get; set; } = string.Empty;

        // Role is optional; only "Customer" is accepted for self-registration.
        // Enforced in AuthController, so no [Required] here.
        [StringLength(50)]
        public string? Role { get; set; }

    }
}
