"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Если авторизован, перенаправляем на главную (которая потом перенаправит на дашборд)
      router.push('/');
    }
  }, [isAuthenticated, loading, router]);

  // Показываем children только если не авторизован и не в процессе загрузки
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        Загрузка...
      </div>
    );
  }

  // Если авторизован, не показываем содержимое (будет перенаправление)
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}