// types/index.ts
export type UserRole = 'admin' | 'user';
export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  organization_name?: string;
  created_at?: string;
  updated_at?: string;
}

