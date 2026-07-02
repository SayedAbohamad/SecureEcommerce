using BackEnd.DTO.Admin;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BackEnd.Controllers;

[Route("api/admin/insights")]
[ApiController]
[Authorize(Roles = "Admin")]
[EnableRateLimiting("ai")]
public sealed class AdminInsightsController : ControllerBase
{
    private readonly IAdminInsightsService _insightsService;

    public AdminInsightsController(IAdminInsightsService insightsService)
    {
        _insightsService = insightsService;
    }

    [HttpGet]
    public async Task<ActionResult<AdminInsightsDto>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _insightsService.GenerateAsync(cancellationToken));
    }
}
