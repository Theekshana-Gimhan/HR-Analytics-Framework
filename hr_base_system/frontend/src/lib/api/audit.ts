import apiClient from '../apiClient';

export interface AuditLogEntry {
  id: number;
  userId: number;
  companyId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogListParams {
  userId?: number;
  action?: string;
  entityType?: string;
  entityId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export const auditApi = {
  list: async (params: AuditLogListParams = {}): Promise<AuditLogResponse> => {
    const response = await apiClient.get<AuditLogResponse>('/audit-logs', { params });
    return response.data;
  },
};
