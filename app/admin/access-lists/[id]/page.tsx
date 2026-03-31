"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import accessListService from '@/services/access-list.service';
import approvedPlateService from '@/services/approved-plate.service';
import userService from '@/services/user.service';
import { AccessList, ApprovedPlate, User, ApiError } from '@/types';
import { formatDate } from '@/utils/format';
import { getRoleName } from '@/utils/roleRedirect';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function AccessListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { user: currentUser, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessList, setAccessList] = useState<AccessList | null>(null);
  const [approvedPlates, setApprovedPlates] = useState<ApprovedPlate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'plates' | 'users'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    color: '',
    priority: 0,
    isActive: true,
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
      fetchAccessListData();
    }
  }, [currentUser, id]);

 const fetchAccessListData = async () => {
  try {
    setLoading(true);
    
    // Загружаем данные списка
    const listData = await accessListService.getById(id);
    setAccessList(listData);
    
    // Заполняем форму редактирования
    setEditForm({
      name: listData.name || '',
      description: listData.description || '',
      color: listData.color || '',
      priority: listData.priority || 0,
      isActive: listData.isActive,
    });
    
    // Загружаем номера в списке
    const platesData = await approvedPlateService.getByListAdmin(id);
    setApprovedPlates(platesData);
    
    // Загружаем всех пользователей (операторов и участников)
    const allUsers = await userService.getAll();
    const filteredUsers = allUsers.filter(u => u.roleId === 2 || u.roleId === 4);
    
    // Загружаем права пользователей с проверкой на null
    const usersWithPermissions = await Promise.all(
      filteredUsers.map(async (user) => {
        try {
          const permissions = await accessListService.getUserPermissions(user.id);
          // Проверяем, что permissions - массив и не null
          const hasPermission = Array.isArray(permissions) 
            ? permissions.some(p => p && p.id === id)
            : false;
          return { ...user, hasPermission };
        } catch (error) {
          console.error(`Error fetching permissions for user ${user.id}:`, error);
          return { ...user, hasPermission: false };
        }
      })
    );
    setUsers(usersWithPermissions);
    
  } catch (error: unknown) {
    console.error('Error fetching access list:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as ApiError;
      if (apiError.response?.status === 404) {
        toast.error('Список не найден');
        router.push('/admin/access-lists');
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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (accessList) {
      setEditForm({
        name: accessList.name || '',
        description: accessList.description || '',
        color: accessList.color || '',
        priority: accessList.priority || 0,
        isActive: accessList.isActive,
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              name === 'priority' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSave = async () => {
    if (!accessList) return;
    
    try {
      setLoading(true);
      
      await accessListService.update(accessList.id, {
        name: editForm.name,
        description: editForm.description || undefined,
        color: editForm.color || undefined,
        priority: editForm.priority,
        isActive: editForm.isActive,
      });
      
      toast.success('Данные списка обновлены');
      setIsEditing(false);
      await fetchAccessListData();
      
    } catch (error: unknown) {
      console.error('Error updating access list:', error);
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
    if (!accessList) return;
    
    if (approvedPlates?.length > 0) {
      toast.error('Нельзя удалить список, в котором есть номера');
      return;
    }
    
    if (users.some(u => u.hasPermission)) {
      toast.error('Нельзя удалить список, к которому привязаны пользователи');
      return;
    }
    
    if (window.confirm(`Вы уверены, что хотите удалить список "${accessList.name}"? Это действие нельзя отменить.`)) {
      try {
        await accessListService.delete(accessList.id);
        toast.success('Список удален');
        router.push('/admin/access-lists');
      } catch (error: unknown) {
        console.error('Error deleting access list:', error);
        if (error && typeof error === 'object' && 'response' in error) {
          const apiError = error as ApiError;
          toast.error(apiError.response?.data?.error || 'Ошибка при удалении');
        } else {
          toast.error('Ошибка при удалении');
        }
      }
    }
  };

  const handleToggleUserPermission = async (userId: string, currentPermission: boolean) => {
    try {
      if (currentPermission) {
        await accessListService.removeUserPermission(userId, id);
        toast.success('Право доступа удалено');
      } else {
        await accessListService.addUserPermission(userId, id);
        toast.success('Право доступа добавлено');
      }
      
      // Обновляем список пользователей
      const updatedUsers = users.map(u => 
        u.id === userId ? { ...u, hasPermission: !currentPermission } : u
      );
      setUsers(updatedUsers);
      
    } catch (error) {
      console.error('Error toggling user permission:', error);
      toast.error('Ошибка при изменении прав доступа');
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
          <p className={styles.loadingText}>Загрузка данных списка...</p>
        </div>
      </div>
    );
  }

  if (!accessList) {
    return (
      <div className={styles.errorContainer}>
        <i className="ri-error-warning-line"></i>
        <h2>Список не найден</h2>
        <Link href="/admin/access-lists" className={styles.backButton}>
          <i className="ri-arrow-left-line"></i>
          Вернуться к списку
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header role='admin'/>
      {/* Верхняя панель */}
      {/* <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <Link href="/admin/access-lists" className={styles.backLink}>
              <i className="ri-arrow-left-line"></i>
              <span>К списку списков</span>
            </Link>
            <div>
              <h1 className={styles.title}>{accessList.name}</h1>
              <p className={styles.subtitle}>
                Управление списком доступа
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
        {/* Предпросмотр списка */}
        <div className={styles.previewSection}>
          <div className={styles.previewCard} style={{ backgroundColor: `${accessList.color}10` }}>
            <div className={styles.previewIcon} style={{ color: accessList.color }}>
              <i className="ri-list-check-3"></i>
            </div>
            <div className={styles.previewContent}>
              <h3 className={styles.previewName} style={{ color: accessList.color }}>
                {accessList.name}
              </h3>
              <p className={styles.previewDescription}>
                {accessList.description || 'Нет описания'}
              </p>
              <div className={styles.previewBadge} style={{ backgroundColor: accessList.color }}>
                Приоритет: {accessList.priority}
              </div>
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
            className={`${styles.tab} ${activeTab === 'plates' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('plates')}
          >
            <i className="ri-car-line"></i>
            Номера ({approvedPlates?.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'users' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <i className="ri-user-line"></i>
            Пользователи ({users.length})
          </button>
        </div>

        {/* Контент вкладок */}
        <div className={styles.tabContent}>
          {/* Вкладка информации */}
          {activeTab === 'info' && (
            <div className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <i className="ri-information-line"></i>
                  Информация о списке
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
                      Название списка <span className={styles.required}>*</span>
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
                    <label htmlFor="description">Описание</label>
                    <textarea
                      id="description"
                      name="description"
                      value={editForm.description}
                      onChange={handleChange}
                      className={styles.textarea}
                      rows={3}
                      placeholder="Краткое описание списка"
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="color">Цвет</label>
                      <div className={styles.colorInput}>
                        <input
                          type="color"
                          id="color"
                          name="color"
                          value={editForm.color}
                          onChange={handleChange}
                          className={styles.colorPicker}
                        />
                        <input
                          type="text"
                          name="color"
                          value={editForm.color}
                          onChange={handleChange}
                          className={styles.colorValue}
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="priority">Приоритет</label>
                      <input
                        type="number"
                        id="priority"
                        name="priority"
                        value={editForm.priority}
                        onChange={handleChange}
                        className={styles.input}
                        min="0"
                        max="999"
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={editForm.isActive}
                        onChange={handleChange}
                      />
                      <span>Активен</span>
                    </label>
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
                    <span className={styles.infoValue}>{accessList.name}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Описание:</span>
                    <span className={styles.infoValue}>{accessList.description || '—'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Цвет:</span>
                    <span className={styles.infoValue}>
                      <span className={styles.colorPreview} style={{ backgroundColor: accessList.color }}></span>
                      {accessList.color || '—'}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Приоритет:</span>
                    <span className={styles.infoValue}>{accessList.priority}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Статус:</span>
                    <span className={styles.infoValue}>
                      <span className={`${styles.statusBadge} ${accessList.isActive ? styles.statusActive : styles.statusInactive}`}>
                        {accessList.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Дата создания:</span>
                    <span className={styles.infoValue}>{formatDate(accessList.createdAt)}</span>
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
                      disabled={approvedPlates?.length > 0 || users?.some(u => u.hasPermission)}
                      title={
                        approvedPlates?.length > 0 
                          ? 'Нельзя удалить список с номерами' 
                          : users.some(u => u.hasPermission)
                          ? 'Нельзя удалить список, к которому привязаны пользователи'
                          : ''
                      }
                    >
                      <i className="ri-delete-bin-line"></i>
                      Удалить список
                    </button>
                  </div>
                  {(approvedPlates?.length > 0 || users?.some(u => u.hasPermission)) && (
                    <p className={styles.warning}>
                      <i className="ri-error-warning-line"></i>
                      {approvedPlates?.length > 0 && users?.some(u => u.hasPermission)
                        ? 'Невозможно удалить список, так как в нем есть номера и к нему привязаны пользователи'
                        : approvedPlates?.length > 0
                        ? 'Невозможно удалить список, так как в нем есть номера'
                        : 'Невозможно удалить список, так как к нему привязаны пользователи'}
                    </p>
                  )}
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
                  Номера в списке
                </h2>
                <Link
                  href={`/admin/approved-plates/new?listId=${accessList.id}`}
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
                        <th>Номер машины</th>
                        <th>Организация</th>
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
                          <td>{plate.organizationName || 'Не указана'}</td>
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
                              <Link
                                href={`/admin/approved-plates/${plate.id}/edit`}
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
                  <i className="ri-car-line"></i>
                  <h3>Нет номеров</h3>
                  <p>В этом списке пока нет номеров</p>
                  <Link
                    href={`/admin/approved-plates/new?listId=${accessList.id}`}
                    className={styles.emptyStateButton}
                  >
                    <i className="ri-add-line"></i>
                    Добавить первый номер
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
                  Пользователи с доступом
                </h2>
                <p className={styles.cardDescription}>
                  Управление правами доступа к списку
                </p>
              </div>

              {users.length > 0 ? (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Пользователь</th>
                        <th>Роль</th>
                        <th>Организация</th>
                        <th>Доступ к списку</th>
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
                          <td>{user.organizationName || '—'}</td>
                          <td>
                            <span className={`${styles.permissionBadge} ${user.hasPermission ? styles.permissionYes : styles.permissionNo}`}>
                              {user.hasPermission ? 'Есть доступ' : 'Нет доступа'}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => handleToggleUserPermission(user.id, user.hasPermission || false)}
                              className={`${styles.permissionButton} ${user.hasPermission ? styles.permissionRemove : styles.permissionAdd}`}
                            >
                              {user.hasPermission ? (
                                <>
                                  <i className="ri-close-line"></i>
                                  Убрать доступ
                                </>
                              ) : (
                                <>
                                  <i className="ri-add-line"></i>
                                  Добавить доступ
                                </>
                              )}
                            </button>
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
                  <p>Список не привязан к пользователям</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}