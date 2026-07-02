import { useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import { showToast } from '../../utils/toast';
import { ReviewSentiment } from '../../types/review';

interface ReviewSummaryCardProps {
  productId: string;
  /** Total review count from the already-loaded review list, used only to decide whether
   * it's worth showing a "not enough reviews yet" empty state vs nothing at all. */
  totalReviews: number;
}

const sentimentMeta: Record<ReviewSentiment, { label: string; badgeClass: string; icon: string }> = {
  positive: { label: 'Mostly Positive', badgeClass: 'bg-success', icon: 'fa-face-smile' },
  mixed: { label: 'Mixed', badgeClass: 'bg-warning text-dark', icon: 'fa-face-meh' },
  negative: { label: 'Mostly Negative', badgeClass: 'bg-danger', icon: 'fa-face-frown' },
  neutral: { label: 'Not enough signal yet', badgeClass: 'bg-secondary', icon: 'fa-circle-question' },
};

export const ReviewSummaryCard = ({ productId, totalReviews }: ReviewSummaryCardProps) => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = hasRole('Admin') || hasRole('Manager');

  const { data: summary, isLoading, isFetching } = useQuery({
    queryKey: ['reviewSummary', productId],
    queryFn: () => reviewApi.getSummary(productId),
    enabled: Boolean(productId),
    staleTime: 1000 * 60 * 5,
  });

  const handleRefresh = async () => {
    try {
      const updated = await reviewApi.refreshSummary(productId);
      queryClient.setQueryData(['reviewSummary', productId], updated);
      showToast.success('Review summary refreshed');
    } catch (error) {
      console.error(error);
      showToast.error('Unable to refresh summary right now');
    }
  };

  // Nothing generated yet and not enough reviews to bother — don't clutter the page.
  if (!isLoading && (!summary || !summary.available) && totalReviews < 3 && !isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="review-summary-ai-card p-4 rounded-4 bg-white shadow-sm mb-4">
        <div className="placeholder-glow">
          <span className="placeholder col-4 rounded mb-2 d-block"></span>
          <span className="placeholder col-8 rounded d-block"></span>
        </div>
      </div>
    );
  }

  if (!summary || !summary.available) {
    return (
      <div className="review-summary-ai-card p-4 rounded-4 bg-white shadow-sm mb-4">
        <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div>
            <h6 className="fw-semibold mb-1">
              <i className="fas fa-wand-magic-sparkles text-primary me-2" />
              AI Review Summary
            </h6>
            <p className="text-muted small mb-0">No summary generated yet.</p>
          </div>
          {isAdmin && (
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleRefresh} disabled={isFetching}>
              {isFetching ? 'Generating...' : 'Generate summary'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const meta = sentimentMeta[summary.overallSentiment] ?? sentimentMeta.neutral;

  return (
    <div className="review-summary-ai-card p-4 rounded-4 bg-white shadow-sm mb-4">
      <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-3">
        <div>
          <h6 className="fw-semibold mb-1">
            <i className="fas fa-wand-magic-sparkles text-primary me-2" />
            AI Review Summary
          </h6>
          <span className={`badge ${meta.badgeClass}`}>
            <i className={`fas ${meta.icon} me-1`} />
            {meta.label}
          </span>
          {summary.stale && (
            <span className="badge bg-light text-muted ms-2">New reviews since last summary</span>
          )}
        </div>
        {isAdmin && (
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleRefresh} disabled={isFetching}>
            <i className="fas fa-rotate-right me-1" />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>

      <div className="row g-3">
        {summary.positives.length > 0 && (
          <div className="col-md-6">
            <div className="fw-semibold small text-success mb-2">
              <i className="fas fa-thumbs-up me-1" /> Customers liked
            </div>
            <ul className="mb-0 ps-3 small text-muted">
              {summary.positives.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {summary.negatives.length > 0 && (
          <div className="col-md-6">
            <div className="fw-semibold small text-danger mb-2">
              <i className="fas fa-thumbs-down me-1" /> Common concerns
            </div>
            <ul className="mb-0 ps-3 small text-muted">
              {summary.negatives.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {summary.goodFor && (
        <p className="small text-muted mt-3 mb-0">
          <i className="fas fa-lightbulb text-warning me-1" />
          <strong>Good for:</strong> {summary.goodFor}
        </p>
      )}

      <p className="text-muted mt-3 mb-0" style={{ fontSize: '0.75rem' }}>
        Based on {summary.reviewCountAtGeneration} review{summary.reviewCountAtGeneration === 1 ? '' : 's'} · AI-generated summary, may not reflect every review
      </p>
    </div>
  );
};
