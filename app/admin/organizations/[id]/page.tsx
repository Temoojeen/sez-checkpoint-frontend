"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import organizationService from '@/services/organization.service';
import contractService from '@/services/contract.service';
import userService from '@/services/user.service';
import approvedPlateService from '@/services/approved-plate.service';
import { Organization, Contract, User, ApprovedPlate, ApiError } from '@/types';
import { formatDate } from '@/utils/format';
import { getRoleName } from '@/utils/roleRedirect';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [approvedPlates, setApprovedPlates] = useState<ApprovedPlate[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'contracts' | 'users' | 'plates'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    bin: '',
    address: '',
    contactPhone: '',
    contactEmail: '',
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
      fetchOrganizationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, id]);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      
      // Загружаем данные организации
      const orgData = await organizationService.getById(id);
      setOrganization(orgData);
      
      // Заполняем форму редактирования
      setEditForm({
        name: orgData.name || '',
        bin: orgData.bin || '',
        address: orgData.address || '',
        contactPhone: orgData.contactPhone || '',
        contactEmail: orgData.contactEmail || '',
      });
      
      // Загружаем связанные данные параллельно
      const [contractsData, usersData, platesData] = await Promise.all([
        contractService.getByOrganization(id),
        userService.getAll().then(users => users.filter(u => u.organizationId === id)),
        approvedPlateService.getAll().then(plates => plates?.filter(p => p.organizationId === id)),
      ]);
      
      setContracts(contractsData);
      setUsers(usersData);
      setApprovedPlates(platesData);
      
    } catch (error: unknown) {
      console.error('Error fetching organization:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        if (apiError.response?.status === 404) {
          toast.error('Организация не найдена');
          router.push('/admin/organizations');
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

  // Функция копирования в буфер обмена
  const copyToClipboard = async (text: string, label: string = 'Текст') => {
    try {
      await navigator.clipboard.writeText(text);
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
    if (organization) {
      setEditForm({
        name: organization.name || '',
        bin: organization.bin || '',
        address: organization.address || '',
        contactPhone: organization.contactPhone || '',
        contactEmail: organization.contactEmail || '',
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!organization) return;
    
    try {
      setLoading(true);
      
      await organizationService.update(organization.id, {
        name: editForm.name,
        bin: editForm.bin,
        address: editForm.address || undefined,
        contactPhone: editForm.contactPhone || undefined,
        contactEmail: editForm.contactEmail || undefined,
      });
      
      toast.success('Данные организации обновлены');
      setIsEditing(false);
      await fetchOrganizationData();
      
    } catch (error: unknown) {
      console.error('Error updating organization:', error);
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
    if (!organization) return;
    
    if (users.length > 0) {
      toast.error('Нельзя удалить организацию, у которой есть пользователи');
      return;
    }
    
    if (window.confirm(`Вы уверены, что хотите удалить организацию "${organization.name}"? Это действие нельзя отменить.`)) {
      try {
        await organizationService.delete(organization.id);
        toast.success('Организация удалена');
        router.push('/admin/organizations');
      } catch (error: unknown) {
        console.error('Error deleting organization:', error);
        if (error && typeof error === 'object' && 'response' in error) {
          const apiError = error as ApiError;
          toast.error(apiError.response?.data?.error || 'Ошибка при удалении');
        } else {
          toast.error('Ошибка при удалении');
        }
      }
    }
  };


  const getContractStatus = (status: string) => {
    switch (status) {
      case 'active': return { text: 'Активен', color: 'green' };
      case 'expired': return { text: 'Истек', color: 'red' };
      case 'terminated': return { text: 'Расторгнут', color: 'gray' };
      default: return { text: status, color: 'gray' };
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка данных организации...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className={styles.errorContainer}>
        <i className="ri-error-warning-line"></i>
        <h2>Организация не найдена</h2>
        <Link href="/admin/organizations" className={styles.backButton}>
          <i className="ri-arrow-left-line"></i>
          Вернуться к списку
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header role='admin'/>

      <main className={styles.main}>
        {/* Статистика */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
              <i className="ri-contract-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Договоры</p>
              <p className={styles.statValue}>{contracts?.length}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
              <i className="ri-user-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Пользователи</p>
              <p className={styles.statValue}>{users.length}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
              <i className="ri-car-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Номера в списках</p>
              <p className={styles.statValue}>{approvedPlates?.length}</p>
            </div>
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
            className={`${styles.tab} ${activeTab === 'contracts' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('contracts')}
          >
            <i className="ri-file-copy-line"></i>
            Договоры ({contracts?.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'users' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <i className="ri-user-line"></i>
            Пользователи ({users.length})
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
                  <i className="ri-building-4-line"></i>
                  Информация об организации
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
                    <label htmlFor="name">
                      Название организации <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={editForm.name}
                      onChange={handleChange}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="bin">
                      БИН <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      id="bin"
                      name="bin"
                      value={editForm.bin}
                      onChange={handleChange}
                      className={styles.input}
                      maxLength={12}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="address">Адрес</label>
                    <textarea
                      id="address"
                      name="address"
                      value={editForm.address}
                      onChange={handleChange}
                      className={styles.textarea}
                      rows={3}
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="contactPhone">Контактный телефон</label>
                      <input
                        type="tel"
                        id="contactPhone"
                        name="contactPhone"
                        value={editForm.contactPhone}
                        onChange={handleChange}
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="contactEmail">Email</label>
                      <input
                        type="email"
                        id="contactEmail"
                        name="contactEmail"
                        value={editForm.contactEmail}
                        onChange={handleChange}
                        className={styles.input}
                      />
                    </div>
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
                    <span className={styles.infoLabel}>Название:</span>
                    <span className={styles.infoValue}>{organization.name}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>БИН:</span>
                    <span className={styles.infoValue}>{organization.bin}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Адрес:</span>
                    <span className={styles.infoValue}>{organization.address || '—'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Контактный телефон:</span>
                    <span className={styles.infoValue}>{organization.contactPhone || '—'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Email:</span>
                    <span className={styles.infoValue}>{organization.contactEmail || '—'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Дата создания:</span>
                    <span className={styles.infoValue}>{formatDate(organization.createdAt)}</span>
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
                      disabled={users.length > 0}
                      title={users.length > 0 ? 'Нельзя удалить организацию с пользователями' : ''}
                    >
                      <i className="ri-delete-bin-line"></i>
                      Удалить организацию
                    </button>
                  </div>
                  {users.length > 0 && (
                    <p className={styles.warning}>
                      <i className="ri-error-warning-line"></i>
                      Невозможно удалить организацию, так как к ней привязаны пользователи
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Вкладка договоров */}
          {activeTab === 'contracts' && (
            <div className={styles.listCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <i className="ri-file-copy-line"></i>
                  Договоры организации
                </h2>
                <Link
                  href={`/admin/contracts/new?organizationId=${organization.id}`}
                  className={styles.createButton}
                >
                  <i className="ri-add-line"></i>
                  Новый договор
                </Link>
              </div>

              {contracts.length > 0 ? (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Номер договора</th>
                        <th>Тип</th>
                        <th>Дата договора</th>
                        <th>Срок действия</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((contract) => {
                        const status = getContractStatus(contract.status);
                        return (
                          <tr key={contract.id}>
                            <td>
                              <div className={styles.contractNumberCell}>
                                <span className={styles.contractNumber}>{contract.contractNumber}</span>
                                <button
                                  onClick={() => copyToClipboard(contract.contractNumber, 'Номер договора')}
                                  className={styles.copyButton}
                                  title="Копировать номер договора"
                                >
                                  <i className="ri-file-copy-line"></i>
                                </button>
                              </div>
                            </td>
                            <td>
                              <span className={styles.contractType}>
                                {contract.contractType === 'standard' ? 'Стандартный' :
                                 contract.contractType === 'vip' ? 'VIP' : 'Временный'}
                              </span>
                            </td>
                            <td>{formatDate(contract.contractDate)}</td>
                            <td>
                              {contract.validUntil 
                                ? `${formatDate(contract.validFrom)} - ${formatDate(contract.validUntil)}`
                                : `с ${formatDate(contract.validFrom)} (бессрочно)`}
                            </td>
                            <td>
                              <span className={`${styles.statusBadge} ${styles[`status${status.color}`]}`}>
                                {status.text}
                              </span>
                            </td>
                            <td>
                              <div className={styles.actionButtons}>
                                <Link
                                  href={`/admin/contracts/${contract.id}`}
                                  className={`${styles.actionButton} ${styles.viewButton}`}
                                  title="Просмотр"
                                >
                                  <i className="ri-eye-line"></i>
                                </Link>
                                <Link
                                  href={`/admin/contracts/${contract.id}/edit`}
                                  className={`${styles.actionButton} ${styles.editButton}`}
                                  title="Редактировать"
                                >
                                  <i className="ri-pencil-line"></i>
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
                  <i className="ri-file-copy-line"></i>
                  <h3>Нет договоров</h3>
                  <p>У этой организации пока нет договоров</p>
                  <Link
                    href={`/admin/contracts/new?organizationId=${organization.id}`}
                    className={styles.emptyStateButton}
                  >
                    <i className="ri-add-line"></i>
                    Создать первый договор
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Вкладка пользователей */}
          {activeTab === 'users' && (
            <div className={styles.listCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <i className="ri-user-line"></i>
                  Пользователи организации
                </h2>
                <Link
                  href={`/admin/users/new?organizationId=${organization.id}`}
                  className={styles.createButton}
                >
                  <i className="ri-add-line"></i>
                  Новый пользователь
                </Link>
              </div>

              {users.length > 0 ? (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Пользователь</th>
                        <th>Роль</th>
                        <th>Контакты</th>
                        <th>Статус</th>
                        <th>Дата создания</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className={styles.userInfo}>
                              <span className={styles.userName}>{user.fullName}</span>
                              <span className={styles.userUsername}>@{user.username}</span>
                            </div>
                          </td>
                          <td>
                            <span className={styles.roleName}>{getRoleName(user.roleId)}</span>
                          </td>
                          <td>
                            <div className={styles.contactInfo}>
                              {user.email && (
                                <span className={styles.contactItem}>
                                  <i className="ri-mail-line"></i>
                                  {user.email}
                                </span>
                              )}
                              {user.phone && (
                                <span className={styles.contactItem}>
                                  <i className="ri-phone-line"></i>
                                  {user.phone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${user.isActive ? styles.statusActive : styles.statusInactive}`}>
                              {user.isActive ? 'Активен' : 'Неактивен'}
                            </span>
                          </td>
                          <td>{formatDate(user.createdAt)}</td>
                          <td>
                            <div className={styles.actionButtons}>
                              <Link
                                href={`/admin/users/${user.id}`}
                                className={`${styles.actionButton} ${styles.viewButton}`}
                                title="Просмотр"
                              >
                                <i className="ri-eye-line"></i>
                              </Link>
                              <Link
                                href={`/admin/users/${user.id}/edit`}
                                className={`${styles.actionButton} ${styles.editButton}`}
                                title="Редактировать"
                              >
                                <i className="ri-pencil-line"></i>
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
                  <i className="ri-user-line"></i>
                  <h3>Нет пользователей</h3>
                  <p>У этой организации пока нет пользователей</p>
                  <Link
                    href={`/admin/users/new?organizationId=${organization.id}`}
                    className={styles.emptyStateButton}
                  >
                    <i className="ri-add-line"></i>
                    Создать первого пользователя
                  </Link>
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
                  Номера в списках
                </h2>
                <Link
                  href={`/admin/approved-plates/new?organizationId=${organization.id}`}
                  className={styles.createButton}
                >
                  <i className="ri-add-line"></i>
                  Добавить номер
                </Link>
              </div>

              {approvedPlates?.length > 0 ? (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Номер</th>
                        <th>Список</th>
                        <th>Автомобиль</th>
                        <th>Срок действия</th>
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
                          <td>
                            <span className={styles.listName}>{plate.listName || 'Не указан'}</span>
                          </td>
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
                            {plate.validUntil 
                              ? `до ${formatDate(plate.validUntil)}`
                              : 'бессрочно'}
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
                  <p>У этой организации пока нет номеров в списках</p>
                  <Link
                    href={`/admin/approved-plates/new?organizationId=${organization.id}`}
                    className={styles.emptyStateButton}
                  >
                    <i className="ri-add-line"></i>
                    Добавить первый номер
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}