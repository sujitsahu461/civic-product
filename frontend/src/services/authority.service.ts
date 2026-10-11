import api from './api';
import {
  AuthorityNotification,
  ComplaintStats,
  DashboardSummary,
  DepartmentPerformance,
  PriorityBreakdown,
} from '../types/authority';
import { Complaint, ComplaintFilterParams } from '../types/complaint';

export const authorityService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await api.get<DashboardSummary>('/authority/dashboard/summary/');
    return res.data;
  },

  async getRecentComplaints(): Promise<Complaint[]> {
    const res = await api.get<Complaint[]>('/authority/dashboard/recent/');
    return res.data;
  },

  async getComplaints(params?: ComplaintFilterParams): Promise<any> {
    const res = await api.get('/authority/complaints/', { params });
    return res.data;
  },

  async getComplaintDetail(publicId: string): Promise<Complaint> {
    const res = await api.get<Complaint>(`/authority/complaints/${publicId}/`);
    return res.data;
  },

  async updateComplaintStatus(publicId: string, status: string, remarks = ''): Promise<Complaint> {
    const res = await api.post<Complaint>(`/authority/complaints/${publicId}/status/`, {
      status,
      remarks,
    });
    return res.data;
  },

  async updateResolutionNotes(publicId: string, notes: string): Promise<Complaint> {
    const res = await api.post<Complaint>(`/authority/complaints/${publicId}/notes/`, {
      notes,
    });
    return res.data;
  },

  async uploadResolutionImage(publicId: string, imageFile: File, caption = ''): Promise<any> {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (caption) formData.append('caption', caption);

    const res = await api.post(`/authority/complaints/${publicId}/resolution-image/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async updatePriority(publicId: string, priority: string, remarks = ''): Promise<Complaint> {
    const res = await api.post<Complaint>(`/authority/complaints/${publicId}/priority/`, {
      priority,
      remarks,
    });
    return res.data;
  },

  async getAnalyticsStats(days = 30): Promise<ComplaintStats> {
    const res = await api.get<ComplaintStats>('/authority/analytics/stats/', {
      params: { days },
    });
    return res.data;
  },

  async getDepartmentPerformance(days?: number): Promise<any> {
    const res = await api.get('/authority/analytics/department/', {
      params: days ? { days } : undefined,
    });
    return res.data;
  },

  async getPriorityBreakdown(): Promise<PriorityBreakdown> {
    const res = await api.get<PriorityBreakdown>('/authority/analytics/priority/');
    return res.data;
  },

  async getFeedbacks(): Promise<any[]> {
    const res = await api.get('/feedback/authority/feedbacks/');
    return res.data;
  },

  async getNotifications(): Promise<AuthorityNotification[]> {
    const res = await api.get<any>('/authority/notifications/');
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data?.results && Array.isArray(data.results)) return data.results;
    if (data?.notifications && Array.isArray(data.notifications)) return data.notifications;
    return [];
  },

  async getUnreadCount(): Promise<{ unread_count: number }> {
    const res = await api.get<{ unread_count: number }>('/authority/notifications/unread-count/');
    return res.data;
  },

  async markNotificationRead(notificationId: string | number): Promise<any> {
    const res = await api.post('/authority/notifications/mark-read/', {
      notification_ids: [notificationId],
    });
    return res.data;
  },

  async markAllNotificationsRead(): Promise<any> {
    const res = await api.post('/authority/notifications/mark-all-read/');
    return res.data;
  },
};

export default authorityService;
