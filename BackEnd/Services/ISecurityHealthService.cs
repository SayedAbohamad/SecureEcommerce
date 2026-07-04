using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BackEnd.DTO.Security;
using Microsoft.AspNetCore.Http;

namespace BackEnd.Services
{
    public interface ISecurityHealthService
    {
        Task<SecurityHealthDto> GetHealthAsync(HttpContext httpContext, CancellationToken cancellationToken);

        Task<List<BlockedIpDto>> GetBlockedIpsAsync(CancellationToken cancellationToken);

        Task<BlockedIpDto> AddBlockedIpAsync(AddBlockedIpDto dto, string? actor, CancellationToken cancellationToken);

        Task<bool> RemoveBlockedIpAsync(Guid id, CancellationToken cancellationToken);
    }
}
