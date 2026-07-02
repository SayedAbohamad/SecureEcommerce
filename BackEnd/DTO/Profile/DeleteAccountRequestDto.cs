using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTO.Profile
{
    public class DeleteAccountRequestDto
    {
        [Required]
        public string Password { get; set; }
    }
}
