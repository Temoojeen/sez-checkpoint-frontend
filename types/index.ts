export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  organizationId?: string | null;
  organizationName?: string;
  roleId: number;
  roleName?: string;
  isActive: boolean;
  lastLogin?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt?: string;
  hasPermission?: boolean; // Добавляем поле для прав доступа к спискам
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Organization {
  id: string;
  name: string;
  bin: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  organizationId: string;
  organizationName?: string;
  contractDate: string;
  validFrom: string;
  validUntil?: string;
  contractType: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface Application {
  id: string;
  plateNumber: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  contractId?: string;
  contractNumber?: string;
  organizationId?: string;
  organizationName?: string;
  listId: string;
  listName?: string;
  applicantId: string;
  applicantName?: string;
  status: 'pending' | 'operator_approved' | 'supervisor_approved' | 'rejected';
  destination: 'kpp1' | 'smartparking'; // Добавлено
  operatorId?: string;
  supervisorId?: string;
  operatorApprovedAt?: string;
  supervisorApprovedAt?: string;
  rejectedAt?: string;
  rejectReason?: string;
  validFrom?: string;
  validUntil?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessList {
  id: string;
  name: string;
  description?: string;
  listType?: 'white' | 'black' | 'vip' | 'temporary';
  color?: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

export interface ApprovedPlate {
  id: string;
  plateNumber: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  contractId?: string;
  organizationId?: string;
  organizationName?: string;
  listId: string;
  listName?: string;
  listType?: string;
  applicationId?: string;  // Добавляем поле applicationId
  approvedBy?: string;      // Добавляем поле approvedBy (ID пользователя)
  approvedByName?: string;  // Добавляем имя утвердившего
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AccessLog {
  id: string;
  plateNumber: string;
  organizationName?: string;
  listName?: string;
  imagePath?: string;
  accessGranted: boolean;
  cameraId?: string;
  cameraLocation?: string;
  createdAt: string;
}

// Добавляем CheckPlateResponse
export interface CheckPlateResponse {
  exists: boolean;
  plateNumber?: string;
  organizationName?: string;
  listName?: string;
  listType?: string;
  listColor?: string;  // Добавляем цвет списка
  validUntil?: string;
  isActive?: boolean;
  message?: string;
}

export interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
    status?: number;
  };
  message?: string;
}

// Создание
export interface CreateUserData {
  username: string;
  password: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  organizationId?: string | null;
  roleId: number;
}
export interface CreateApplicationRequest {
  plateNumber: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  contractNumber: string;
  listId: string;
  validFrom?: string;
  validUntil?: string;
  notes?: string;
  smartParking?: boolean; // Добавлено
}
export interface CreateOrganizationData {
  name: string;
  bin: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface CreateContractData {
  contractNumber: string;
  organizationId: string;
  contractDate: string;
  validFrom: string;
  validUntil?: string;
  contractType: string;
  notes?: string;
}

export interface CreateAccessListData {
  name: string;
  description?: string;
  listType?: 'white' | 'black' | 'vip' | 'temporary';
  color?: string;
  priority?: number;
}

// Обновление
export interface UpdateUserData {
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  organizationId?: string | null;
  roleId?: number;
  isActive?: boolean;
}

export interface UpdateOrganizationData {
  name?: string;
  bin?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface UpdateContractData {
  contractNumber?: string;
  organizationId?: string;
  contractDate?: string;
  validFrom?: string;
  validUntil?: string;
  contractType?: string;
  status?: string;
  notes?: string;
}

export interface UpdateAccessListData {
  name?: string;
  description?: string;
  listType?: 'white' | 'black' | 'vip' | 'temporary';
  color?: string;
  priority?: number;
  isActive?: boolean;
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