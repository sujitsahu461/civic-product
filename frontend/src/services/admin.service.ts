import api from './api';
import { Complaint, ComplaintFilterParams } from '../types/complaint';
import { User } from '../types/user';

export interface DepartmentItem {
  public_id: string;
  name: string;
  slug: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  authority_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface DepartmentAuthorityItem {
  id: number;
  user_public_id: string;
  user_email: string;
  user_full_name: string;
  designation: string;
  is_head: boolean;
  assigned_at: string;
}

export interface CreateDepartmentPayload {
  name: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface UpdateDepartmentPayload {
  name?: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface AssignAuthorityPayload {
  user_public_id: string;
  designation?: string;
  is_head?: boolean;
}

export const adminService = {
  // Department Management
  async getDepartments(): Promise<DepartmentItem[]> {
    const res = await api.get('/departments/');
    return Array.isArray(res.data) ? res.data : res.data.results || [];
  },

  async getDepartmentDetail(publicId: string): Promise<DepartmentItem> {
    const res = await api.get(`/departments/${publicId}/`);
    return res.data;
  },

  async createDepartment(payload: CreateDepartmentPayload): Promise<DepartmentItem> {
    const res = await api.post('/departments/create/', payload);
    return res.data;
  },

  async updateDepartment(publicId: string, payload: UpdateDepartmentPayload): Promise<DepartmentItem> {
    const res = await api.patch(`/departments/${publicId}/update/`, payload);
    return res.data;
  },

  async deactivateDepartment(publicId: string): Promise<any> {
    const res = await api.post(`/departments/${publicId}/deactivate/`);
    return res.data;
  },

  async getDepartmentAuthorities(publicId: string): Promise<DepartmentAuthorityItem[]> {
    const res = await api.get(`/departments/${publicId}/authorities/`);
    return Array.isArray(res.data) ? res.data : res.data.results || [];
  },

  async assignAuthority(publicId: string, payload: AssignAuthorityPayload): Promise<any> {
    const res = await api.post(`/departments/${publicId}/authorities/assign/`, payload);
    return res.data;
  },

  async removeAuthority(publicId: string, userPublicId: string): Promise<any> {
    const res = await api.delete(`/departments/${publicId}/authorities/${userPublicId}/`);
    return res.data;
  },

  async getDepartmentStatistics(publicId: string): Promise<any> {
    const res = await api.get(`/departments/${publicId}/statistics/`);
    return res.data;
  },

  // User Management
  async searchUsers(params?: { q?: string; role?: string; is_active?: boolean }): Promise<User[]> {
    const cleanParams: Record<string, any> = {};
    if (params) {
      if (params.q && params.q.trim()) cleanParams.q = params.q.trim();
      if (params.role && params.role.trim()) cleanParams.role = params.role.trim();
      if (params.is_active !== undefined) cleanParams.is_active = params.is_active;
    }
    const res = await api.get('/users/search/', { params: cleanParams });
    return Array.isArray(res.data) ? res.data : res.data.results || [];
  },

  async getUserDetail(publicId: string): Promise<User> {
    const res = await api.get(`/users/${publicId}/`);
    return res.data;
  },

  async createUser(payload: {
    email: string;
    full_name: string;
    password?: string;
    role?: string;
    phone?: string;
    department?: string;
    designation?: string;
  }): Promise<User> {
    const res = await api.post('/users/create/', payload);
    return res.data;
  },

  async updateUser(
    publicId: string,
    payload: {
      is_active?: boolean;
      role?: string;
      full_name?: string;
      phone?: string;
      department?: string;
      designation?: string;
    }
  ): Promise<User> {
    const res = await api.patch(`/users/${publicId}/`, payload);
    return res.data;
  },

  async deleteUser(publicId: string): Promise<any> {
    const res = await api.delete(`/users/${publicId}/`);
    return res.data;
  },

  async resetUserPassword(email: string): Promise<any> {
    const res = await api.post('/auth/forgot-password/', { email });
    return res.data;
  },

  // System-wide Complaints
  async getSystemComplaints(params?: ComplaintFilterParams): Promise<any> {
    const res = await api.get('/complaints/', { params });
    return res.data;
  },

  // Audit Logs
  async getAuditLogs(params?: {
    search?: string;
    page?: number;
    page_size?: number;
    action?: string;
    entity_type?: string;
  }): Promise<any> {
    const res = await api.get('/audit-logs/', { params });
    return res.data;
  },

  async getAuditSummary(): Promise<any> {
    const res = await api.get('/audit-logs/summary/');
    return res.data;
  },

  // AI & ML
  async classifyAi(title: string, description: string, locationAddress = ''): Promise<any> {
    const res = await api.post('/ai/classify/', {
      title,
      description,
      location_address: locationAddress,
    });
    return res.data;
  },

  async getCityInsights(): Promise<any> {
    const res = await api.get('/ai/city-insights/');
    return res.data;
  },
};

export default adminService;
