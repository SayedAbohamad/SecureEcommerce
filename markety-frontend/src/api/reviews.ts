import axiosClient from './axiosClient';
import { CreateReviewPayload, ReviewQueryResponse, ReviewSort, ReviewSummary } from '../types/review';

const resource = 'products';

export const reviewApi = {
  async getByProduct(productId: string, options: { sort?: ReviewSort; page?: number; pageSize?: number }): Promise<ReviewQueryResponse> {
    const { sort = 'latest', page = 1, pageSize = 4 } = options;
    const { data } = await axiosClient.get<ReviewQueryResponse>(
      `${resource}/${productId}/reviews`,
      {
        params: { sort, page, pageSize },
      }
    );
    return data;
  },

  async create(productId: string, payload: CreateReviewPayload) {
    const { data } = await axiosClient.post<{
      id: string;
      productId: string;
      userId: string;
      userName: string;
      rating: number;
      comment: string;
      isVerifiedPurchase: boolean;
      createdAt: string;
    }>(`${resource}/${productId}/reviews`, payload);
    return data;
  },

  async getSummary(productId: string): Promise<ReviewSummary> {
    const { data } = await axiosClient.get<ReviewSummary>(`${resource}/${productId}/reviews/summary`);
    return data;
  },

  async refreshSummary(productId: string): Promise<ReviewSummary> {
    const { data } = await axiosClient.post<ReviewSummary>(`${resource}/${productId}/reviews/summary/refresh`);
    return data;
  },
};
