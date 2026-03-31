import api from './api';
import { Application } from '@/types';

export interface CreateApplicationData {
  plateNumber: string;
  contractNumber: string;
  listId: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  validFrom?: string;
  validUntil?: string;
  notes?: string;
}

export interface RejectApplicationData {
  reason?: string;
}

class ApplicationService {
  // Participant endpoints
  async create(data: CreateApplicationData): Promise<Application> {
    const response = await api.post<Application>('/applications', data);
    return response.data;
  }

  async getMyApplications(): Promise<Application[]> {
    const response = await api.get<Application[]>('/applications/my');
    return response.data;
  }

  // Общий эндпоинт для получения заявки по ID
  async getById(id: string): Promise<Application> {
    const response = await api.get<Application>(`/applications/${id}`);
    return response.data;
  }

  // Admin endpoints
  async getAllApplications(filters?: {
    status?: string;
    organizationId?: string;
    listId?: string;
    from?: string;
    to?: string;
  }): Promise<Application[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.organizationId) params.append('organizationId', filters.organizationId);
    if (filters?.listId) params.append('listId', filters.listId);
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    
    const response = await api.get<Application[]>('/admin/applications', { params });
    return response.data;
  }

  async adminApproveAsOperator(id: string): Promise<void> {
    await api.put(`/admin/applications/${id}/approve-as-operator`);
  }

  async adminApproveAsSupervisor(id: string): Promise<void> {
    await api.put(`/admin/applications/${id}/approve-as-supervisor`);
  }

  async adminReject(id: string, data?: RejectApplicationData): Promise<void> {
    await api.put(`/admin/applications/${id}/reject`, data || {});
  }

  // Operator endpoints
  async getPendingForOperator(): Promise<Application[]> {
    const response = await api.get<Application[]>('/applications/pending-operator');
    return response.data;
  }

  async operatorApprove(id: string): Promise<void> {
    await api.put(`/applications/${id}/operator-approve`);
  }

  async reject(id: string, data?: RejectApplicationData): Promise<void> {
    await api.put(`/applications/${id}/reject`, data || {});
  }

  // Supervisor endpoints
  async getPendingForSupervisor(): Promise<Application[]> {
    const response = await api.get<Application[]>('/applications/pending-supervisor');
    return response.data;
  }

  async supervisorApprove(id: string): Promise<void> {
    await api.put(`/applications/${id}/supervisor-approve`);
  }
}

export default new ApplicationService();