import axiosClient from './axiosClient';
import {
  CheckoutPayload,
  OrderDetails,
  OrderSummary,
  StripeCheckoutSessionResponse,
  StripeSessionVerificationResponse,
  UpdateOrderStatusPayload,
} from '../types';

const resource = 'Order';

export const orderApi = {
  async checkout(payload: CheckoutPayload): Promise<string> {
    const formData = new FormData();
    formData.append('PaymentMethod', payload.paymentMethod);
    if (payload.promoCode) {
      formData.append('PromoCode', payload.promoCode);
    }
    if (payload.recaptchaToken) {
      formData.append('RecaptchaToken', payload.recaptchaToken);
    }
    const { data } = await axiosClient.post<string>(`${resource}/CheckOut`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async getMine(): Promise<OrderSummary[]> {
    const { data } = await axiosClient.get<OrderSummary[]>(`${resource}/mine`);
    return data;
  },

  async getAll(): Promise<OrderSummary[]> {
    const { data } = await axiosClient.get<OrderSummary[]>(resource);
    return data;
  },

  async getById(id: string): Promise<OrderDetails> {
    const { data } = await axiosClient.get<OrderDetails>(`${resource}/${id}`);
    return data;
  },

  async updateStatus(id: string, payload: UpdateOrderStatusPayload): Promise<void> {
    await axiosClient.put(`${resource}/${id}/status`, payload);
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`${resource}/${id}`);
  },

  async cancel(id: string): Promise<{ message: string }> {
    const { data } = await axiosClient.put(`${resource}/${id}/cancel`);
    return data;
  },

  async createStripeCheckoutSession(promoCode?: string, recaptchaToken?: string): Promise<StripeCheckoutSessionResponse> {
    const formData = new FormData();
    if (recaptchaToken) {
      formData.append('recaptchaToken', recaptchaToken);
    }
    const url = `${resource}/CreateStripeCheckoutSession${promoCode ? `?promoCode=${promoCode}` : ''}`;
    const { data } = await axiosClient.post<StripeCheckoutSessionResponse>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async verifyStripeSession(sessionId: string): Promise<StripeSessionVerificationResponse> {
    const { data } = await axiosClient.get<StripeSessionVerificationResponse>(`${resource}/VerifyStripeSession/${sessionId}`);
    return data;
  },

  async getFavoriteCategory(): Promise<string> {
    const { data } = await axiosClient.get<string>(`${resource}/favorite-category`);
    return data;
  },
};

