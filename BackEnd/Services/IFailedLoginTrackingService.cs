using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace BackEnd.Services
{
    public interface IFailedLoginTrackingService
    {
        Task RecordFailedLoginAsync(HttpContext context, string? email, string reason, CancellationToken cancellationToken);
    }
}
