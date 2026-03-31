"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import applicationService from '@/services/application.service';
import organizationService from '@/services/organization.service';
import accessListService from '@/services/access-list.service';
import userService from '@/services/user.service';
import { Application, Organization, AccessList, User, ApiError } from '@/types';
import { formatDate, getStatusBadge } from '@/utils/format';
import { getRoleName } from '@/utils/roleRedirect';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { user: currentUser, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<Application | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [accessList, setAccessList] = useState<AccessList | null>(null);
  const [applicant, setApplicant] = useState<User | null>(null);
  const [operator, setOperator] = useState<User | null>(null);
  const [supervisor, setSupervisor] = useState<User | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    reason: '',
  });

  // Проверка прав доступа
  useEffect(() => {
    if (currentUser && currentUser.roleId !== 1) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [currentUser, router]);

  // Загрузка данных
  useEffect(() => {
    if (currentUser?.roleId === 1) {
      fetchApplicationData();
    }
  }, [currentUser, id]);

  const fetchApplicationData = async () => {
    try {
      setLoading(true);
      
      // Загружаем данные заявки
      const appData = await applicationService.getById(id);
      setApplication(appData);
      
      // Загружаем связанные данные параллельно
      const promises = [];
      
      // Загрузка организации
      if (appData.organizationId) {
        promises.push(
          organizationService.getById(appData.organizationId)
            .then(setOrganization)
            .catch(() => setOrganization(null))
        );
      }
      
      // Загрузка списка
      if (appData.listId) {
        promises.push(
          accessListService.getById(appData.listId)
            .then(setAccessList)
            .catch(() => setAccessList(null))
        );
      }
      
      // Загрузка заявителя
      if (appData.applicantId) {
        promises.push(
          userService.getById(appData.applicantId)
            .then(setApplicant)
            .catch(() => setApplicant(null))
        );
      }
      
      // Загрузка оператора
      if (appData.operatorId) {
        promises.push(
          userService.getById(appData.operatorId)
            .then(setOperator)
            .catch(() => setOperator(null))
        );
      }
      
      // Загрузка руководителя
      if (appData.supervisorId) {
        promises.push(
          userService.getById(appData.supervisorId)
            .then(setSupervisor)
            .catch(() => setSupervisor(null))
        );
      }
      
      await Promise.all(promises);
      
    } catch (error: unknown) {
      console.error('Error fetching application:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        if (apiError.response?.status === 404) {
          toast.error('Заявка не найдена');
          router.push('/admin/applications');
        } else {
          toast.error('Ошибка при загрузке данных');
        }
      } else {
        toast.error('Ошибка при загрузке данных');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAsOperator = async () => {
    if (!application) return;
    
    try {
      setProcessing(true);
      await applicationService.adminApproveAsOperator(application.id);
      toast.success('Заявка одобрена от имени оператора');
      await fetchApplicationData();
    } catch (error: unknown) {
      console.error('Error approving as operator:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        toast.error(apiError.response?.data?.error || 'Ошибка при одобрении');
      } else {
        toast.error('Ошибка при одобрении');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveAsSupervisor = async () => {
    if (!application) return;
    
    try {
      setProcessing(true);
      await applicationService.adminApproveAsSupervisor(application.id);
      toast.success('Заявка утверждена от имени руководителя');
      await fetchApplicationData();
    } catch (error: unknown) {
      console.error('Error approving as supervisor:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        toast.error(apiError.response?.data?.error || 'Ошибка при утверждении');
      } else {
        toast.error('Ошибка при утверждении');
      }
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = () => {
    setRejectModal({ isOpen: true, reason: '' });
  };

  const closeRejectModal = () => {
    setRejectModal({ isOpen: false, reason: '' });
  };

  const handleReject = async () => {
    if (!application) return;
    
    if (!rejectModal.reason.trim()) {
      toast.error('Укажите причину отклонения');
      return;
    }

    try {
      setProcessing(true);
      await applicationService.adminReject(application.id, {
        reason: rejectModal.reason,
      });
      toast.success('Заявка отклонена');
      closeRejectModal();
      await fetchApplicationData();
    } catch (error: unknown) {
      console.error('Error rejecting application:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        toast.error(apiError.response?.data?.error || 'Ошибка при отклонении');
      } else {
        toast.error('Ошибка при отклонении');
      }
    } finally {
      setProcessing(false);
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
          <p className={styles.loadingText}>Загрузка данных заявки...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className={styles.errorContainer}>
        <i className="ri-error-warning-line"></i>
        <h2>Заявка не найдена</h2>
        <Link href="/admin/applications" className={styles.backButton}>
          <i className="ri-arrow-left-line"></i>
          Вернуться к списку
        </Link>
      </div>
    );
  }

  const status = getStatusBadge(application.status);

  return (
    <div className={styles.container}>
      <Header role='admin'/>
      {/* Верхняя панель */}
      {/* <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <Link href="/admin/applications" className={styles.backLink}>
              <i className="ri-arrow-left-line"></i>
              <span>К списку заявок</span>
            </Link>
            <div>
              <h1 className={styles.title}>Заявка #{application.plateNumber}</h1>
              <p className={styles.subtitle}>
                Детальная информация о заявке
              </p>
            </div>
          </div>
          <div className={styles.userInfo}>
            <span className={styles.roleBadge} style={{ backgroundColor: '#8b5cf620', color: '#8b5cf6' }}>
              Администратор
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
        {/* Статус и действия */}
        <div className={styles.statusBar}>
          <div className={styles.statusInfo}>
            <span className={styles.statusLabel}>Текущий статус:</span>
            <span className={`${styles.statusBadge} ${styles[`status${status.color}`]}`}>
              {status.text}
            </span>
          </div>
          
          <div className={styles.actionButtons}>
            {application.status === 'pending' && (
              <>
                <button
                  onClick={handleApproveAsOperator}
                  disabled={processing}
                  className={`${styles.actionButton} ${styles.approveButton}`}
                >
                  {processing ? (
                    <i className="ri-loader-4-line ri-spin"></i>
                  ) : (
                    <>
                      <i className="ri-user-star-line"></i>
                      <span>Одобрить (как оператор)</span>
                    </>
                  )}
                </button>
                <button
                  onClick={openRejectModal}
                  disabled={processing}
                  className={`${styles.actionButton} ${styles.rejectButton}`}
                >
                  <i className="ri-close-line"></i>
                  <span>Отклонить</span>
                </button>
              </>
            )}
            
            {application.status === 'operator_approved' && (
              <>
                <button
                  onClick={handleApproveAsSupervisor}
                  disabled={processing}
                  className={`${styles.actionButton} ${styles.approveButton}`}
                >
                  {processing ? (
                    <i className="ri-loader-4-line ri-spin"></i>
                  ) : (
                    <>
                      <i className="ri-check-double-line"></i>
                      <span>Утвердить (как руководитель)</span>
                    </>
                  )}
                </button>
                <button
                  onClick={openRejectModal}
                  disabled={processing}
                  className={`${styles.actionButton} ${styles.rejectButton}`}
                >
                  <i className="ri-close-line"></i>
                  <span>Отклонить</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Детальная информация */}
        <div className={styles.content}>
          {/* Основная информация */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <i className="ri-information-line"></i>
              Основная информация
            </h2>
            
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Номер машины:</span>
                <span className={`${styles.infoValue} ${styles.plateNumber}`}>
                  {application.plateNumber}
                </span>
              </div>
              
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Статус:</span>
                <span className={styles.infoValue}>
                  <span className={`${styles.statusBadge} ${styles[`status${status.color}`]}`}>
                    {status.text}
                  </span>
                </span>
              </div>
              
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Дата создания:</span>
                <span className={styles.infoValue}>{formatDate(application.createdAt)}</span>
              </div>
              
              {application.updatedAt && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Последнее обновление:</span>
                  <span className={styles.infoValue}>{formatDate(application.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Информация об организации и списке */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <i className="ri-building-4-line"></i>
              Организация и список
            </h2>
            
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Организация:</span>
                <span className={styles.infoValue}>
                  {organization ? (
                    <Link href={`/admin/organizations/${organization.id}`} className={styles.link}>
                      {organization.name}
                    </Link>
                  ) : (
                    application.organizationName || 'Не указана'
                  )}
                </span>
              </div>
              
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Список:</span>
                <span className={styles.infoValue}>
                  {accessList ? (
                    <span 
                      className={styles.listBadge}
                      style={{ 
                        backgroundColor: `${accessList.color}20`, 
                        color: accessList.color,
                        borderColor: accessList.color
                      }}
                    >
                      {accessList.name}
                    </span>
                  ) : (
                    application.listName || 'Не указан'
                  )}
                </span>
              </div>
              
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Номер договора:</span>
                <span className={styles.infoValue}>
                  {application.contractNumber || 'Не указан'}
                </span>
              </div>
            </div>
          </div>

          {/* Информация об автомобиле */}
          {(application.vehicleBrand || application.vehicleModel || application.vehicleColor) && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <i className="ri-car-line"></i>
                Автомобиль
              </h2>
              
              <div className={styles.infoGrid}>
                {application.vehicleBrand && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Марка:</span>
                    <span className={styles.infoValue}>{application.vehicleBrand}</span>
                  </div>
                )}
                
                {application.vehicleModel && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Модель:</span>
                    <span className={styles.infoValue}>{application.vehicleModel}</span>
                  </div>
                )}
                
                {application.vehicleColor && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Цвет:</span>
                    <span className={styles.infoValue}>{application.vehicleColor}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Срок действия */}
          {(application.validFrom || application.validUntil) && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <i className="ri-calendar-line"></i>
                Срок действия
              </h2>
              
              <div className={styles.infoGrid}>
                {application.validFrom && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Действует с:</span>
                    <span className={styles.infoValue}>{formatDate(application.validFrom)}</span>
                  </div>
                )}
                
                {application.validUntil && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Действует до:</span>
                    <span className={styles.infoValue}>{formatDate(application.validUntil)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Примечания */}
          {application.notes && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <i className="ri-file-text-line"></i>
                Примечания
              </h2>
              
              <div className={styles.notes}>
                {application.notes}
              </div>
            </div>
          )}

          {/* История обработки */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <i className="ri-history-line"></i>
              История обработки
            </h2>
            
            <div className={styles.timeline}>
              {/* Создание заявки */}
              <div className={styles.timelineItem}>
                <div className={styles.timelineIcon}>
                  <i className="ri-file-add-line"></i>
                </div>
                <div className={styles.timelineContent}>
                  <p className={styles.timelineTitle}>Заявка создана</p>
                  <p className={styles.timelineDate}>{formatDate(application.createdAt)}</p>
                  {applicant && (
                    <p className={styles.timelineActor}>
                      Заявитель: {applicant.fullName} (@{applicant.username})
                    </p>
                  )}
                </div>
              </div>

              {/* Одобрение оператором */}
              {application.operatorApprovedAt && (
                <div className={styles.timelineItem}>
                  <div className={styles.timelineIcon} style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
                    <i className="ri-user-star-line"></i>
                  </div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineTitle}>Одобрено оператором</p>
                    <p className={styles.timelineDate}>{formatDate(application.operatorApprovedAt)}</p>
                    {operator && (
                      <p className={styles.timelineActor}>
                        Оператор: {operator.fullName} (@{operator.username})
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Утверждение руководителем */}
              {application.supervisorApprovedAt && (
                <div className={styles.timelineItem}>
                  <div className={styles.timelineIcon} style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
                    <i className="ri-check-double-line"></i>
                  </div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineTitle}>Утверждено руководителем</p>
                    <p className={styles.timelineDate}>{formatDate(application.supervisorApprovedAt)}</p>
                    {supervisor && (
                      <p className={styles.timelineActor}>
                        Руководитель: {supervisor.fullName} (@{supervisor.username})
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Отклонение */}
              {application.rejectedAt && (
                <div className={styles.timelineItem}>
                  <div className={styles.timelineIcon} style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                    <i className="ri-close-line"></i>
                  </div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineTitle}>Отклонено</p>
                    <p className={styles.timelineDate}>{formatDate(application.rejectedAt)}</p>
                    {application.rejectReason && (
                      <p className={styles.timelineReason}>
                        Причина: {application.rejectReason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
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
                Вы отклоняете заявку для номера <strong>{application.plateNumber}</strong>
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
                disabled={processing}
                className={styles.submitButton}
              >
                {processing ? (
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