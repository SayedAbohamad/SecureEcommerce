import axiosClient from './axiosClient';
import { Category, CategoryFormData } from '../types';

const resource = 'Category';

export const categoryApi = {
  async getAll(): Promise<Category[]> {
    const { data } = await axiosClient.get<Category[]>(resource);
    return data;
  },

  async getById(id: string): Promise<Category> {
    const { data } = await axiosClient.get<Category>(`${resource}/${id}`);
    return data;
  },

  async create(payload: CategoryFormData): Promise<Category> {
    const formData = new FormData();
    formData.append('Name', payload.name);
    const { data } = await axiosClient.post<Category>(resource, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async update(payload: CategoryFormData & { id: string }): Promise<void> {
    const formData = new FormData();
    formData.append('Id', payload.id);
    formData.append('Name', payload.name);
    await axiosClient.put(`${resource}/${payload.id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`${resource}/${id}`);
  },
};

