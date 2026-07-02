using BackEnd.DTO.Admin;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BackEnd.Controllers;

[Route("api/admin/security-insights")]
[ApiController]
[Authorize(Roles = "Admin")]
[EnableRateLimiting("ai")]
public sealed class SecurityInsightsController : ControllerBase
{
    private readonly ISecurityInsightsService _securityInsightsService;

    public SecurityInsightsController(ISecurityInsightsService securityInsightsService)
    {
        _securityInsightsService = securityInsightsService;
    }

    [HttpGet]
    public async Task<ActionResult<SecurityInsightsDto>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _securityInsightsService.GenerateAsync(cancellationToken));
    }
}
