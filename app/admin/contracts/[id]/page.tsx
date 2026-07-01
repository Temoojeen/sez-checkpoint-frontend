"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import contractService from '@/services/contract.service';
import organizationService from '@/services/organization.service';
import applicationService from '@/services/application.service';
import approvedPlateService from '@/services/approved-plate.service';
import { Contract, Organization, Application, ApprovedPlate, ApiError } from '@/types';
import { formatDate, getStatusBadge } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<Contract | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [approvedPlates, setApprovedPlates] = useState<ApprovedPlate[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'applications' | 'plates'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    contractNumber: '',
    contractType: '',
    status: '',
    validFrom: '',
    validUntil: '',
    notes: '',
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
      fetchContractData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, id]);

  const fetchContractData = async () => {
    try {
      setLoading(true);
      
      // Загружаем данные договора
      const contractData = await contractService.getById(id);
      setContract(contractData);
      
      // Заполняем форму редактирования
      setEditForm({
        contractNumber: contractData.contractNumber || '',
        contractType: contractData.contractType || 'standard',
        status: contractData.status || 'active',
        validFrom: contractData.validFrom || '',
        validUntil: contractData.validUntil || '',
        notes: contractData.notes || '',
      });
      
      // Загружаем организацию
      if (contractData.organizationId) {
        try {
          const orgData = await organizationService.getById(contractData.organizationId);
          setOrganization(orgData);
        } catch (error) {
          console.error('Error fetching organization:', error);
        }
      }
      
      // Загружаем связанные заявки и номера
      const [allApps, allPlates] = await Promise.all([
        applicationService.getAllApplications(),
        approvedPlateService.getAll(),
      ]);
      
      // Фильтруем заявки по договору (по номеру договора)
      const contractApps = allApps?.filter(app => app.contractNumber === contractData.contractNumber);
      setApplications(contractApps);
      
      // Фильтруем номера по договору (по contractId)
      const contractPlates = allPlates?.filter(plate => plate.contractId === id);
      setApprovedPlates(contractPlates);
      
    } catch (error: unknown) {
      console.error('Error fetching contract:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        if (apiError.response?.status === 404) {
          toast.error('Договор не найден');
          router.push('/admin/contracts');
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

const copyToClipboard = async (text: string, label: string = 'Текст') => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    toast.success(`${label} скопирован в буфер обмена`);
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    toast.error('Ошибка при копировании');
  }
};

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (contract) {
      setEditForm({
        contractNumber: contract.contractNumber || '',
        contractType: contract.contractType || 'standard',
        status: contract.status || 'active',
        validFrom: contract.validFrom || '',
        validUntil: contract.validUntil || '',
        notes: contract.notes || '',
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!contract) return;
    
    try {
      setLoading(true);
      
      await contractService.update(contract.id, {
        contractNumber: editForm.contractNumber,
        contractType: editForm.contractType,
        status: editForm.status,
        validFrom: editForm.validFrom,
        validUntil: editForm.validUntil || undefined,
        notes: editForm.notes || undefined,
      });
      
      toast.success('Данные договора обновлены');
      setIsEditing(false);
      await fetchContractData();
      
    } catch (error: unknown) {
      console.error('Error updating contract:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        toast.error(apiError.response?.data?.error || 'Ошибка при обновлении');
      } else {
        toast.error('Ошибка при обновлении');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!contract) return;
    
    if (applications?.length > 0) {
      toast.error('Нельзя удалить договор, к которому привязаны заявки');
      return;
    }
    
    if (approvedPlates?.length > 0) {
      toast.error('Нельзя удалить договор, к которому привязаны номера');
      return;
    }
    
    if (window.confirm(`Вы уверены, что хотите удалить договор "${contract.contractNumber}"? Это действие нельзя отменить.`)) {
      try {
        await contractService.delete(contract.id);
        toast.success('Договор удален');
        router.push('/admin/contracts');
      } catch (error: unknown) {
        console.error('Error deleting contract:', error);
        if (error && typeof error === 'object' && 'response' in error) {
          const apiError = error as ApiError;
          toast.error(apiError.response?.data?.error || 'Ошибка при удалении');
        } else {
          toast.error('Ошибка при удалении');
        }
      }
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return { text: 'Активен', color: 'green' };
      case 'expired':
        return { text: 'Истек', color: 'red' };
      case 'terminated':
        return { text: 'Расторгнут', color: 'gray' };
      default:
        return { text: status, color: 'gray' };
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'standard':
        return { text: 'Стандартный', color: '#2563eb' };
      case 'vip':
        return { text: 'VIP', color: '#8b5cf6' };
      case 'temporary':
        return { text: 'Временный', color: '#f59e0b' };
      default:
        return { text: type, color: '#6b7280' };
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка данных договора...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className={styles.errorContainer}>
        <i className="ri-error-warning-line"></i>
        <h2>Договор не найден</h2>
        <Link href="/admin/contracts" className={styles.backButton}>
          <i className="ri-arrow-left-line"></i>
          Вернуться к списку
        </Link>
      </div>
    );
  }

  const status = getStatusInfo(contract.status);
  const type = getTypeInfo(contract.contractType);

  return (
    <div className={styles.container}>
      <Header role='admin'/>

      <main className={styles.main}>
        {/* Статус и основные действия */}
        <div className={styles.statusBar}>
          <div className={styles.statusInfo}>
            <span className={styles.statusLabel}>Статус:</span>
            <span className={`${styles.statusBadge} ${styles[`status${status.color}`]}`}>
              {status.text}
            </span>
            <span className={styles.statusLabel} style={{ marginLeft: '1rem' }}>Тип:</span>
            <span 
              className={styles.typeBadge}
              style={{ 
                backgroundColor: `${type.color}20`, 
                color: type.color,
                borderColor: type.color
              }}
            >
              {type.text}
            </span>
          </div>
        </div>

        {/* Вкладки */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'info' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <i className="ri-information-line"></i>
            Информация
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'applications' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            <i className="ri-file-list-3-line"></i>
            Заявки ({applications?.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'plates' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('plates')}
          >
            <i className="ri-car-line"></i>
            Номера ({approvedPlates?.length})
          </button>
        </div>

        {/* Контент вкладок */}
        <div className={styles.tabContent}>
          {/* Вкладка информации */}
          {activeTab === 'info' && (
            <div className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <i className="ri-file-copy-line"></i>
                  Информация о договоре
                </h2>
                {!isEditing && (
                  <button onClick={handleEdit} className={styles.editButton}>
                    <i className="ri-pencil-line"></i>
                    Редактировать
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className={styles.editForm}>
                  <div className={styles.formGroup}>
                    <label htmlFor="contractNumber">
                      Номер договора <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      id="contractNumber"
                      name="contractNumber"
                      value={editForm.contractNumber}
                      onChange={handleChange}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="contractType">
                        Тип договора <span className={styles.required}>*</span>
                      </label>
                      <select
                        id="contractType"
                        name="contractType"
                        value={editForm.contractType}
                        onChange={handleChange}
                        className={styles.select}
                        required
                      >
                        <option value="standard">Стандартный</option>
                        <option value="vip">VIP</option>
                        <option value="temporary">Временный</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="status">
                        Статус <span className={styles.required}>*</span>
                      </label>
                      <select
                        id="status"
                        name="status"
                        value={editForm.status}
                        onChange={handleChange}
                        className={styles.select}
                        required
                      >
                        <option value="active">Активен</option>
                        <option value="expired">Истек</option>
                        <option value="terminated">Расторгнут</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="validFrom">
                        Действует с <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="date"
                        id="validFrom"
                        name="validFrom"
                        value={editForm.validFrom}
                        onChange={handleChange}
                        className={styles.input}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="validUntil">
                        Действует до
                      </label>
                      <input
                        type="date"
                        id="validUntil"
                        name="validUntil"
                        value={editForm.validUntil}
                        onChange={handleChange}
                        className={styles.input}
                        min={editForm.validFrom}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="notes">Примечания</label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={editForm.notes}
                      onChange={handleChange}
                      className={styles.textarea}
                      rows={4}
                      placeholder="Дополнительная информация о договоре"
                    />
                  </div>

                  <div className={styles.formActions}>
                    <button onClick={handleCancel} className={styles.cancelButton}>
                      Отмена
                    </button>
                    <button onClick={handleSave} className={styles.saveButton}>
                      Сохранить
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.infoGrid}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Номер договора:</span>
                    <span className={styles.infoValue}>
                      <span className={styles.infoValueText}>{contract.contractNumber}</span>
                      <button
                        onClick={() => copyToClipboard(contract.contractNumber, 'Номер договора')}
                        className={styles.copyButton}
                        title="Копировать номер договора"
                      >
                        <i className="ri-file-copy-line"></i>
                      </button>
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Организация:</span>
                    <span className={styles.infoValue}>
                      {organization ? (
                        <Link href={`/admin/organizations/${organization.id}`} className={styles.link}>
                          {organization.name}
                        </Link>
                      ) : (
                        'Загрузка...'
                      )}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Тип договора:</span>
                    <span className={styles.infoValue}>
                      <span 
                        className={styles.typeBadge}
                        style={{ 
                          backgroundColor: `${type.color}20`, 
                          color: type.color,
                          borderColor: type.color
                        }}
                      >
                        {type.text}
                      </span>
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
                    <span className={styles.infoLabel}>Дата договора:</span>
                    <span className={styles.infoValue}>{formatDate(contract.contractDate)}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Действует с:</span>
                    <span className={styles.infoValue}>{formatDate(contract.validFrom)}</span>
                  </div>
                  {contract.validUntil ? (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Действует до:</span>
                      <span className={styles.infoValue}>{formatDate(contract.validUntil)}</span>
                    </div>
                  ) : (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Срок действия:</span>
                      <span className={styles.infoValue}>Бессрочно</span>
                    </div>
                  )}
                  {contract.notes && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Примечания:</span>
                      <span className={styles.infoValue}>{contract.notes}</span>
                    </div>
                  )}
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Дата создания:</span>
                    <span className={styles.infoValue}>{formatDate(contract.createdAt)}</span>
                  </div>
                </div>
              )}

              {!isEditing && (
                <div className={styles.dangerZone}>
                  {/* <h3 className={styles.dangerTitle}>Опасная зона</h3> */}
                  <div className={styles.dangerActions}>
                    <button
                      onClick={handleDelete}
                      className={`${styles.dangerButton} ${styles.deleteButton}`}
                      disabled={applications?.length > 0 || approvedPlates?.length > 0}
                      title={
                        applications?.length > 0 
                          ? 'Нельзя удалить договор с заявками' 
                          : approvedPlates?.length > 0 
                          ? 'Нельзя удалить договор с номерами'
                          : ''
                      }
                    >
                      <i className="ri-delete-bin-line"></i>
                      Удалить договор
                    </button>
                  </div>
                  {(applications?.length > 0 || approvedPlates?.length > 0) && (
                    <p className={styles.warning}>
                      <i className="ri-error-warning-line"></i>
                      {applications?.length > 0 && approvedPlates?.length > 0 
                        ? 'Невозможно удалить договор, так как к нему привязаны заявки и номера'
                        : applications?.length > 0
                        ? 'Невозможно удалить договор, так как к нему привязаны заявки'
                        : 'Невозможно удалить договор, так как к нему привязаны номера'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Вкладка заявок */}
          {activeTab === 'applications' && (
            <div className={styles.listCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <i className="ri-file-list-3-line"></i>
                  Заявки по договору
                </h2>
              </div>

              {applications?.length > 0 ? (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Номер машины</th>
                        <th>Список</th>
                        <th>Статус</th>
                        <th>Дата создания</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app) => {
                        const status = getStatusBadge(app.status);
                        return (
                          <tr key={app.id}>
                            <td>
                              <span className={styles.plateNumber}>{app.plateNumber}</span>
                            </td>
                            <td>{app.listName || 'Не указан'}</td>
                            <td>
                              <span className={`${styles.statusBadge} ${styles[`status${status.color}`]}`}>
                                {status.text}
                              </span>
                            </td>
                            <td>{formatDate(app.createdAt)}</td>
                            <td>
                              <div className={styles.actionButtons}>
                                <Link
                                  href={`/admin/applications/${app.id}`}
                                  className={`${styles.actionButton} ${styles.viewButton}`}
                                  title="Просмотр"
                                >
                                  <i className="ri-eye-line"></i>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <i className="ri-file-list-3-line"></i>
                  <h3>Нет заявок</h3>
                  <p>По этому договору пока нет заявок</p>
                </div>
              )}
            </div>
          )}

          {/* Вкладка номеров */}
          {activeTab === 'plates' && (
            <div className={styles.listCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <i className="ri-car-line"></i>
                  Номера по договору
                </h2>
              </div>

              {approvedPlates?.length > 0 ? (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Номер машины</th>
                        <th>Список</th>
                        <th>Автомобиль</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedPlates.map((plate) => (
                        <tr key={plate.id}>
                          <td>
                            <span className={styles.plateNumber}>{plate.plateNumber}</span>
                          </td>
                          <td>{plate.listName || 'Не указан'}</td>
                          <td>
                            {plate.vehicleBrand || plate.vehicleModel ? (
                              <span>
                                {plate.vehicleBrand} {plate.vehicleModel}
                                {plate.vehicleColor && ` (${plate.vehicleColor})`}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${plate.isActive ? styles.statusActive : styles.statusInactive}`}>
                              {plate.isActive ? 'Активен' : 'Неактивен'}
                            </span>
                          </td>
                          <td>
                            <div className={styles.actionButtons}>
                              <Link
                                href={`/admin/approved-plates/${plate.id}`}
                                className={`${styles.actionButton} ${styles.viewButton}`}
                                title="Просмотр"
                              >
                                <i className="ri-eye-line"></i>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <i className="ri-car-line"></i>
                  <h3>Нет номеров</h3>
                  <p>По этому договору пока нет утвержденных номеров</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}