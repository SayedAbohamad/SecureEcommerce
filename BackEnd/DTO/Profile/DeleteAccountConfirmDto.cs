using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTO.Profile
{
    public class DeleteAccountConfirmDto
    {
        [Required]
        public string Password { get; set; }
        
        [Required]
        public string Otp { get; set; }
    }
}
