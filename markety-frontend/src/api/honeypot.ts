import axiosClient from './axiosClient';

export interface HoneypotEvent {
  id: string;
  ipAddress: string;
  userAgent: string | null;
  path: string;
  method: string;
  queryString: string | null;
  body: string | null;
  referrer: string | null;
  country: string | null;
  trapType: string;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface HoneypotEventQuery {
  page?: number;
  pageSize?: number;
  path?: string;
  ipAddress?: string;
  userAgent?: string;
  from?: string;
  to?: string;
}

export interface HoneypotTopEntry {
  key: string;
  count: number;
}

export interface HoneypotSummary {
  totalHits: number;
  hitsToday: number;
  uniqueIps: number;
  mostTargetedPath: string | null;
  latestAttackAt: string | null;
  topPaths: HoneypotTopEntry[];
  topIps: HoneypotTopEntry[];
  hitsByDay: HoneypotTopEntry[];
  recentUserAgents: string[];
  recentPayloads: string[];
}

export const honeypotApi = {
  async getSummary(): Promise<HoneypotSummary> {
    const { data } = await axiosClient.get<HoneypotSummary>('admin/honeypot/summary');
    return data;
  },

  async getEvents(query: HoneypotEventQuery): Promise<PagedResult<HoneypotEvent>> {
    const { data } = await axiosClient.get<PagedResult<HoneypotEvent>>('admin/honeypot/events', {
      params: query,
    });
    return data;
  },
};
