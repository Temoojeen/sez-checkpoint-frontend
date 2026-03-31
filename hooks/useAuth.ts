"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import authService from '@/services/auth.service';
import { User } from '@/types';
import { getDashboardPath } from '@/utils/roleRedirect';

interface LoginResult {
  success: boolean;
  error?: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = () => {
      try {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
      const response = await authService.login({ username, password });
      setUser(response.user);
      
      Cookies.set('token', response.token, { 
        expires: 1,
        path: '/',
        sameSite: 'lax'
      });
      
      const dashboardPath = getDashboardPath(response.user.roleId);
      router.push(dashboardPath);
      
      return { success: true };
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.error || 'Неверное имя пользователя или пароль';
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const logout = () => {
    authService.logout();
    Cookies.remove('token', { path: '/' });
    setUser(null);
    router.push('/login');
  };

  const hasRole = (allowedRoles: number[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.roleId);
  };

  return {
    user,
    loading, // Это isLoading
    login,
    logout,
    hasRole,
    isAuthenticated: !!user,
    isAdmin: user?.roleId === 1,
    isOperator: user?.roleId === 2,
    isSupervisor: user?.roleId === 3,
    isParticipant: user?.roleId === 4,
    isSecurity: user?.roleId === 5,
  };
}