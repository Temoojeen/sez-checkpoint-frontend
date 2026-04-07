"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import organizationService from '@/services/organization.service';
import userService from '@/services/user.service';
import { Organization, User } from '@/types';
import { getRoleName } from '@/utils/roleRedirect';
import { formatDate } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

// Временный тип для заявок
interface TempApplication {
  id: string;
  plateNumber: string;
  organizationName?: string;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [stats, setStats] = useState({
    organizations: 0,
    users: 0,
    applications: 0,
    pendingApplications: 0,
  });
  const [recentOrganizations, setRecentOrganizations] = useState<Organization[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentApplications, setRecentApplications] = useState<TempApplication[]>([]);
  const [authChecked, setAuthChecked] = useState(false);

  // Проверка авторизации и прав доступа
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }
      console.log(recentApplications)
      
      if (user.roleId !== 1) {
        toast.error('У вас нет доступа к этой странице');
        router.push('/');
        return;
      }
      
      setAuthChecked(true);
    }
  }, [user, loading, router]);

  // Загрузка данных только после проверки авторизации
  useEffect(() => {
    if (authChecked && !dataLoaded) {
      fetchDashboardData();
    }
  }, [authChecked, dataLoaded]);

  const fetchDashboardData = async () => {
    try {
      setPageLoading(true);
      
      // Загружаем организации и пользователей
      const [orgs, users] = await Promise.all([
        organizationService.getAll(),
        userService.getAll(),
      ]);

      console.log('Organizations:', orgs);
      console.log('Users:', users);

      // Проверяем, что данные не null и имеют метод slice
      if (orgs && Array.isArray(orgs)) {
        setRecentOrganizations(orgs.slice(0, 5));
      } else {
        setRecentOrganizations([]);
      }
      
      if (users && Array.isArray(users)) {
        setRecentUsers(users.slice(0, 5));
      } else {
        setRecentUsers([]);
      }

      // Временные данные для заявок
      setRecentApplications([]);

      setStats({
        organizations: orgs?.length || 0,
        users: users?.length || 0,
        applications: 0,
        pendingApplications: 0,
      });
      
      setDataLoaded(true);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setPageLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (loading || !authChecked) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка панели администратора...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Верхняя панель */}
      <Header role='admin'/>

      <main className={styles.main}>
        {/* Статистика */}
        <div className={styles.title}>
          Панель управления
        </div>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div>
                <p className={styles.statLabel}>Организации</p>
                <p className={styles.statValue}>{stats.organizations}</p>
              </div>
              <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
                <i className="ri-building-4-line"></i>
              </div>
            </div>
            
            <Link
  href="/admin/approved-plates"
  className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
>
</Link>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div>
                <p className={styles.statLabel}>Пользователи</p>
                <p className={styles.statValue}>{stats.users}</p>
              </div>
              <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
                <i className="ri-user-line"></i>
              </div>
            </div>
            
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div>
                <p className={styles.statLabel}>Всего заявок</p>
                <p className={styles.statValue}>{stats.applications}</p>
              </div>
              <div className={`${styles.statIcon} ${styles.statIconOrange}`}>
                <i className="ri-file-list-3-line"></i>
              </div>
            </div>
            
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div>
                <p className={styles.statLabel}>Ожидают</p>
                <p className={styles.statValue}>{stats.pendingApplications}</p>
              </div>
              <div className={`${styles.statIcon} ${styles.statIconYellow}`}>
                <i className="ri-time-line"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Быстрые действия */}
        <div className={styles.quickActions}>
          <h2 className={styles.sectionTitle}>Быстрые действия</h2>
          <div className={styles.actionsGrid}>
            <Link
              href="/admin/organizations/"
              className={styles.actionCard}
            >
              <i className={`ri-building-4-line ${styles.actionIcon}`}></i>
              <span className={styles.actionText}>Организации</span>
            </Link>
            <Link
              href="/admin/users/"
              className={styles.actionCard}
            >
              <i className={`ri-user-add-line ${styles.actionIcon}`}></i>
              <span className={styles.actionText}>Пользователи</span>
            </Link>
            <Link
              href="/admin/contracts/"
              className={styles.actionCard}
            >
              <i className={`ri-file-copy-line ${styles.actionIcon}`}></i>
              <span className={styles.actionText}>Договора</span>
            </Link>
            <Link
              href="/admin/access-lists/"
              className={styles.actionCard}
            >
              <i className={`ri-list-check-3 ${styles.actionIcon}`}></i>
              <span className={styles.actionText}>Списки</span>
            </Link>
            <Link
              href="/admin/access-logs/"
              className={styles.actionCard}
            >
              <i className={`ri-list-check-3 ${styles.actionIcon}`}></i>
              <span className={styles.actionText}>История</span>
            </Link>
            <Link
              href="admin/applications"
              className={styles.actionCard}
            >
              <i className={`ri-list-check-3 ${styles.actionIcon}`}></i>
              <span className={styles.actionText}>Заявки</span>
            </Link>
            <Link
              href="admin/approved-plates"
              className={styles.actionCard}
            >
              <i className={`ri-list-check-3 ${styles.actionIcon}`}></i>
              <span className={styles.actionText}>Номера</span>
            </Link>
          </div>
        </div>

        {/* Таблицы с последними данными */}
        <div className={styles.dataGrid}>
          {/* Последние организации */}
          <div className={styles.dataCard}>
            <div className={styles.dataHeader}>
              <h2 className={styles.dataTitle}>Последние организации</h2>
              <Link href="/admin/organizations" className={styles.dataLink}>
                Все организации
              </Link>
            </div>
            <div className={styles.dataList}>
              {recentOrganizations.length > 0 ? (
                recentOrganizations.map((org) => (
                  <Link
                    key={org.id}
                    href={`/admin/organizations/${org.id}`}
                    className={styles.dataItem}
                  >
                    <div className={styles.itemContent}>
                      <div className={styles.itemInfo}>
                        <p className={styles.itemTitle}>{org.name}</p>
                        <p className={styles.itemSubtitle}>БИН: {org.bin}</p>
                      </div>
                      <span className={styles.itemDate}>
                        {formatDate(org.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className={styles.emptyState}>Нет организаций</p>
              )}
            </div>
          </div>

          {/* Последние пользователи */}
          <div className={styles.dataCard}>
            <div className={styles.dataHeader}>
              <h2 className={styles.dataTitle}>Последние пользователи</h2>
              <Link href="/admin/users" className={styles.dataLink}>
                Все пользователи
              </Link>
            </div>
            <div className={styles.dataList}>
              {recentUsers.length > 0 ? (
                recentUsers.map((userItem) => (
                  <Link
                    key={userItem.id}
                    href={`/admin/users/${userItem.id}`}
                    className={styles.dataItem}
                  >
                    <div className={styles.itemContent}>
                      <div className={styles.itemInfo}>
                        <p className={styles.itemTitle}>{userItem.fullName}</p>
                        <p className={styles.itemSubtitle}>
                          {userItem.username} • {getRoleName(userItem.roleId)}
                        </p>
                      </div>
                      <span className={styles.itemDate}>
                        {formatDate(userItem.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className={styles.emptyState}>Нет пользователей</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}