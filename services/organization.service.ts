import api from './api';
import { Organization } from '@/types';

class OrganizationService {
  async getAll(): Promise<Organization[]> {
    const response = await api.get('/admin/organizations');
    return response.data;
  }

  async getById(id: string): Promise<Organization> {
    const response = await api.get(`/admin/organizations/${id}`);
    return response.data;
  }

  async create(data: Partial<Organization>): Promise<Organization> {
    const response = await api.post('/admin/organizations', data);
    return response.data;
  }

  async update(id: string, data: Partial<Organization>): Promise<Organization> {
    const response = await api.put(`/admin/organizations/${id}`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/admin/organizations/${id}`);
  }
}

export default new OrganizationService();