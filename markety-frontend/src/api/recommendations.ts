import axiosClient from './axiosClient';
import {
  BehaviorEventPayload,
  RecommendationRequest,
  RecommendationResponse,
} from '../types/recommendation';
import { getRecommendationSessionId } from '../utils/recommendationSession';

const resource = 'recommendations';
export const RECOMMENDATIONS_UPDATED_EVENT = 'markety:recommendations-updated';

export const recommendationApi = {
  async get(request: RecommendationRequest = {}): Promise<RecommendationResponse> {
    const { data } = await axiosClient.get<RecommendationResponse>(resource, {
      params: {
        placement: request.placement ?? 'home',
        productId: request.productId,
        limit: request.limit,
        sessionId: getRecommendationSessionId(),
      },
    });
    return data;
  },

  async track(payload: BehaviorEventPayload): Promise<void> {
    await axiosClient.post(`${resource}/track`, {
      ...payload,
      sessionId: getRecommendationSessionId(),
    });
    window.dispatchEvent(new CustomEvent(RECOMMENDATIONS_UPDATED_EVENT, {
      detail: { eventType: payload.eventType },
    }));
  },

  trackQuietly(payload: BehaviorEventPayload): void {
    recommendationApi.track(payload).catch(() => {
      // Recommendations must never break the shopping flow.
    });
  },
};
