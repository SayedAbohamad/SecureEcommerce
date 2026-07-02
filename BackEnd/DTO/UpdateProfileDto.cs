namespace BackEnd.DTO
{
    public class UpdateProfileDto
    {
        public string FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public DateTime? DateOfBirth { get; set; }
    }
}
