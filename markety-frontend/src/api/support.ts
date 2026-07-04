import axiosClient from './axiosClient';

export interface SupportTicket {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  adminReply?: string;
  repliedAt?: string;
  repliedBy?: string;
}

export interface SubmitTicketPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  recaptchaToken?: string;
}

export interface SupportTicketSummary {
  summary: string;
  provider: string;
  generatedAt: string;
}

export interface SupportTicketReplyDraft {
  suggestedReply: string;
  provider: string;
  generatedAt: string;
}

export interface SupportTicketClassification {
  priority: 'Low' | 'Medium' | 'High' | 'Urgent' | string;
  sentiment: string;
  category: string;
  provider: string;
  generatedAt: string;
}

const resource = 'Support';

export const supportApi = {
  async submit(payload: SubmitTicketPayload): Promise<{ message: string; ticketId: string }> {
    const { data } = await axiosClient.post(resource, payload);
    return data;
  },

  async getAll(status?: string): Promise<SupportTicket[]> {
    const { data } = await axiosClient.get<SupportTicket[]>(resource, {
      params: status ? { status } : undefined,
    });
    return data;
  },

  async getMine(): Promise<SupportTicket[]> {
    const { data } = await axiosClient.get<SupportTicket[]>(`${resource}/mine`);
    return data;
  },

  async getById(id: string): Promise<SupportTicket> {
    const { data } = await axiosClient.get<SupportTicket>(`${resource}/${id}`);
    return data;
  },

  async reply(id: string, reply: string): Promise<{ message: string; emailDelivered: boolean; emailSkipped: boolean; emailWarning?: string }> {
    const { data } = await axiosClient.post<{ message: string; emailDelivered: boolean; emailSkipped: boolean; emailWarning?: string }>(`${resource}/${id}/reply`, { reply });
    return data;
  },

  async close(id: string): Promise<{ message: string }> {
    const { data } = await axiosClient.put(`${resource}/${id}/close`);
    return data;
  },

  async summarize(id: string): Promise<SupportTicketSummary> {
    const { data } = await axiosClient.post<SupportTicketSummary>(`${resource}/${id}/ai/summarize`);
    return data;
  },

  async suggestReply(id: string, additionalContext?: string): Promise<SupportTicketReplyDraft> {
    const { data } = await axiosClient.post<SupportTicketReplyDraft>(`${resource}/${id}/ai/suggest-reply`, {
      additionalContext,
    });
    return data;
  },

  async classify(id: string): Promise<SupportTicketClassification> {
    const { data } = await axiosClient.post<SupportTicketClassification>(`${resource}/${id}/ai/classify`);
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`${resource}/${id}`);
  },
};
