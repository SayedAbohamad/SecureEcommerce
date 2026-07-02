export type ReviewSort = 'latest' | 'highest' | 'lowest';

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface ReviewDistribution {
  fiveStars: number;
  fourStars: number;
  threeStars: number;
  twoStars: number;
  oneStar: number;
}

export interface ReviewQueryResponse {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  distribution: ReviewDistribution;
  page: number;
  pageSize: number;
  hasMore: boolean;
  hasReviewed: boolean;
}

export interface CreateReviewPayload {
  rating: number;
  comment: string;
  recaptchaToken?: string;
}

export type ReviewSentiment = 'positive' | 'mixed' | 'negative' | 'neutral';

export interface ReviewSummary {
  productId: string;
  available: boolean;
  overallSentiment: ReviewSentiment;
  positives: string[];
  negatives: string[];
  commonThemes: string[];
  goodFor: string;
  reviewCountAtGeneration: number;
  averageRatingAtGeneration: number;
  generatedAt: string | null;
  provider: string;
  stale: boolean;
}
