using BackEnd.DTO.Recommendation;

namespace BackEnd.Services.Recommendations;

public interface IRecommendationService
{
    Task<RecommendationPageResponseDto> GetRecommendationsAsync(
        RecommendationRequestDto request,
        string? userId,
        string? sessionId,
        CancellationToken cancellationToken = default);
}
