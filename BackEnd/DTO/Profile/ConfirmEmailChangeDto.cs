namespace BackEnd.DTO.Profile
{
    public class ConfirmEmailChangeDto
    {
        public string Otp { get; set; } = string.Empty;
        public string ChangeEmailToken { get; set; } = string.Empty;
    }
}
