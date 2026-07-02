using System.Security.Claims;
using BackEnd.DTO.Recommendation;
using BackEnd.Services.Recommendations;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.Controllers;

[ApiController]
[Route("api/recommendations")]
public sealed class RecommendationController : ControllerBase
{
    private const string SessionHeader = "X-Markety-Session-Id";
    private readonly IRecommendationService _recommendationService;
    private readonly IUserBehaviorTrackingService _trackingService;

    public RecommendationController(
        IRecommendationService recommendationService,
        IUserBehaviorTrackingService trackingService)
    {
        _recommendationService = recommendationService;
        _trackingService = trackingService;
    }

    [HttpGet]
    public async Task<ActionResult<RecommendationPageResponseDto>> GetRecommendations(
        [FromQuery] RecommendationRequestDto request,
        CancellationToken cancellationToken)
    {
        var response = await _recommendationService.GetRecommendationsAsync(
            request,
            GetUserId(),
            GetSessionId(),
            cancellationToken);

        return Ok(response);
    }

    [HttpPost("track")]
    public async Task<IActionResult> TrackBehavior(
        [FromBody] BehaviorEventRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        await _trackingService.TrackAsync(request, GetUserId(), GetSessionId(), cancellationToken);
        return Accepted(new { message = "Behavior event accepted." });
    }

    private string? GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

    private string? GetSessionId()
    {
        if (!Request.Headers.TryGetValue(SessionHeader, out var value))
            return null;

        var sessionId = value.ToString();
        if (string.IsNullOrWhiteSpace(sessionId))
            return null;

        return sessionId.Length > 120 ? sessionId[..120] : sessionId;
    }
}
