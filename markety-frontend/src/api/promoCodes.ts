import axiosClient from './axiosClient';
import { PromoCode, PromoCodeFormInput, PromoCodeStats } from '../types/promoCode';

const resource = 'PromoCode';

export const promoCodeApi = {
  async getAll(): Promise<PromoCode[]> {
    const { data } = await axiosClient.get<PromoCode[]>(resource);
    return data;
  },

  async getById(id: string): Promise<PromoCode> {
    const { data } = await axiosClient.get<PromoCode>(`${resource}/${id}`);
    return data;
  },

  async create(payload: PromoCodeFormInput): Promise<PromoCode> {
    const { data } = await axiosClient.post<PromoCode>(resource, payload);
    return data;
  },

  async update(id: string, payload: PromoCodeFormInput): Promise<void> {
    await axiosClient.put(`${resource}/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`${resource}/${id}`);
  },

  async toggleActive(id: string): Promise<{ isActive: boolean }> {
    const { data } = await axiosClient.patch<{ isActive: boolean }>(`${resource}/${id}/toggle`);
    return data;
  },

  async getStats(): Promise<PromoCodeStats> {
    const { data } = await axiosClient.get<PromoCodeStats>(`${resource}/stats`);
    return data;
  },

  async validate(code: string, orderTotal: number): Promise<{
    valid: boolean;
    code: string;
    discountType: string;
    discountValue: number;
    calculatedDiscount: number;
    description: string;
  }> {
    const { data } = await axiosClient.post(`${resource}/validate`, { code, orderTotal });
    return data;
  },

  async getActive(): Promise<PromoCode[]> {
    const { data } = await axiosClient.get<PromoCode[]>(`${resource}/active`);
    return data;
  },
};
