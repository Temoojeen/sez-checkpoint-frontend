import api from './api';
import { LoginRequest, LoginResponse, User } from '@/types';
import Cookies from 'js-cookie';

class AuthService {
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user';

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('Sending login request:', credentials.username); // для отладки
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      console.log('Login response:', response.data); // для отладки
      
      if (response.data.token) {
        this.setToken(response.data.token);
        this.setUser(response.data.user);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login service error:', error);
      throw error;
    }
  }

  logout(): void {
    Cookies.remove(this.TOKEN_KEY, { path: '/' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.USER_KEY);
    }
  }

  setToken(token: string): void {
    Cookies.set(this.TOKEN_KEY, token, { 
      expires: 1,
      path: '/',
      sameSite: 'lax'
    });
  }

  getToken(): string | undefined {
    return Cookies.get(this.TOKEN_KEY);
  }

  setUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const userStr = localStorage.getItem(this.USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  updateUser(user: User): void {
    this.setUser(user);
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  }
}

export default new AuthService();