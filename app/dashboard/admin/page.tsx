"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import organizationService from '@/services/organization.service';
import userService from '@/services/user.service';
// import applicationService from '@/services/application.service'; // Временно убираем
import { Organization, User } from '@/types';
import { getRoleName } from '@/utils/roleRedirect';
import { formatDate } from '@/utils/format';

// Временный тип для заявок, пока не создан правильный сервис
interface TempApplication {
  id: string;
  plateNumber: string;
  organizationName?: string;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    organizations: 0,
    users: 0,
    applications: 0,
    pendingApplications: 0,
  });
  const [recentOrganizations, setRecentOrganizations] = useState<Organization[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentApplications, setRecentApplications] = useState<TempApplication[]>([]);

  useEffect(() => {
    if (user?.roleId !== 1) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Загружаем организации и пользователей
      const [orgs, users] = await Promise.all([
        organizationService.getAll(),
        userService.getAll(),
      ]);

      setRecentOrganizations(orgs.slice(0, 5));
      setRecentUsers(users.slice(0, 5));

      // Временные данные для заявок, пока нет бэкенда
      const tempApplications: TempApplication[] = [];
      
      setRecentApplications(tempApplications);

      setStats({
        organizations: orgs.length,
        users: users.length,
        applications: 0, // Временно 0
        pendingApplications: 0, // Временно 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Ожидает', color: 'yellow' };
      case 'operator_approved':
        return { text: 'Одобрено оператором', color: 'blue' };
      case 'supervisor_approved':
        return { text: 'Утверждено', color: 'green' };
      case 'rejected':
        return { text: 'Отклонено', color: 'red' };
      default:
        return { text: status, color: 'gray' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка панели администратора...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Верхняя панель */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Панель администратора
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Добро пожаловать, {user?.fullName || user?.username}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                Администратор
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Организации</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.organizations}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-building-4-line text-2xl text-blue-600"></i>
              </div>
            </div>
            <Link 
              href="/admin/organizations" 
              className="mt-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              Управлять организациями
              <i className="ri-arrow-right-line ml-1"></i>
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Пользователи</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.users}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-user-line text-2xl text-green-600"></i>
              </div>
            </div>
            <Link 
              href="/admin/users" 
              className="mt-4 inline-flex items-center text-sm text-green-600 hover:text-green-800"
            >
              Управлять пользователями
              <i className="ri-arrow-right-line ml-1"></i>
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Всего заявок</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.applications}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="ri-file-list-3-line text-2xl text-orange-600"></i>
              </div>
            </div>
            <Link 
              href="/admin/applications" 
              className="mt-4 inline-flex items-center text-sm text-orange-600 hover:text-orange-800"
            >
              Просмотреть заявки
              <i className="ri-arrow-right-line ml-1"></i>
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ожидают</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingApplications}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <i className="ri-time-line text-2xl text-yellow-600"></i>
              </div>
            </div>
            <Link 
              href="/admin/applications?status=pending" 
              className="mt-4 inline-flex items-center text-sm text-yellow-600 hover:text-yellow-800"
            >
              Обработать
              <i className="ri-arrow-right-line ml-1"></i>
            </Link>
          </div>
        </div>

        {/* Быстрые действия */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/admin/organizations/new"
              className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i className="ri-building-4-line text-2xl text-gray-700 mb-2"></i>
              <span className="text-sm font-medium text-gray-700">Новая организация</span>
            </Link>
            <Link
              href="/admin/users/new"
              className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i className="ri-user-add-line text-2xl text-gray-700 mb-2"></i>
              <span className="text-sm font-medium text-gray-700">Новый пользователь</span>
            </Link>
            <Link
              href="/admin/contracts/new"
              className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i className="ri-file-copy-line text-2xl text-gray-700 mb-2"></i>
              <span className="text-sm font-medium text-gray-700">Новый договор</span>
            </Link>
            <Link
              href="/admin/access-lists/new"
              className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i className="ri-list-check-3 text-2xl text-gray-700 mb-2"></i>
              <span className="text-sm font-medium text-gray-700">Новый список</span>
            </Link>
          </div>
        </div>

        {/* Таблицы с последними данными */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Последние организации */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Последние организации</h2>
              <Link href="/admin/organizations" className="text-sm text-blue-600 hover:text-blue-800">
                Все организации
              </Link>
            </div>
            <div className="space-y-3">
              {recentOrganizations.length > 0 ? (
                recentOrganizations.map((org) => (
                  <Link
                    key={org.id}
                    href={`/admin/organizations/${org.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{org.name}</p>
                        <p className="text-sm text-gray-600">БИН: {org.bin}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(org.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Нет организаций</p>
              )}
            </div>
          </div>

          {/* Последние пользователи */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Последние пользователи</h2>
              <Link href="/admin/users" className="text-sm text-blue-600 hover:text-blue-800">
                Все пользователи
              </Link>
            </div>
            <div className="space-y-3">
              {recentUsers.length > 0 ? (
                recentUsers.map((userItem) => (
                  <Link
                    key={userItem.id}
                    href={`/admin/users/${userItem.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{userItem.fullName}</p>
                        <p className="text-sm text-gray-600">
                          {userItem.username} • {getRoleName(userItem.roleId)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(userItem.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Нет пользователей</p>
              )}
            </div>
          </div>

          {/* Последние заявки */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Последние заявки</h2>
              <Link href="/admin/applications" className="text-sm text-blue-600 hover:text-blue-800">
                Все заявки
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-600 border-b">
                    <th className="pb-3">Номер</th>
                    <th className="pb-3">Организация</th>
                    <th className="pb-3">Статус</th>
                    <th className="pb-3">Дата</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recentApplications?.length > 0 ? (
                    recentApplications.map((app) => {
                      const status = getStatusBadge(app.status);
                      return (
                        <tr key={app.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-3 font-mono">{app.plateNumber}</td>
                          <td className="py-3">{app.organizationName || '—'}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${status.color}-100 text-${status.color}-800`}>
                              {status.text}
                            </span>
                          </td>
                          <td className="py-3 text-gray-600">{formatDate(app.createdAt)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        Нет заявок
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}