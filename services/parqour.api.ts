// services/parqour.api.ts
import axios from 'axios';

const API_BASE_URL = 'https://api.parqour.app/wlapp/api/v1';

export interface Location {
  id: number;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  timeZone?: string;
}

export interface Parking {
  id: number;
  name: string;
  description?: string;
  sourceId?: string;
  locationId?: number;
}

export interface WhitelistGroup {
  id: number;
  name: string;
  description?: string;
  carCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PeriodAccessRequest {
  plateNumber: string;
  accessStart: string;
  durationMinutes: number;
}

export interface AccessResponse {
  success?: boolean;
  message?: string;
  externalId?: string;
  accessEnd?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface PaginatedResponse<T> {
  content: T[];
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  page?: number; // для совместимости с вашим ответом
}

export interface WhitelistGroup {
  id: number;
  name: string;
  parkingId: number;
  description?: string;
  carCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

class ParqourAPI {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password,
    });
    
    this.accessToken = response.data.accessToken;
    this.refreshToken = response.data.refreshToken;
    
    return response.data;
  }

  async getLocations(): Promise<Location[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.get(`${API_BASE_URL}/locations`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    
    return response.data;
  }

  async getParkingsByLocation(locationId: number): Promise<Parking[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.get(`${API_BASE_URL}/locations/${locationId}/parkings`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    
    return response.data;
  }

async getWhitelistGroups(parkingId: number, page: number = 0, size: number = 20): Promise<PaginatedResponse<WhitelistGroup>> {
  if (!this.accessToken) {
    throw new Error('Not authenticated');
  }

  const response = await axios.get(`${API_BASE_URL}/parkings/${parkingId}/whitelist/groups`, {
    params: { page, size },
    headers: {
      'Authorization': `Bearer ${this.accessToken}`
    }
  });
  
  return response.data;
}

  async addCarToGroup(parkingId: number, groupId: number, plateNumber: string): Promise<AccessResponse> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.post(
      `${API_BASE_URL}/parkings/${parkingId}/whitelist/groups/${groupId}/cars`,
      { plateNumber },
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  }

  async addPeriodAccess(
    parkingId: number, 
    plateNumber: string, 
    durationMinutes: number = 43200
  ): Promise<AccessResponse> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const requestBody: PeriodAccessRequest = {
      plateNumber: plateNumber,
      accessStart: new Date().toISOString(),
      durationMinutes: durationMinutes
    };

    const response = await axios.post(
      `${API_BASE_URL}/parkings/${parkingId}/whitelist/access/period`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  }

  async addUnlimitedAccess(parkingId: number, plateNumber: string): Promise<AccessResponse> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.post(
      `${API_BASE_URL}/parkings/${parkingId}/whitelist/access/unlimited`,
      { plateNumber },
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

export const parqourAPI = new ParqourAPI();