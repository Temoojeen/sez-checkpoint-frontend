import api from './api';
import { ApprovedPlate } from '@/types';

export interface AddDirectPlateData {
  plateNumber: string;
  organizationId: string;
  listId: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  validFrom?: string;
  validUntil?: string;
  notes?: string;
}

export interface UpdatePlateData {
  plateNumber?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  listId?: string;
  validFrom?: string;
  validUntil?: string;
  notes?: string;
  isActive?: boolean;
}

export interface CheckPlateResponse {
  exists: boolean;
  plateNumber?: string;
  organizationName?: string;
  listName?: string;
  listType?: string;
  listColor?: string;
  validUntil?: string;
  isActive?: boolean;
  message?: string;
}

class ApprovedPlateService {
  // Для администратора - получение всех утвержденных номеров
  async getAll(): Promise<ApprovedPlate[]> {
    try {
      const response = await api.get<ApprovedPlate[]>('/admin/approved-plates');
      return response.data;
    } catch (error) {
      console.error('Error in getAll:', error);
      return [];
    }
  }

  // Для оператора - получение номеров по списку
  async getByList(listId: string): Promise<ApprovedPlate[]> {
    try {
      const response = await api.get<ApprovedPlate[]>(`/approved-plates/list/${listId}`);
      return response.data;
    } catch (error) {
      console.error('Error in getByList:', error);
      return [];
    }
  }

  // Для администратора - получение номеров по списку
  async getByListAdmin(listId: string): Promise<ApprovedPlate[]> {
    try {
      const response = await api.get<ApprovedPlate[]>(`/admin/approved-plates/list/${listId}`);
      return response.data;
    } catch (error) {
      console.error('Error in getByListAdmin:', error);
      return [];
    }
  }

  // Прямое добавление номера (только для админа)
  async addDirect(data: AddDirectPlateData): Promise<ApprovedPlate> {
    try {
      const response = await api.post<ApprovedPlate>('/admin/approved-plates/direct', data);
      return response.data;
    } catch (error) {
      console.error('Error in addDirect:', error);
      throw error;
    }
  }

  // Обновление номера (только для админа)
  async update(id: string, data: UpdatePlateData): Promise<ApprovedPlate> {
    try {
      const response = await api.put<ApprovedPlate>(`/admin/approved-plates/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  }

  // Удаление номера с указанием причины (для участника)
  async delete(id: string, reason?: string): Promise<void> {
    try {
      await api.delete(`/approved-plates/${id}`, { data: { reason } });
    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  }

  // Полное удаление номера (только для админа)
  async hardDelete(id: string): Promise<void> {
    try {
      await api.delete(`/admin/approved-plates/${id}`);
    } catch (error) {
      console.error('Error in hardDelete:', error);
      throw error;
    }
  }

  // Мягкое удаление (деактивация)
  async deactivate(id: string): Promise<void> {
    try {
      await api.put(`/admin/approved-plates/${id}/deactivate`);
    } catch (error) {
      console.error('Error in deactivate:', error);
      throw error;
    }
  }

  // Проверка номера (для охраны)
  async checkPlate(plateNumber: string): Promise<CheckPlateResponse> {
    try {
      const response = await api.get<CheckPlateResponse>(`/security/check-plate/${plateNumber}`);
      return response.data;
    } catch (error) {
      console.error('Error in checkPlate:', error);
      throw error;
    }
  }
}

const approvedPlateService = new ApprovedPlateService();
export default approvedPlateService;