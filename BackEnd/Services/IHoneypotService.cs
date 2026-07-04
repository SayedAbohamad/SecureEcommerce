using System.Threading;
using System.Threading.Tasks;
using BackEnd.DTO.Honeypot;
using Microsoft.AspNetCore.Http;

namespace BackEnd.Services
{
    public interface IHoneypotService
    {
        Task RecordHitAsync(HttpContext context, string trapType, CancellationToken cancellationToken);

        Task<PagedResultDto<HoneypotEventDto>> GetEventsAsync(HoneypotEventQueryDto query, CancellationToken cancellationToken);

        Task<HoneypotSummaryDto> GetSummaryAsync(CancellationToken cancellationToken);
    }
}
