using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTO
{
    public sealed class GoogleAuthDto
    {
        [Required(ErrorMessage = "Google credential is required.")]
        public string Credential { get; set; } = string.Empty;
    }
}
