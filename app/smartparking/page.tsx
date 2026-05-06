"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import applicationService from '@/services/application.service';
import { Application, ApiError } from '@/types';
import { formatDate, getStatusBadge } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';
import { parqourAPI, Parking, WhitelistGroup } from '@/services/parqour.api';

const LOCATION_ID = 97;

interface RejectModalState {
  isOpen: boolean;
  applicationId: string;
  plateNumber: string;
  reason: string;
}

type ApproveStep = 'parkings' | 'groups';

interface ApproveModalState {
  isOpen: boolean;
  step: ApproveStep;
  applicationId: string;
  plateNumber: string;
  parkings: Parking[];
  selectedParkingId: number | null;
  groups: WhitelistGroup[];
  selectedGroupId: number | null;
  groupsTotalPages: number;
  groupsCurrentPage: number;
  loading: boolean;
}

export default function SmartParkingOperatorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
  });

  const [rejectModal, setRejectModal] = useState<RejectModalState>({
    isOpen: false,
    applicationId: '',
    plateNumber: '',
    reason: '',
  });

  const [approveModal, setApproveModal] = useState<ApproveModalState>({
    isOpen: false,
    step: 'parkings',
    applicationId: '',
    plateNumber: '',
    parkings: [],
    selectedParkingId: null,
    groups: [],
    selectedGroupId: null,
    groupsTotalPages: 0,
    groupsCurrentPage: 0,
    loading: false,
  });

  useEffect(() => {
    if (user && user.roleId !== 6) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  useEffect(() => {
    if (user && user.roleId === 6 && !dataLoaded) {
      fetchApplications();
    }
  }, [user, dataLoaded]);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      
      const pendingApps = await applicationService.getPendingForSmartParking();
      
      const safeApplications = Array.isArray(pendingApps) ? pendingApps : [];
      setApplications(safeApplications);
      
      setStats({
        total: safeApplications.length,
        pending: safeApplications.length,
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

  const openApproveModal = async (applicationId: string, plateNumber: string) => {
    setApproveModal({
      isOpen: true,
      step: 'parkings',
      applicationId,
      plateNumber,
      parkings: [],
      selectedParkingId: null,
      groups: [],
      selectedGroupId: null,
      groupsTotalPages: 0,
      groupsCurrentPage: 0,
      loading: true,
    });

    try {
      await parqourAPI.login('Tassaliyev@gmail.com', 'Tassaliyev2026!');
      
      const parkings = await parqourAPI.getParkingsByLocation(LOCATION_ID);
      
      setApproveModal(prev => ({
        ...prev,
        parkings: parkings,
        loading: false,
      }));
    } catch (error) {
      console.error('Error loading parkings:', error);
      toast.error('Ошибка при загрузке списка парковок');
      setApproveModal(prev => ({ ...prev, isOpen: false, loading: false }));
    }
  };

  const loadGroups = async (parkingId: number, page: number = 0) => {
    setApproveModal(prev => ({ ...prev, loading: true, selectedParkingId: parkingId }));
    
    try {
      const paginatedResponse = await parqourAPI.getWhitelistGroups(parkingId, page, 20);
      
      setApproveModal(prev => ({
        ...prev,
        step: 'groups',
        groups: paginatedResponse.content, // Берем массив из поля content
        groupsTotalPages: paginatedResponse.totalPages,
        groupsCurrentPage: paginatedResponse.page ?? paginatedResponse.number,
        selectedGroupId: null,
        loading: false,
      }));
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Ошибка при загрузке списка групп');
      setApproveModal(prev => ({ ...prev, loading: false }));
    }
  };

  const loadNextGroupsPage = async () => {
    if (!approveModal.selectedParkingId) return;
    const nextPage = approveModal.groupsCurrentPage + 1;
    if (nextPage < approveModal.groupsTotalPages) {
      await loadGroups(approveModal.selectedParkingId, nextPage);
    }
  };

  const loadPreviousGroupsPage = async () => {
    if (!approveModal.selectedParkingId) return;
    const prevPage = approveModal.groupsCurrentPage - 1;
    if (prevPage >= 0) {
      await loadGroups(approveModal.selectedParkingId, prevPage);
    }
  };

const handleFinalApprove = async () => {
  if (!approveModal.selectedGroupId) {
    toast.error('Выберите группу');
    return;
  }

  if (!approveModal.selectedParkingId) {
    toast.error('Парковка не выбрана');
    return;
  }

  try {
    setProcessing(approveModal.applicationId);
    setApproveModal(prev => ({ ...prev, loading: true }));
    
    // 1. Добавляем номер в группу Parqour
    await parqourAPI.addCarToGroup(
      approveModal.selectedParkingId,
      approveModal.selectedGroupId,
      approveModal.plateNumber
    );
    
    // 2. Удаляем заявку через специальный эндпоинт для SmartParking
    await applicationService.deleteSmartParkingApplication(approveModal.applicationId);
    
    toast.success(`Заявка одобрена! Номер ${approveModal.plateNumber} добавлен в группу`);
    
    setApproveModal(prev => ({ ...prev, isOpen: false }));
    await fetchApplications();
    
  } catch (error) {
    console.error('Error approving application:', error);
    
    if (error instanceof Error) {
      toast.error(error.message);
    } else {
      toast.error('Ошибка при одобрении заявки');
    }
  } finally {
    setProcessing(null);
    setApproveModal(prev => ({ ...prev, loading: false }));
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
      
      await applicationService.smartParkingReject(rejectModal.applicationId, {
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

  const closeApproveModal = () => {
    setApproveModal(prev => ({ ...prev, isOpen: false }));
  };

  const goBackToParkings = () => {
    setApproveModal(prev => ({
      ...prev,
      step: 'parkings',
      groups: [],
      selectedGroupId: null,
    }));
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка заявок SmartParking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header role='smartparking'/>

      <main className={styles.main}>
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
        </div>

        <div className={styles.applicationsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <i className="ri-parking-box-line"></i>
              Заявки SmartParking на рассмотрение
            </h2>
            <button onClick={fetchApplications} className={styles.refreshButton} disabled={loading}>
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
                      
                      {app.notes && (
                        <div className={styles.detailRow}>
                          <i className="ri-file-text-line"></i>
                          <span className={styles.notes}>{app.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.applicationActions}>
                      <button
                        onClick={() => openApproveModal(app.id, app.plateNumber)}
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
                На данный момент нет заявок SmartParking, ожидающих рассмотрения
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Модалка отклонения */}
      {rejectModal.isOpen && (
        <div className={styles.modalOverlay} onClick={closeRejectModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <i className="ri-error-warning-line"></i>
                Отклонение заявки
              </h3>
              <button onClick={closeRejectModal} className={styles.modalClose}>
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
              <button onClick={closeRejectModal} className={styles.cancelButton}>
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

      {/* Модалка одобрения */}
      {approveModal.isOpen && (
        <div className={styles.modalOverlay} onClick={closeApproveModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {approveModal.step === 'parkings' ? (
                  <><i className="ri-parking-line"></i> Выберите парковку</>
                ) : (
                  <><i className="ri-group-line"></i> Выберите группу доступа</>
                )}
              </h3>
              <button onClick={closeApproveModal} className={styles.modalClose}>
                <i className="ri-close-line"></i>
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <p className={styles.modalText}>
                Одобрение заявки для номера <strong>{approveModal.plateNumber}</strong>
              </p>
              
              {approveModal.loading ? (
                <div className={styles.loadingLocations}>
                  <i className="ri-loader-4-line ri-spin"></i>
                  <span>Загрузка...</span>
                </div>
              ) : (
                <>
                  {approveModal.step === 'parkings' && (
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Парковка *</label>
                      <select
                        value={approveModal.selectedParkingId ?? ''}
                        onChange={(e) => loadGroups(parseInt(e.target.value))}
                        className={styles.select}
                      >
                        <option value="">Выберите парковку...</option>
                        {approveModal.parkings.map((parking) => (
                          <option key={parking.id} value={parking.id}>
                            {parking.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {approveModal.step === 'groups' && (
                    <>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Группа доступа *</label>
                        <select
                          value={approveModal.selectedGroupId ?? ''}
                          onChange={(e) => setApproveModal(prev => ({ 
                            ...prev, 
                            selectedGroupId: parseInt(e.target.value) 
                          }))}
                          className={styles.select}
                        >
                          <option value="">Выберите группу...</option>
                          {approveModal.groups.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Пагинация для групп */}
                      {approveModal.groupsTotalPages > 1 && (
                        <div className={styles.pagination}>
                          <button
                            onClick={loadPreviousGroupsPage}
                            disabled={approveModal.groupsCurrentPage === 0}
                            className={styles.paginationButton}
                          >
                            <i className="ri-arrow-left-s-line"></i>
                          </button>
                          <span className={styles.paginationInfo}>
                            Страница {approveModal.groupsCurrentPage + 1} из {approveModal.groupsTotalPages}
                          </span>
                          <button
                            onClick={loadNextGroupsPage}
                            disabled={approveModal.groupsCurrentPage + 1 >= approveModal.groupsTotalPages}
                            className={styles.paginationButton}
                          >
                            <i className="ri-arrow-right-s-line"></i>
                          </button>
                        </div>
                      )}
                      
                      <div className={styles.groupsInfo}>
                        Всего групп: {approveModal.groups.length} из {approveModal.groupsTotalPages * 20}+
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            
            <div className={styles.modalFooter}>
              {approveModal.step === 'groups' && (
                <button onClick={goBackToParkings} className={styles.cancelButton}>
                  <i className="ri-arrow-left-line"></i>
                  Назад
                </button>
              )}
              <button onClick={closeApproveModal} className={styles.cancelButton}>
                Отмена
              </button>
              {approveModal.step === 'groups' && (
                <button
                  onClick={handleFinalApprove}
                  disabled={!approveModal.selectedGroupId || approveModal.loading || processing === approveModal.applicationId}
                  className={styles.submitButton}
                  style={{ backgroundColor: '#10b981' }}
                >
                  {processing === approveModal.applicationId ? (
                    <>
                      <i className="ri-loader-4-line ri-spin"></i>
                      <span>Добавление...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line"></i>
                      <span>Подтвердить</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}