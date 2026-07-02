import axiosClient from './axiosClient';
import { AssistantChatRequest, AssistantChatResponse } from '../types';

export const assistantApi = {
  async chat(payload: AssistantChatRequest): Promise<AssistantChatResponse> {
    const { data } = await axiosClient.post<AssistantChatResponse>('assistant/chat', payload);
    return data;
  },
};
