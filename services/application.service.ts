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
  smartParking?: boolean;
}

export interface RejectApplicationData {
  reason?: string;
}

class ApplicationService {
  // Participant endpoints
  async create(data: CreateApplicationData): Promise<Application> {
    // Создаем объект с правильной типизацией
    const payload: {
      plateNumber: string;
      contractNumber: string;
      listId: string;
      smartParking: boolean;
      vehicleBrand?: string;
      vehicleModel?: string;
      vehicleColor?: string;
      validFrom?: string;
      validUntil?: string;
      notes?: string;
    } = {
      plateNumber: data.plateNumber.toUpperCase().trim(),
      contractNumber: data.contractNumber.trim(),
      listId: data.listId,
      smartParking: data.smartParking || false,
    };

    // Добавляем опциональные поля только если они есть
    if (data.vehicleBrand?.trim()) {
      payload.vehicleBrand = data.vehicleBrand.trim();
    }
    if (data.vehicleModel?.trim()) {
      payload.vehicleModel = data.vehicleModel.trim();
    }
    if (data.vehicleColor?.trim()) {
      payload.vehicleColor = data.vehicleColor.trim();
    }
    if (data.validFrom) {
      payload.validFrom = data.validFrom;
    }
    if (data.validUntil) {
      payload.validUntil = data.validUntil;
    }
    if (data.notes?.trim()) {
      payload.notes = data.notes.trim();
    }

    console.log('📤 Creating application with payload:', payload);
    const response = await api.post<Application>('/applications', payload);
    return response.data;
  }

  async getMyApplications(): Promise<Application[]> {
    const response = await api.get<Application[]>('/applications/my');
    return response.data || [];
  }
async deleteMyApplication(id: string): Promise<void> {
  await api.delete(`/applications/${id}`);
}
  // Общий эндпоинт для получения заявки по ID
  async getById(id: string): Promise<Application> {
    const response = await api.get<Application>(`/applications/${id}`);
    return response.data;
  }

  // Operator endpoints (КПП 1)
  async getPendingForOperator(): Promise<Application[]> {
    const response = await api.get<Application[]>('/applications/pending-operator');
    return response.data || [];
  }

  async operatorApprove(id: string): Promise<void> {
    await api.put(`/applications/${id}/operator-approve`);
  }

  async reject(id: string, data?: RejectApplicationData): Promise<void> {
    await api.put(`/applications/${id}/reject`, data || {});
  }

  // SmartParking Operator endpoints (roleId = 6)
  async getPendingForSmartParking(): Promise<Application[]> {
    const response = await api.get<Application[]>('/smartparking/applications/pending');
    return response.data || [];
  }

// SmartParking Operator endpoints
async smartParkingApprove(id: string, parkingId: number): Promise<void> {
  await api.put(`/smartparking/applications/${id}/approve`, { parkingId });
}

  async smartParkingReject(id: string, data?: RejectApplicationData): Promise<void> {
    await api.put(`/smartparking/applications/${id}/reject`, data || {});
  }

  // Supervisor endpoints
  async getPendingForSupervisor(): Promise<Application[]> {
    const response = await api.get<Application[]>('/applications/pending-supervisor');
    return response.data || [];
  }

  async supervisorApprove(id: string): Promise<void> {
    await api.put(`/applications/${id}/supervisor-approve`);
  }

  async supervisorReject(id: string, data?: RejectApplicationData): Promise<void> {
    await api.put(`/applications/${id}/supervisor-reject`, data || {});
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
    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters?.organizationId && filters.organizationId !== 'all') {
      params.append('organizationId', filters.organizationId);
    }
    if (filters?.listId && filters.listId !== 'all') {
      params.append('listId', filters.listId);
    }
    if (filters?.from) {
      params.append('from', filters.from);
    }
    if (filters?.to) {
      params.append('to', filters.to);
    }
    
    const response = await api.get<Application[]>('/admin/applications', { params });
    return response.data || [];
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

  async adminDeleteApplication(id: string): Promise<void> {
    await api.delete(`/admin/applications/${id}`);
  }
  // В application.service.ts добавить:
async deleteSmartParkingApplication(id: string): Promise<void> {
  await api.delete(`/smartparking/applications/${id}`);
}
}


const applicationService = new ApplicationService();
export default applicationService;