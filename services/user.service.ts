import api from './api';
import { User, CreateUserData, UpdateUserData, AccessList } from '@/types';

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
    const response = await api.post<User>('/admin/users', data);
    return response.data;
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const response = await api.put<User>(`/admin/users/${id}`, data);
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

  async getAvailableLists(): Promise<AccessList[]> {
    try {
      const response = await api.get<AccessList[]>('/access-lists');
      // Если ответ успешный, но данные пустые, возвращаем пустой массив
      return response.data || [];
    } catch (error) {
      console.error('Error fetching available lists:', error);
      // В случае ошибки возвращаем пустой массив, чтобы не ломать интерфейс
      return [];
    }
  }
}

export default new UserService();