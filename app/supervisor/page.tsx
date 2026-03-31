"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import applicationService from '@/services/application.service';
import { Application, ApiError } from '@/types';
import { formatDate, getStatusBadge } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function SupervisorPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // Проверка роли
  useEffect(() => {
    if (user && user.roleId !== 3) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  // Загрузка данных
  useEffect(() => {
    if (user && user.roleId === 3 && !dataLoaded) {
      fetchApplications();
    }
  }, [user, dataLoaded]);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      
      // Загружаем заявки, ожидающие руководителя (одобренные оператором)
      const pendingApps = await applicationService.getPendingForSupervisor();
      
      // Проверяем, что данные существуют и являются массивом
      const safeApplications = Array.isArray(pendingApps) ? pendingApps : [];
      setApplications(safeApplications);
      
      // Обновляем статистику - только для отображения
      setStats({
        total: safeApplications.length,
        pending: safeApplications.length,
        approved: 0, // Будет обновляться после утверждения
        rejected: 0, // Будет обновляться после отклонения
      });
      
      setDataLoaded(true);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Ошибка при загрузке заявок');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleApprove = async (applicationId: string) => {
    try {
      setProcessing(applicationId);
      
      await applicationService.supervisorApprove(applicationId);
      
      toast.success('Заявка утверждена. Номер добавлен в список пропусков');
      
      // Обновляем список
      await fetchApplications();
      
      // Обновляем статистику
      setStats(prev => ({
        ...prev,
        approved: prev.approved + 1,
        pending: prev.pending - 1,
      }));
      
    } catch (error: unknown) {
      console.error('Error approving application:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        if (apiError.response?.data?.error) {
          toast.error(apiError.response.data.error);
        } else {
          toast.error('Ошибка при утверждении заявки');
        }
      } else {
        toast.error('Ошибка при утверждении заявки');
      }
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    try {
      setProcessing(applicationId);
      
      await applicationService.reject(applicationId, {
        reason: 'Отклонено руководителем',
      });
      
      toast.success('Заявка отклонена');
      
      // Обновляем список
      await fetchApplications();
      
      // Обновляем статистику
      setStats(prev => ({
        ...prev,
        rejected: prev.rejected + 1,
        pending: prev.pending - 1,
      }));
      
    } catch (error: unknown) {
      console.error('Error rejecting application:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        if (apiError.response?.data?.error) {
          toast.error(apiError.response.data.error);
        } else {
          toast.error('Ошибка при отклонении заявки');
        }
      } else {
        toast.error('Ошибка при отклонении заявки');
      }
    } finally {
      setProcessing(null);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка заявок...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header role='supervisor'/>
      {/* Верхняя панель */}
      {/* <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>Панель руководителя</h1>
            <p className={styles.subtitle}>
              Добро пожаловать, {user?.fullName || user?.username}
            </p>
          </div>
          <div className={styles.userInfo}>
            <span className={styles.roleBadge}>
              Руководитель
            </span>
            <button
              onClick={handleLogout}
              className={styles.logoutButton}
            >
              <i className="ri-logout-box-line"></i>
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </header> */}

      <main className={styles.main}>
        {/* Статистика */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
              <i className="ri-file-list-3-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Ожидают утверждения</p>
              <p className={styles.statValue}>{stats.pending}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
              <i className="ri-checkbox-circle-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Утверждено</p>
              <p className={styles.statValue}>{stats.approved}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <i className="ri-close-circle-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Отклонено</p>
              <p className={styles.statValue}>{stats.rejected}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
              <i className="ri-time-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Всего заявок</p>
              <p className={styles.statValue}>{stats.pending + stats.approved + stats.rejected}</p>
            </div>
          </div>
        </div>

        {/* Список заявок */}
        <div className={styles.applicationsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <i className="ri-file-list-3-line"></i>
              Заявки на утверждение
            </h2>
            <button
              onClick={fetchApplications}
              className={styles.refreshButton}
              disabled={loading}
            >
              <i className={`ri-refresh-line ${loading ? 'ri-spin' : ''}`}></i>
              <span>Обновить</span>
            </button>
          </div>

          {applications?.length > 0 ? (
            <div className={styles.applicationsList}>
              {applications.map((app) => {
                const status = getStatusBadge(app.status);
                return (
                  <div key={app.id} className={styles.applicationCard}>
                    <div className={styles.applicationHeader}>
                      <div className={styles.applicationTitle}>
                        <span className={styles.plateNumber}>{app.plateNumber}</span>
                        <span className={`${styles.statusBadge} ${styles[`status${status.color}`]}`}>
                          {status.text}
                        </span>
                      </div>
                      <span className={styles.applicationDate}>
                        {formatDate(app.createdAt)}
                      </span>
                    </div>

                    <div className={styles.applicationDetails}>
                      <div className={styles.detailRow}>
                        <i className="ri-building-4-line"></i>
                        <span>{app.organizationName || 'Не указана'}</span>
                      </div>
                      
                      <div className={styles.detailRow}>
                        <i className="ri-file-copy-line"></i>
                        <span>Договор: {app.contractNumber || 'Не указан'}</span>
                      </div>
                      
                      <div className={styles.detailRow}>
                        <i className="ri-list-check-3"></i>
                        <span>Список: {app.listName || 'Не указан'}</span>
                      </div>
                      
                      <div className={styles.detailRow}>
                        <i className="ri-user-line"></i>
                        <span>Заявитель: {app.applicantName || 'Не указан'}</span>
                      </div>
                      
                      {(app.vehicleBrand || app.vehicleModel) && (
                        <div className={styles.detailRow}>
                          <i className="ri-car-line"></i>
                          <span>
                            {app.vehicleBrand} {app.vehicleModel}
                            {app.vehicleColor && ` (${app.vehicleColor})`}
                          </span>
                        </div>
                      )}
                      
                      {app.validUntil && (
                        <div className={styles.detailRow}>
                          <i className="ri-calendar-line"></i>
                          <span>Действует до: {formatDate(app.validUntil)}</span>
                        </div>
                      )}
                      
                      {app.notes && (
                        <div className={styles.detailRow}>
                          <i className="ri-file-text-line"></i>
                          <span className={styles.notes}>{app.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.applicationActions}>
                      <button
                        onClick={() => handleApprove(app.id)}
                        disabled={processing === app.id}
                        className={`${styles.actionButton} ${styles.approveButton}`}
                      >
                        {processing === app.id ? (
                          <i className="ri-loader-4-line ri-spin"></i>
                        ) : (
                          <>
                            <i className="ri-check-line"></i>
                            <span>Утвердить</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleReject(app.id)}
                        disabled={processing === app.id}
                        className={`${styles.actionButton} ${styles.rejectButton}`}
                      >
                        <i className="ri-close-line"></i>
                        <span>Отклонить</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <i className="ri-inbox-line"></i>
              <h3 className={styles.emptyStateTitle}>Нет заявок</h3>
              <p className={styles.emptyStateText}>
                На данный момент нет заявок, ожидающих утверждения
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}