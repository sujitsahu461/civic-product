import api from './api';
import { User, RegisterPayload } from '../types/user';

export const userService = {
  async getUsers(params?: Record<string, any>): Promise<User[]> {
    const res = await api.get('/users/', { params });
    return res.data?.results || (Array.isArray(res.data) ? res.data : []);
  },

  async createAuthorityAccount(payload: RegisterPayload): Promise<User> {
    const res = await api.post('/authority/create/', payload);
    return res.data;
  },

  async toggleUserStatus(id: number, isActive: boolean): Promise<User> {
    const res = await api.patch(`/users/${id}/status/`, { is_active: isActive });
    return res.data;
  },
};
