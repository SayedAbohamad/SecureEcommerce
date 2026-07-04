import axiosClient from './axiosClient';

export type HealthStatus = 'Good' | 'Warning' | 'Critical' | 'Info';

export interface SecurityCheck {
  key: string;
  label: string;
  status: HealthStatus;
  value: string;
  explanation: string;
}

export interface SecurityHealth {
  score: number;
  scoreStatus: HealthStatus;
  generatedAt: string;
  passwordPolicy: SecurityCheck;
  activeSessions: SecurityCheck;
  failedLogins: SecurityCheck;
  lastAttackDetected: SecurityCheck;
  blockedIps: SecurityCheck;
  securityHeaders: SecurityCheck;
  sslTls: SecurityCheck;
  contentSecurityPolicy: SecurityCheck;
  headerDetails: SecurityCheck[];
}

export interface BlockedIp {
  id: string;
  ipAddress: string;
  reason: string | null;
  blockedBy: string | null;
  blockedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

export interface AddBlockedIpPayload {
  ipAddress: string;
  reason?: string;
  expiresAt?: string | null;
}

export const securityHealthApi = {
  async getHealth(): Promise<SecurityHealth> {
    const { data } = await axiosClient.get<SecurityHealth>('admin/security-health');
    return data;
  },

  async getBlockedIps(): Promise<BlockedIp[]> {
    const { data } = await axiosClient.get<BlockedIp[]>('admin/security-health/blocked-ips');
    return data;
  },

  async addBlockedIp(payload: AddBlockedIpPayload): Promise<BlockedIp> {
    const { data } = await axiosClient.post<BlockedIp>('admin/security-health/blocked-ips', payload);
    return data;
  },

  async removeBlockedIp(id: string): Promise<void> {
    await axiosClient.delete(`admin/security-health/blocked-ips/${id}`);
  },
};
