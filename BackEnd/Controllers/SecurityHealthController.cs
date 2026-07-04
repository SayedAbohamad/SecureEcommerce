using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using BackEnd.DTO.Security;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BackEnd.Controllers
{
    [Route("api/admin/security-health")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("ai")]
    public sealed class SecurityHealthController : ControllerBase
    {
        private readonly ISecurityHealthService _securityHealthService;

        public SecurityHealthController(ISecurityHealthService securityHealthService)
        {
            _securityHealthService = securityHealthService;
        }

        [HttpGet]
        public async Task<ActionResult<SecurityHealthDto>> Get(CancellationToken cancellationToken)
        {
            return Ok(await _securityHealthService.GetHealthAsync(HttpContext, cancellationToken));
        }

        [HttpGet("blocked-ips")]
        public async Task<ActionResult> GetBlockedIps(CancellationToken cancellationToken)
        {
            return Ok(await _securityHealthService.GetBlockedIpsAsync(cancellationToken));
        }

        [HttpPost("blocked-ips")]
        public async Task<ActionResult> AddBlockedIp([FromBody] AddBlockedIpDto dto, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(dto.IpAddress))
                return BadRequest(new { message = "IP address is required." });

            var actor = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.Name);
            var result = await _securityHealthService.AddBlockedIpAsync(dto, actor, cancellationToken);
            return Ok(result);
        }

        [HttpDelete("blocked-ips/{id:guid}")]
        public async Task<ActionResult> RemoveBlockedIp(Guid id, CancellationToken cancellationToken)
        {
            var removed = await _securityHealthService.RemoveBlockedIpAsync(id, cancellationToken);
            if (!removed) return NotFound();
            return NoContent();
        }
    }
}
