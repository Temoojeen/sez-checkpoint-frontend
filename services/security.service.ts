import api from './api';
import { AccessLog } from '@/types';

class SecurityService {
  async getRecentLogs(limit: number = 5): Promise<AccessLog[]> {
    const response = await api.get('/security/recent-logs');
    return response.data;
  }

  async getStatistics(from?: string, to?: string): Promise<{
    period: { from: string; to: string };
    statistics: { total: number; granted: number; denied: number };
    logs: AccessLog[];
  }> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    const response = await api.get('/security/statistics', { params });
    return response.data;
  }

  async getLogsByPlate(plateNumber: string): Promise<AccessLog[]> {
    const response = await api.get(`/security/logs/plate/${plateNumber}`);
    return response.data;
  }
}

export default new SecurityService();