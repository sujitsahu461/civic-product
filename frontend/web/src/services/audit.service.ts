import api from './api';

export interface AuditLogItem {
  public_id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string | null;
  user_agent: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AuditSummary {
  total_audit_events: number;
  security_events_count: number;
  top_actions: Array<{ action: string; count: number }>;
  actions_by_role: Array<{ actor_role: string; count: number }>;
  last_active: string;
}

export interface AuditFilterParams {
  actor_email?: string;
  action?: string;
  entity_type?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const auditService = {
  getAuditLogs: async (params?: AuditFilterParams): Promise<PaginatedResponse<AuditLogItem>> => {
    const response = await api.get<PaginatedResponse<AuditLogItem>>('/audit-logs/', { params });
    return response.data;
  },

  getAuditSummary: async (): Promise<AuditSummary> => {
    const response = await api.get<AuditSummary>('/audit-logs/summary/');
    return response.data;
  },

  getAuditLogDetail: async (publicId: string): Promise<AuditLogItem> => {
    const response = await api.get<AuditLogItem>(`/audit-logs/${publicId}/`);
    return response.data;
  },
};

export default auditService;
