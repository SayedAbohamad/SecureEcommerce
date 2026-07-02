import axiosClient from './axiosClient';

export interface AdminInsightMetric {
  label: string;
  value: string;
}

export interface AdminInsights {
  summary: string;
  suggestedActions: string[];
  metrics: AdminInsightMetric[];
  provider: string;
  generatedAt: string;
}

export interface SecurityRiskSignal {
  title: string;
  severity: 'Low' | 'Medium' | 'High' | string;
  description: string;
}

export interface SecurityInsights {
  summary: string;
  riskLevel: 'Low' | 'Medium' | 'High' | string;
  recommendedAction: string;
  signals: SecurityRiskSignal[];
  provider: string;
  generatedAt: string;
}

export const adminInsightsApi = {
  async getInsights(): Promise<AdminInsights> {
    const { data } = await axiosClient.get<AdminInsights>('admin/insights');
    return data;
  },

  async getSecurityInsights(): Promise<SecurityInsights> {
    const { data } = await axiosClient.get<SecurityInsights>('admin/security-insights');
    return data;
  },
};
