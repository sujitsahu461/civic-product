import api from './api';
import {
  Complaint,
  ComplaintFilterParams,
  ComplaintHistory,
  SubmitComplaintPayload,
} from '../types/complaint';

export const complaintService = {
  async getComplaints(params?: ComplaintFilterParams): Promise<any> {
    const res = await api.get('/complaints/', { params });
    return res.data;
  },

  async getComplaintById(publicId: string): Promise<Complaint> {
    const res = await api.get<Complaint>(`/complaints/${publicId}/`);
    return res.data;
  },

  async trackComplaint(code: string): Promise<Complaint> {
    const cleanCode = code.trim().toUpperCase();
    const res = await api.get<Complaint>(`/complaints/track/${cleanCode}/`);
    return res.data;
  },

  async getComplaintTimeline(publicId: string): Promise<ComplaintHistory[]> {
    const res = await api.get<ComplaintHistory[]>(`/complaints/${publicId}/timeline/`);
    return res.data;
  },

  async submitComplaint(payload: SubmitComplaintPayload): Promise<Complaint> {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('description', payload.description);
    if (payload.category) formData.append('category', payload.category);
    formData.append('location_address', payload.location_address);
    if (payload.priority) formData.append('priority', payload.priority);
    if (payload.latitude != null) formData.append('latitude', String(payload.latitude));
    if (payload.longitude != null) formData.append('longitude', String(payload.longitude));

    if (payload.images && payload.images.length > 0) {
      payload.images.forEach((img) => {
        formData.append('images', img);
      });
    }

    const res = await api.post<Complaint>('/complaints/create/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async uploadImage(publicId: string, imageFile: File, caption = ''): Promise<any> {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (caption) formData.append('caption', caption);
    const res = await api.post(`/complaints/${publicId}/images/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async updateStatus(publicId: string, status: string, remarks = ''): Promise<Complaint> {
    const res = await api.post<Complaint>(`/complaints/${publicId}/status/`, {
      status,
      remarks,
    });
    return res.data;
  },

  async getNotifications(): Promise<{ unread_count: number; notifications: any[] }> {
    const res = await api.get('/notifications/');
    return res.data;
  },

  async markNotificationAsRead(publicId: string): Promise<any> {
    const res = await api.post(`/notifications/${publicId}/mark-read/`);
    return res.data;
  },

  async markAllNotificationsAsRead(): Promise<any> {
    const res = await api.post('/notifications/mark-all-read/');
    return res.data;
  },
};

export default complaintService;
