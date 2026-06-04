import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import authService from './auth.service';
import Cookies from 'js-cookie';

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://kpp1.sezkhorgos.kz/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('token');
    
    if (token) {
      // Проверяем не истек ли токен перед отправкой
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        
        if (isExpired) {
          // Токен истек - редирект на логин
          Cookies.remove('token', { path: '/' });
          authService.logout();
          window.location.href = '/login';
          return Promise.reject(new Error('Token expired'));
        }
      } catch (e) {
        console.log(e)
        // Невалидный токен
        Cookies.remove('token', { path: '/' });
        authService.logout();
        window.location.href = '/login';
        return Promise.reject(new Error('Invalid token'));
      }
      
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Только если это не повторный запрос
      if (!error.config?._retry) {
        error.config._retry = true;
        
        // Очищаем токен и редиректим
        Cookies.remove('token', { path: '/' });
        authService.logout();
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;