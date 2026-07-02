import axiosClient from './axiosClient';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface NotificationSettings {
  receiveSupportEmails: boolean;
  receiveOfferEmails: boolean;
  notificationEmail?: string;
}

const resource = 'Notification';

export const notificationApi = {
  async getMyNotifications(): Promise<Notification[]> {
    const { data } = await axiosClient.get<Notification[]>(resource);
    return data;
  },

  async markAsRead(id: string): Promise<void> {
    await axiosClient.put(`${resource}/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await axiosClient.put(`${resource}/read-all`);
  },

  async getSettings(): Promise<NotificationSettings> {
    const { data } = await axiosClient.get<NotificationSettings>(`${resource}/settings`);
    return data;
  },

  async updateSettings(payload: NotificationSettings): Promise<void> {
    await axiosClient.put(`${resource}/settings`, payload);
  },
};
