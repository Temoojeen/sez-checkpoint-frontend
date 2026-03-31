"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    {
      name: 'Дашборд',
      href: '/admin',
      icon: 'ri-dashboard-line',
    },
    {
      name: 'Организации',
      href: '/admin/organizations',
      icon: 'ri-building-4-line',
    },
    {
      name: 'Пользователи',
      href: '/admin/users',
      icon: 'ri-user-settings-line',
    },
    {
      name: 'Договоры',
      href: '/admin/contracts',
      icon: 'ri-file-copy-line',
    },
    {
      name: 'Списки доступа',
      href: '/admin/access-lists',
      icon: 'ri-list-check-3',
    },
    {
      name: 'Заявки',
      href: '/admin/applications',
      icon: 'ri-file-list-3-line',
    },
    {
      name: 'Утвержденные номера',
      href: '/admin/approved-plates',
      icon: 'ri-car-line',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Мобильное меню */}
      <div className="lg:hidden">
        <div className="fixed top-0 left-0 right-0 bg-white border-b z-20 px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">SEZ Checkpoint</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <i className={`ri-${sidebarOpen ? 'close-line' : 'menu-line'} text-2xl`}></i>
          </button>
        </div>

        {/* Мобильное боковое меню */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setSidebarOpen(false)}>
            <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b">
                <h2 className="font-semibold text-gray-900">{user?.fullName || user?.username}</h2>
                <p className="text-sm text-gray-600 mt-1">Администратор</p>
              </div>
              <nav className="p-4">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <i className={`${item.icon} text-xl`}></i>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                ))}
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 mt-4"
                >
                  <i className="ri-logout-box-line text-xl"></i>
                  <span className="font-medium">Выйти</span>
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Десктопное боковое меню */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white border-r">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-6 mb-6">
              <h1 className="text-xl font-bold text-gray-900">SEZ Checkpoint</h1>
            </div>
            <div className="px-4 mb-6">
              <p className="text-sm font-medium text-gray-500">Администратор</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{user?.fullName || user?.username}</p>
            </div>
            <nav className="flex-1 px-4 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <i className={`${item.icon} text-xl`}></i>
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </nav>
            <div className="px-4 mt-6">
              <button
                onClick={logout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <i className="ri-logout-box-line text-xl"></i>
                <span className="font-medium">Выйти</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="lg:pl-64">
        <main className="py-6 px-4 sm:px-6 lg:px-8 mt-14 lg:mt-0">
          {children}
        </main>
      </div>
    </div>
  );
}