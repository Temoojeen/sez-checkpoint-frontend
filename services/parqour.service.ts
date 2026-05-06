import api from './api';

export interface ParqourLocation {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  timeZone: string;
}

export interface ParqourParking {
  id: number;
  name: string;
  description: string;
  sourceId: string;
}

class ParqourService {
  // Получить список локаций
  async getLocations(): Promise<ParqourLocation[]> {
    const response = await api.get<ParqourLocation[]>('/parqour/locations');
    return response.data;
  }

  // Получить список парковок для локации
  async getParkings(locationId: number): Promise<ParqourParking[]> {
    const response = await api.get<ParqourParking[]>(`/parqour/locations/${locationId}/parkings`);
    return response.data;
  }
}

const parqourService = new ParqourService();
export default parqourService;