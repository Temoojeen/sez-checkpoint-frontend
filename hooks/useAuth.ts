"use client";

import { useEffect, useState, useCallback } from 'react';
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
        
        // Проверяем, есть ли токен и не истек ли он
        const token = Cookies.get('token');
        if (!token && currentUser) {
          // Токена нет, но пользователь есть в памяти - очищаем
          authService.logout();
          setUser(null);
          setLoading(false);
          router.push('/login');
          return;
        }
        
        // Проверяем не истек ли токен
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const isExpired = payload.exp * 1000 < Date.now();
            
            if (isExpired) {
              // Токен истек - очищаем все
              console.log('🕐 Токен истек, выполняем выход');
              Cookies.remove('token', { path: '/' });
              authService.logout();
              setUser(null);
              setLoading(false);
              router.push('/login');
              return;
            }
          } catch (e) {
            console.log(e)
            // Невалидный токен
            console.error('Невалидный токен');
            Cookies.remove('token', { path: '/' });
            authService.logout();
            setUser(null);
            setLoading(false);
            router.push('/login');
            return;
          }
        }
        
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

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

  const logout = useCallback(() => {
    authService.logout();
    Cookies.remove('token', { path: '/' });
    setUser(null);
    router.push('/login');
  }, [router]);

  const hasRole = (allowedRoles: number[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.roleId);
  };

  return {
    user,
    loading,
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