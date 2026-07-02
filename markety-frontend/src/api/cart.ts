import axiosClient from './axiosClient';
import { CartItem, CartItemPayload } from '../types';

const resource = 'Cart';

export const cartApi = {
  async get(): Promise<CartItem[]> {
    const { data } = await axiosClient.get<CartItem[]>(`${resource}/GetCart`);
    return data;
  },

  async add(payload: CartItemPayload): Promise<string> {
    const formData = new FormData();
    formData.append('ProductId', payload.productId);
    formData.append('Quantity', payload.quantity.toString());
    if (payload.size) {
      formData.append('Size', payload.size);
    }
    const { data } = await axiosClient.post<string>(resource, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async update(payload: CartItemPayload): Promise<string> {
    const formData = new FormData();
    formData.append('ProductId', payload.productId);
    formData.append('Quantity', payload.quantity.toString());
    if (payload.size) {
      formData.append('Size', payload.size);
    }
    const { data } = await axiosClient.put<string>(resource, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async remove(productId: string, size?: string): Promise<string> {
    let url = `${resource}/${productId}`;
    if (size) {
      url += `?size=${encodeURIComponent(size)}`;
    }
    const { data } = await axiosClient.delete<string>(url);
    return data;
  },
};

