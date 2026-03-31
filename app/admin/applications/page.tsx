"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import applicationService from '@/services/application.service';
import organizationService from '@/services/organization.service';
import accessListService from '@/services/access-list.service';
import { Application, Organization, AccessList, ApiError } from '@/types';
import { formatDate, getStatusBadge } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function AdminApplicationsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [accessLists, setAccessLists] = useState<AccessList[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [listFilter, setListFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);
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
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    operatorApproved: 0,
    supervisorApproved: 0,
    rejected: 0,
  });

  // Проверка роли
  useEffect(() => {
    if (user && user.roleId !== 1) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  // Загрузка данных
  useEffect(() => {
    if (user && user.roleId === 1) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Загружаем все заявки через новый эндпоинт для админа
      const [allApps, orgsData, listsData] = await Promise.all([
        applicationService.getAllApplications(),
        organizationService.getAll(),
        accessListService.getAll(),
      ]);
      
      setApplications(allApps);
      setOrganizations(orgsData);
      setAccessLists(listsData);
      
      // Подсчет статистики
      const newStats = {
        total: allApps?.length,
        pending: allApps?.filter(a => a.status === 'pending').length,
        operatorApproved: allApps?.filter(a => a.status === 'operator_approved').length,
        supervisorApproved: allApps?.filter(a => a.status === 'supervisor_approved').length,
        rejected: allApps?.filter(a => a.status === 'rejected').length,
      };
      setStats(newStats);
      
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Ошибка при загрузке заявок');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAsOperator = async (applicationId: string) => {
    try {
      setProcessingId(applicationId);
      await applicationService.adminApproveAsOperator(applicationId);
      toast.success('Заявка одобрена от имени оператора');
      await fetchData();
    } catch (error: unknown) {
      console.error('Error approving as operator:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        toast.error(apiError.response?.data?.error || 'Ошибка при одобрении');
      } else {
        toast.error('Ошибка при одобрении');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveAsSupervisor = async (applicationId: string) => {
    try {
      setProcessingId(applicationId);
      await applicationService.adminApproveAsSupervisor(applicationId);
      toast.success('Заявка утверждена от имени руководителя');
      await fetchData();
    } catch (error: unknown) {
      console.error('Error approving as supervisor:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        toast.error(apiError.response?.data?.error || 'Ошибка при утверждении');
      } else {
        toast.error('Ошибка при утверждении');
      }
    } finally {
      setProcessingId(null);
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
      setProcessingId(rejectModal.applicationId);
      await applicationService.adminReject(rejectModal.applicationId, {
        reason: rejectModal.reason,
      });
      toast.success('Заявка отклонена');
      closeRejectModal();
      await fetchData();
    } catch (error: unknown) {
      console.error('Error rejecting application:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        toast.error(apiError.response?.data?.error || 'Ошибка при отклонении');
      } else {
        toast.error('Ошибка при отклонении');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setOrgFilter('all');
    setListFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const getOrganizationName = (orgId: string | undefined) => {
    if (!orgId) return null;
    const org = organizations.find(o => o.id === orgId);
    return org?.name;
  };

  const getListName = (listId: string) => {
    const list = accessLists.find(l => l.id === listId);
    return list?.name;
  };

  const getListColor = (listId: string) => {
    const list = accessLists.find(l => l.id === listId);
    return list?.color || '#6b7280';
  };

  const filteredApplications = applications?.filter(app => {
    // Поиск по номеру или организации
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const orgName = getOrganizationName(app.organizationId) || '';
      const matchesSearch = 
        app.plateNumber.toLowerCase().includes(term) ||
        orgName.toLowerCase().includes(term) ||
        (app.contractNumber?.toLowerCase() || '').includes(term) ||
        (app.applicantName?.toLowerCase() || '').includes(term);
      
      if (!matchesSearch) return false;
    }
    
    // Фильтр по статусу
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    
    // Фильтр по организации
    if (orgFilter !== 'all' && app.organizationId !== orgFilter) return false;
    
    // Фильтр по списку
    if (listFilter !== 'all' && app.listId !== listFilter) return false;
    
    // Фильтр по дате
    if (dateFrom && new Date(app.createdAt) < new Date(dateFrom)) return false;
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(app.createdAt) > toDate) return false;
    }
    
    return true;
  });

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
            <h1 className={styles.title}>Управление заявками</h1>
            <p className={styles.subtitle}>
              Просмотр и управление всеми заявками системы
            </p>
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
      <Header role='admin'/>

      <main className={styles.main}>
        {/* Статистика */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
              <i className="ri-file-list-3-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Всего заявок</p>
              <p className={styles.statValue}>{stats.total||0}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
              <i className="ri-time-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Ожидают оператора</p>
              <p className={styles.statValue}>{stats.pending||0}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
              <i className="ri-user-star-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Одобрено оператором</p>
              <p className={styles.statValue}>{stats.operatorApproved||0}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
              <i className="ri-checkbox-circle-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Утверждено</p>
              <p className={styles.statValue}>{stats.supervisorApproved||0}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <i className="ri-close-circle-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Отклонено</p>
              <p className={styles.statValue}>{stats.rejected||0}</p>
            </div>
          </div>
        </div>

        {/* Фильтры */}
        <div className={styles.filtersSection}>
          <h3 className={styles.filtersTitle}>
            <i className="ri-filter-3-line"></i>
            Фильтры
          </h3>
          
          <div className={styles.filtersGrid}>
            <div className={styles.searchBox}>
              <i className={`ri-search-line ${styles.searchIcon}`}></i>
              <input
                type="text"
                placeholder="Поиск по номеру, организации, договору или заявителю..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className={styles.clearSearch}
                >
                  <i className="ri-close-line"></i>
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.select}
            >
              <option value="all">Все статусы</option>
              <option value="pending">Ожидают оператора</option>
              <option value="operator_approved">Одобрено оператором</option>
              <option value="supervisor_approved">Утверждено</option>
              <option value="rejected">Отклонено</option>
            </select>

            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className={styles.select}
            >
              <option value="all">Все организации</option>
              {organizations?.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>

            <select
              value={listFilter}
              onChange={(e) => setListFilter(e.target.value)}
              className={styles.select}
            >
              <option value="all">Все списки</option>
              {accessLists?.map(list => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>

            <div className={styles.dateInput}>
              <i className="ri-calendar-line"></i>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Дата с"
                className={styles.dateField}
              />
            </div>

            <div className={styles.dateInput}>
              <i className="ri-calendar-line"></i>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="Дата по"
                className={styles.dateField}
              />
            </div>
          </div>

          {(searchTerm || statusFilter !== 'all' || orgFilter !== 'all' || listFilter !== 'all' || dateFrom || dateTo) && (
            <div className={styles.filtersActions}>
              <button
                onClick={handleClearFilters}
                className={styles.clearFiltersButton}
              >
                <i className="ri-close-line"></i>
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>

        {/* Таблица заявок */}
        <div className={styles.tableContainer}>
          {filteredApplications?.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Организация</th>
                  <th>Список</th>
                  <th>Статус</th>
                  <th>Заявитель</th>
                  <th>Автомобиль</th>
                  <th>Договор</th>
                  <th>Дата создания</th>
                  <th>Срок до</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => {
                  const status = getStatusBadge(app.status);
                  const listColor = getListColor(app.listId);
                  const orgName = getOrganizationName(app.organizationId);
                  
                  return (
                    <tr key={app.id}>
                      <td>
                        <span className={styles.plateNumber}>{app.plateNumber}</span>
                      </td>
                      <td>
                        <span className={styles.organizationName}>
                          <i className="ri-building-4-line"></i>
                          {orgName || 'Не указана'}
                        </span>
                      </td>
                      <td>
                        <span 
                          className={styles.listBadge}
                          style={{ 
                            backgroundColor: `${listColor}20`, 
                            color: listColor,
                            borderColor: listColor
                          }}
                        >
                          {getListName(app.listId) || 'Не указан'}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`status${status.color}`]}`}>
                          {status.text}
                        </span>
                      </td>
                      <td>
                        <span className={styles.applicantName}>
                          <i className="ri-user-line"></i>
                          {app.applicantName || 'Не указан'}
                        </span>
                      </td>
                      <td>
                        {app.vehicleBrand || app.vehicleModel ? (
                          <span className={styles.vehicleInfo}>
                            {app.vehicleBrand} {app.vehicleModel}
                            {app.vehicleColor && ` (${app.vehicleColor})`}
                          </span>
                        ) : (
                          <span className={styles.emptyValue}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={styles.contractNumber}>
                          {app.contractNumber || '—'}
                        </span>
                      </td>
                      <td>{formatDate(app.createdAt)}</td>
                      <td>
                        {app.validUntil ? formatDate(app.validUntil) : '—'}
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          {app.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveAsOperator(app.id)}
                                disabled={processingId === app.id}
                                className={`${styles.actionButton} ${styles.approveButton}`}
                                title="Одобрить (как оператор)"
                              >
                                {processingId === app.id ? (
                                  <i className="ri-loader-4-line ri-spin"></i>
                                ) : (
                                  <i className="ri-user-star-line"></i>
                                )}
                              </button>
                              <button
                                onClick={() => openRejectModal(app.id, app.plateNumber)}
                                disabled={processingId === app.id}
                                className={`${styles.actionButton} ${styles.rejectButton}`}
                                title="Отклонить"
                              >
                                <i className="ri-close-line"></i>
                              </button>
                            </>
                          )}
                          
                          {app.status === 'operator_approved' && (
                            <>
                              <button
                                onClick={() => handleApproveAsSupervisor(app.id)}
                                disabled={processingId === app.id}
                                className={`${styles.actionButton} ${styles.approveButton}`}
                                title="Утвердить (как руководитель)"
                              >
                                {processingId === app.id ? (
                                  <i className="ri-loader-4-line ri-spin"></i>
                                ) : (
                                  <i className="ri-check-double-line"></i>
                                )}
                              </button>
                              <button
                                onClick={() => openRejectModal(app.id, app.plateNumber)}
                                disabled={processingId === app.id}
                                className={`${styles.actionButton} ${styles.rejectButton}`}
                                title="Отклонить"
                              >
                                <i className="ri-close-line"></i>
                              </button>
                            </>
                          )}
                          
                          <Link
                            href={`/admin/applications/${app.id}`}
                            className={`${styles.actionButton} ${styles.viewButton}`}
                            title="Просмотр"
                          >
                            <i className="ri-eye-line"></i>
                          </Link>
                          
                          {app.rejectReason && app.status === 'rejected' && (
                            <span 
                              className={styles.rejectIcon} 
                              title={app.rejectReason}
                            >
                              <i className="ri-error-warning-line"></i>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <i className="ri-file-list-3-line"></i>
              <h3 className={styles.emptyStateTitle}>Заявки не найдены</h3>
              <p className={styles.emptyStateText}>
                {searchTerm || statusFilter !== 'all' || orgFilter !== 'all' || listFilter !== 'all' || dateFrom || dateTo
                  ? 'Попробуйте изменить параметры фильтрации'
                  : 'В системе пока нет заявок'}
              </p>
              {(searchTerm || statusFilter !== 'all' || orgFilter !== 'all' || listFilter !== 'all' || dateFrom || dateTo) && (
                <button
                  onClick={handleClearFilters}
                  className={styles.clearFiltersButton}
                >
                  <i className="ri-close-line"></i>
                  Сбросить фильтры
                </button>
              )}
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
                disabled={processingId === rejectModal.applicationId}
                className={styles.submitButton}
              >
                {processingId === rejectModal.applicationId ? (
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