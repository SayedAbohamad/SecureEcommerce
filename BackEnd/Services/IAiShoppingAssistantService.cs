using BackEnd.DTO.AiAssistant;

namespace BackEnd.Services;

public interface IAiShoppingAssistantService
{
    Task<AiAssistantResponseDto> RespondAsync(
        AiAssistantRequestDto request,
        string? userId,
        CancellationToken cancellationToken);
}
