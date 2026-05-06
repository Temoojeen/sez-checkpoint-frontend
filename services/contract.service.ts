import api from './api';
import { Contract, CreateContractData } from '@/types';

class ContractService {
  async getAll(): Promise<Contract[]> {
    const response = await api.get<Contract[]>('/admin/contracts');
    return response.data;
  }

  async getByOrganization(organizationId: string): Promise<Contract[]> {
    const response = await api.get<Contract[]>(`/admin/organizations/${organizationId}/contracts`);
    return response.data;
  }

  async getById(id: string): Promise<Contract> {
    const response = await api.get<Contract>(`/admin/contracts/${id}`);
    return response.data;
  }

  async create(data: CreateContractData): Promise<Contract> {
    const response = await api.post<Contract>('/admin/contracts', data);
    return response.data;
  }

  async update(id: string, data: Partial<Contract>): Promise<Contract> {
    console.log('Updating contract with data:', data); // Для отладки
    const response = await api.put<Contract>(`/admin/contracts/${id}`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/admin/contracts/${id}`);
  }
}

const contractService = new ContractService();
export default contractService;