using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTO
{
    public class ForgotPasswordDto
    {
        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [StringLength(256, ErrorMessage = "Email must not exceed 256 characters.")]
        public string Email { get; set; } = string.Empty;

        public string? RecaptchaToken { get; set; }
    }
}
