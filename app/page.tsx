'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPath } from '@/utils/roleRedirect';

export default function HomePage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user) {
        // Перенаправляем на соответствующий дашборд
        const dashboardPath = getDashboardPath(user.roleId);
        router.push(dashboardPath);
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, loading, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Перенаправление...</p>
      </div>
    </div>
  );
}