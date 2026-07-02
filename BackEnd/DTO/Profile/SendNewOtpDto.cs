namespace BackEnd.DTO.Profile
{
    public class SendNewOtpDto
    {
        public string NewEmail { get; set; } = string.Empty;
        public string ChangeEmailToken { get; set; } = string.Empty;
    }
}
