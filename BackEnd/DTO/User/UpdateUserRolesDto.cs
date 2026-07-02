using System.Collections.Generic;

namespace BackEnd.DTO.User
{
    public class UpdateUserRolesDto
    {
        public IList<string> Roles { get; set; } = new List<string>();
    }
}

