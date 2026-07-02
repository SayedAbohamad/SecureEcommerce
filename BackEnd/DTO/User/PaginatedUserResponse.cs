using System.Collections.Generic;

namespace BackEnd.DTO.User
{
    public class PaginatedUserResponse
    {
        public IEnumerable<UserSummaryDto> Users { get; set; } = new List<UserSummaryDto>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}