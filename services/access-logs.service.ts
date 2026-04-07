import api from './api';
import { AccessLog } from '@/types';

export interface AccessLogsResponse {
  logs: AccessLog[];
  total: number;
  period: {
    from: string;
    to: string;
  };
}

const accessLogsService = {
  // Получение всех логов с фильтрацией по датам и номеру
  getAll: async (from?: string, to?: string, plateNumber?: string): Promise<AccessLogsResponse> => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (plateNumber) params.append('plateNumber', plateNumber);
    
    const queryString = params.toString();
    const url = `/admin/access-logs${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  },
  
  // Получение логов за сегодня
  getToday: async (): Promise<AccessLogsResponse> => {
    const today = new Date().toISOString().split('T')[0];
    return accessLogsService.getAll(today, today);
  },
  
  // Получение логов за последние N дней
  getLastDays: async (days: number): Promise<AccessLogsResponse> => {
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return accessLogsService.getAll(from, to);
  },
};

export default accessLogsService;