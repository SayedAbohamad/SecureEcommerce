import axiosClient from './axiosClient';
import {
  UserDetails,
  UserSummary,
  UpdateUserRolesPayload,
  UpdateUserStatusPayload,
  PaginatedUserResponse,
} from '../types';

const resource = 'User';

export const userApi = {
  async getAll(params?: {
    search?: string;
    roleFilter?: string;
    statusFilter?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedUserResponse> {
    const { data } = await axiosClient.get<PaginatedUserResponse>(resource, { params });
    return data;
  },

  async getById(id: string): Promise<UserDetails> {
    const { data } = await axiosClient.get<UserDetails>(`${resource}/${id}`);
    return data;
  },

  async updateRoles(id: string, payload: UpdateUserRolesPayload): Promise<void> {
    await axiosClient.put(`${resource}/${id}/roles`, payload);
  },

  async updateStatus(id: string, payload: UpdateUserStatusPayload): Promise<void> {
    await axiosClient.put(`${resource}/${id}/status`, payload);
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`${resource}/${id}`);
  },
};

