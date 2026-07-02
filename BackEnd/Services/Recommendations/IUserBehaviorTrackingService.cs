using BackEnd.DTO.Recommendation;

namespace BackEnd.Services.Recommendations;

public interface IUserBehaviorTrackingService
{
    Task TrackAsync(
        BehaviorEventRequestDto request,
        string? userId,
        string? sessionId,
        CancellationToken cancellationToken = default);
}
