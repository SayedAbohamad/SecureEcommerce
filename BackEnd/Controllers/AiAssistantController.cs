using System.Security.Claims;
using BackEnd.DTO.AiAssistant;
using BackEnd.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BackEnd.Controllers;

[ApiController]
[Route("api/assistant")]
[EnableRateLimiting("ai")]
public sealed class AiAssistantController : ControllerBase
{
    private readonly IAiShoppingAssistantService _assistant;

    public AiAssistantController(IAiShoppingAssistantService assistant)
    {
        _assistant = assistant;
    }

    [HttpPost("chat")]
    public async Task<ActionResult<AiAssistantResponseDto>> Chat(
        [FromBody] AiAssistantRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var response = await _assistant.RespondAsync(request, userId, cancellationToken);
        return Ok(response);
    }
}
