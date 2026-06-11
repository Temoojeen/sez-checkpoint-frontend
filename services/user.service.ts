import api from './api';
import { User, AccessList } from '@/types';

export interface CreateUserData {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
  organizationId?: string;
  roleId: number;
}

export interface UpdateUserData {
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  organizationId?: string | null;
  roleId?: number;
  isActive?: boolean;
}

class UserService {
  async getAll(): Promise<User[]> {
    const response = await api.get<User[]>('/admin/users');
    return response.data;
  }

  async getById(id: string): Promise<User> {
    const response = await api.get<User>(`/admin/users/${id}`);
    return response.data;
  }

  async create(data: CreateUserData): Promise<User> {
    const payload: CreateUserData = {
      username: data.username,
      password: data.password,
      fullName: data.fullName,
      roleId: Number(data.roleId),
    };

    if (data.email && data.email.trim() !== '') {
      payload.email = data.email.trim();
    }
    if (data.phone && data.phone.trim() !== '') {
      payload.phone = data.phone.trim();
    }
    if (data.organizationId && data.organizationId.trim() !== '') {
      payload.organizationId = data.organizationId;
    }

    console.log('📤 Creating user with payload:', payload);
    const response = await api.post<User>('/admin/users', payload);
    return response.data;
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    // Собираем только те поля, которые переданы
    const payload: Record<string, unknown> = {};

    if (data.fullName !== undefined) payload.fullName = data.fullName;
    if (data.email !== undefined) payload.email = data.email;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.organizationId !== undefined) payload.organizationId = data.organizationId;
    if (data.roleId !== undefined) payload.roleId = Number(data.roleId);
    if (data.isActive !== undefined) payload.isActive = data.isActive;

    console.log('📤 Updating user with payload:', payload);
    const response = await api.put<User>(`/admin/users/${id}`, payload);
    return response.data;
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    await api.put(`/admin/users/${id}/password`, { password: newPassword });
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`);
  }

  async getProfile(): Promise<User> {
    const response = await api.get<User>('/user/profile');
    return response.data;
  }

  async getByOrganization(orgId: string): Promise<User[]> {
  const response = await api.get(`/admin/users?organizationId=${orgId}`);
  return response.data;
}

  async getAvailableLists(): Promise<AccessList[]> {
    try {
      const response = await api.get<AccessList[]>('/user/list-permissions');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching available lists:', error);
      return [];
    }
  }
  async hardDelete(id: string): Promise<void> {
  await api.delete(`/admin/users/${id}/hard`);
}

  async getMyListPermissions(): Promise<AccessList[]> {
    try {
      const response = await api.get<AccessList[]>('/user/list-permissions');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching list permissions:', error);
      return [];
    }
  }
}

const userService = new UserService();
export default userService;