using BackEnd.DTO.Review;

namespace BackEnd.Services;

public interface IReviewSummaryService
{
    /// <summary>Returns a cached summary if one exists and is fresh, otherwise generates one.</summary>
    Task<ReviewSummaryDto> GetSummaryAsync(Guid productId, CancellationToken cancellationToken);

    /// <summary>Forces regeneration regardless of cache state (admin "Refresh" action).</summary>
    Task<ReviewSummaryDto> RefreshSummaryAsync(Guid productId, CancellationToken cancellationToken);
}
