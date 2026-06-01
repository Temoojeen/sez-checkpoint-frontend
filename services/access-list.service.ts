import api from './api';
import { AccessList, CreateAccessListData, UpdateAccessListData } from '@/types';

// Create a type for the update payload to avoid using any
type UpdateAccessListPayload = {
  name?: string;
  description?: string;
  color?: string;
  priority?: number;
  isActive?: boolean;
};

class AccessListService {
  // Для администратора - получение всех списков
  async getAll(): Promise<AccessList[]> {
    try {
      const response = await api.get<AccessList[]>('/admin/access-lists');
      return response.data;
    } catch (error) {
      console.error('Error in getAll:', error);
      return [];
    }
  }

  // Для оператора и участников - публичный эндпоинт
  async getAllPublic(): Promise<AccessList[]> {
    try {
      const response = await api.get<AccessList[]>('/access-lists');
      return response.data;
    } catch (error) {
      console.error('Error in getAllPublic:', error);
      return [];
    }
  }

  async getById(id: string): Promise<AccessList> {
    const response = await api.get<AccessList>(`/admin/access-lists/${id}`);
    return response.data;
  }

  async create(data: CreateAccessListData): Promise<AccessList> {
    const payload = {
      name: data.name,
      description: data.description || '',
      color: data.color || '',
      priority: data.priority || 0,
    };
    
    const response = await api.post<AccessList>('/admin/access-lists', payload);
    return response.data;
  }

  async update(id: string, data: UpdateAccessListData): Promise<AccessList> {
    const payload: UpdateAccessListPayload = {};
    
    if (data.name !== undefined) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;
    if (data.color !== undefined) payload.color = data.color;
    if (data.priority !== undefined) payload.priority = data.priority;
    if (data.isActive !== undefined) payload.isActive = data.isActive;
    
    const response = await api.put<AccessList>(`/admin/access-lists/${id}`, payload);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/admin/access-lists/${id}`);
  }

  async hardDelete(id: string): Promise<void> {
    await api.delete(`/admin/access-lists/${id}/hard`);
  }

  // Для администратора - получение прав пользователя
  async getUserPermissions(userId: string): Promise<AccessList[]> {
    try {
      const response = await api.get<AccessList[]>(`/admin/users/${userId}/list-permissions`);
      return response.data;
    } catch (error) {
      console.error('Error in getUserPermissions:', error);
      return [];
    }
  }

  // ДЛЯ УЧАСТНИКА - получение своих прав
  async getMyPermissions(): Promise<AccessList[]> {
    try {
      const response = await api.get<AccessList[]>('/user/list-permissions');
      return response.data;
    } catch (error) {
      console.error('Error in getMyPermissions:', error);
      return [];
    }
  }

  async addUserPermission(userId: string, listId: string): Promise<void> {
    await api.post(`/admin/users/${userId}/list-permissions`, { listId });
  }

  async removeUserPermission(userId: string, listId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}/list-permissions/${listId}`);
  }
}

// Create instance and assign to variable before exporting
const accessListService = new AccessListService();
export default accessListService;