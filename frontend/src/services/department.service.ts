import api from './api';
import { Department, CreateDepartmentPayload } from '../types/department';

export const departmentService = {
  async getDepartments(): Promise<Department[]> {
    const res = await api.get('/departments/');
    return res.data?.results || (Array.isArray(res.data) ? res.data : []);
  },

  async createDepartment(payload: CreateDepartmentPayload): Promise<Department> {
    const res = await api.post('/departments/', payload);
    return res.data;
  },

  async updateDepartment(id: number, payload: Partial<CreateDepartmentPayload>): Promise<Department> {
    const res = await api.patch(`/departments/${id}/`, payload);
    return res.data;
  },

  async deleteDepartment(id: number): Promise<void> {
    await api.delete(`/departments/${id}/`);
  },
};
