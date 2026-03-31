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

export default function OperatorPage() {
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
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    applicationId: string;
    plateNumber: string;
    reason: string;
  }>({
    isOpen: false,
    applicationId: '',
    plateNumber: '',
    reason: '',
  });

  // Проверка роли
  useEffect(() => {
    if (user && user.roleId !== 2) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  // Загрузка данных
  useEffect(() => {
    if (user && user.roleId === 2 && !dataLoaded) {
      fetchApplications();
    }
  }, [user, dataLoaded]);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      
      // Загружаем заявки, ожидающие оператора
      const pendingApps = await applicationService.getPendingForOperator();
      
      // Проверяем, что данные существуют и являются массивом
      const safeApplications = Array.isArray(pendingApps) ? pendingApps : [];
      setApplications(safeApplications);
      
      // Обновляем статистику
      setStats({
        total: safeApplications.length,
        pending: safeApplications.length,
        approved: 0,
        rejected: 0,
      });
      
      setDataLoaded(true);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Ошибка при загрузке заявок');
      // В случае ошибки устанавливаем пустой массив
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleApprove = async (applicationId: string) => {
    try {
      setProcessing(applicationId);
      
      await applicationService.operatorApprove(applicationId);
      
      toast.success('Заявка одобрена и отправлена руководителю');
      
      // Обновляем список и убеждаемся, что получаем массив
      await fetchApplications();
      
    } catch (error: unknown) {
      console.error('Error approving application:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        if (apiError.response?.data?.error) {
          toast.error(apiError.response.data.error);
        } else {
          toast.error('Ошибка при одобрении заявки');
        }
      } else {
        toast.error('Ошибка при одобрении заявки');
      }
    } finally {
      setProcessing(null);
    }
  };

  const openRejectModal = (applicationId: string, plateNumber: string) => {
    setRejectModal({
      isOpen: true,
      applicationId,
      plateNumber,
      reason: '',
    });
  };

  const closeRejectModal = () => {
    setRejectModal({
      isOpen: false,
      applicationId: '',
      plateNumber: '',
      reason: '',
    });
  };

  const handleReject = async () => {
    if (!rejectModal.reason.trim()) {
      toast.error('Укажите причину отклонения');
      return;
    }

    try {
      setProcessing(rejectModal.applicationId);
      
      await applicationService.reject(rejectModal.applicationId, {
        reason: rejectModal.reason,
      });
      
      toast.success('Заявка отклонена');
      
      closeRejectModal();
      await fetchApplications();
      
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
      {/* Верхняя панель */}
      {/* <header className={styles.header}>
        <div className={styles.headerContent}>
  <div>
    <h1 className={styles.title}>Панель оператора</h1>
    <p className={styles.subtitle}>
      Добро пожаловать, {user?.fullName || user?.username}
    </p>
  </div>
  <div className={styles.userInfo}>
    <Link href="/operator/lists" className={styles.viewPlatesLink}>
      <i className="ri-car-line"></i>
      <span>Утвержденные номера</span>
    </Link>
    <span className={styles.roleBadge}>
      Оператор
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
      <Header role='operator'/>

      <main className={styles.main}>
        {/* Статистика */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
              <i className="ri-file-list-3-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Всего заявок</p>
              <p className={styles.statValue}>{stats.total}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
              <i className="ri-time-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Ожидают</p>
              <p className={styles.statValue}>{stats.pending}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
              <i className="ri-checkbox-circle-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Одобрено сегодня</p>
              <p className={styles.statValue}>{stats.approved}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <i className="ri-close-circle-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Отклонено сегодня</p>
              <p className={styles.statValue}>{stats.rejected}</p>
            </div>
          </div>
        </div>

        {/* Список заявок */}
        <div className={styles.applicationsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <i className="ri-file-list-3-line"></i>
              Заявки на рассмотрение
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
              {applications?.map((app) => {
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
                        <span>{app.contractNumber || 'Не указан'}</span>
                      </div>
                      
                      <div className={styles.detailRow}>
                        <i className="ri-list-check-3"></i>
                        <span>{app.listName || 'Не указан'}</span>
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
                            <span>Одобрить</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => openRejectModal(app.id, app.plateNumber)}
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
                На данный момент нет заявок, ожидающих рассмотрения
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Модальное окно отклонения */}
      {rejectModal.isOpen && (
        <div className={styles.modalOverlay} onClick={closeRejectModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <i className="ri-error-warning-line"></i>
                Отклонение заявки
              </h3>
              <button
                onClick={closeRejectModal}
                className={styles.modalClose}
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <p className={styles.modalText}>
                Вы отклоняете заявку для номера <strong>{rejectModal.plateNumber}</strong>
              </p>
              
              <div className={styles.formGroup}>
                <label htmlFor="rejectReason" className={styles.label}>
                  Причина отклонения <span className={styles.required}>*</span>
                </label>
                <textarea
                  id="rejectReason"
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                  className={styles.textarea}
                  placeholder="Укажите причину отклонения заявки"
                  rows={4}
                  autoFocus
                />
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button
                onClick={closeRejectModal}
                className={styles.cancelButton}
              >
                Отмена
              </button>
              <button
                onClick={handleReject}
                disabled={processing === rejectModal.applicationId}
                className={styles.submitButton}
              >
                {processing === rejectModal.applicationId ? (
                  <>
                    <i className="ri-loader-4-line ri-spin"></i>
                    <span>Отклонение...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-close-line"></i>
                    <span>Отклонить заявку</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}