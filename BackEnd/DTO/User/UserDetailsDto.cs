using System.Collections.Generic;

namespace BackEnd.DTO.User
{
    public class UserDetailsDto
    {
        public string Id { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public IList<string> Roles { get; set; } = new List<string>();
        public bool EmailConfirmed { get; set; }
        public bool PhoneNumberConfirmed { get; set; }
        public bool LockoutEnabled { get; set; }
        public int AccessFailedCount { get; set; }
    }
}

