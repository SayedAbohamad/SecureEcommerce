using System;
using System.Threading;
using System.Threading.Tasks;
using BackEnd.DTO.Honeypot;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BackEnd.Controllers
{
    [Route("api/admin/honeypot")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("ai")]
    public sealed class HoneypotAdminController : ControllerBase
    {
        private readonly IHoneypotService _honeypotService;

        public HoneypotAdminController(IHoneypotService honeypotService)
        {
            _honeypotService = honeypotService;
        }

        [HttpGet("events")]
        public async Task<ActionResult<PagedResultDto<HoneypotEventDto>>> GetEvents(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? path = null,
            [FromQuery] string? ipAddress = null,
            [FromQuery] string? userAgent = null,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            CancellationToken cancellationToken = default)
        {
            var query = new HoneypotEventQueryDto
            {
                Page = page,
                PageSize = pageSize,
                Path = path,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                From = from,
                To = to
            };

            return Ok(await _honeypotService.GetEventsAsync(query, cancellationToken));
        }

        [HttpGet("summary")]
        public async Task<ActionResult<HoneypotSummaryDto>> GetSummary(CancellationToken cancellationToken)
        {
            return Ok(await _honeypotService.GetSummaryAsync(cancellationToken));
        }
    }
}
