"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import userService from '@/services/user.service';
import organizationService from '@/services/organization.service';
import accessListService from '@/services/access-list.service';
import { User, Organization, AccessList, ApiError } from '@/types';
import { getRoleName, getRoleColor } from '@/utils/roleRedirect';
import { formatDate } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Разворачиваем Promise с помощью React.use()
  const { id } = use(params);
  
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userLists, setUserLists] = useState<AccessList[]>([]);
  const [allLists, setAllLists] = useState<AccessList[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'lists'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    roleId: 0,
    organizationId: '',
    isActive: true,
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);

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
      fetchUserData();
      fetchOrganizations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, id]);

  const fetchOrganizations = async () => {
    try {
      const orgsData = await organizationService.getAll();
      setOrganizations(orgsData);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Загружаем данные пользователя
      const userData = await userService.getById(id);
      setUser(userData);
      
      // Заполняем форму редактирования
      setEditForm({
        fullName: userData.fullName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        roleId: userData.roleId,
        organizationId: userData.organizationId || '',
        isActive: userData.isActive,
      });
      
      // Загружаем организацию пользователя
      if (userData.organizationId) {
        try {
          const orgData = await organizationService.getById(userData.organizationId);
          setOrganization(orgData);
        } catch (error) {
          console.error('Error fetching organization:', error);
        }
      }
      
      // Загружаем все списки и права пользователя
      const [allListsData, userListsData] = await Promise.all([
        accessListService.getAll(),
        accessListService.getUserPermissions(id),
      ]);
      
      setAllLists(allListsData);
      setUserLists(userListsData);
      
    } catch (error: unknown) {
      console.error('Error fetching user data:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        if (apiError.response?.status === 404) {
          toast.error('Пользователь не найден');
          router.push('/admin/users');
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
    if (user) {
      setEditForm({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        roleId: user.roleId,
        organizationId: user.organizationId || '',
        isActive: user.isActive,
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      await userService.update(user.id, {
        fullName: editForm.fullName,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        organizationId: editForm.organizationId || undefined,
        roleId: editForm.roleId,
        isActive: editForm.isActive,
      });
      
      toast.success('Данные пользователя обновлены');
      setIsEditing(false);
      await fetchUserData();
      
    } catch (error: unknown) {
      console.error('Error updating user:', error);
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

  const handleToggleList = async (listId: string) => {
    try {
      const hasPermission = userLists?.some(list => list.id === listId);
      
      if (hasPermission) {
        await accessListService.removeUserPermission(id, listId);
        toast.success('Право удалено');
      } else {
        await accessListService.addUserPermission(id, listId);
        toast.success('Право добавлено');
      }
      
      // Обновляем списки
      const updatedLists = await accessListService.getUserPermissions(id);
      setUserLists(updatedLists);
      
    } catch (error) {
      console.error('Error toggling list permission:', error);
      toast.error('Ошибка при изменении прав');
    }
  };

  const handleDeactivate = async () => {
    if (!user) return;
    
    if (window.confirm(`Вы уверены, что хотите ${user.isActive ? 'деактивировать' : 'активировать'} пользователя ${user.fullName}?`)) {
      try {
        await userService.update(user.id, { isActive: !user.isActive });
        toast.success(`Пользователь ${user.isActive ? 'деактивирован' : 'активирован'}`);
        await fetchUserData();
      } catch (error) {
        console.error('Error toggling user status:', error);
        toast.error('Ошибка при изменении статуса');
      }
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    
    if (window.confirm(`Вы уверены, что хотите удалить пользователя ${user.fullName}? Это действие нельзя отменить.`)) {
      try {
        await userService.delete(user.id);
        toast.success('Пользователь удален');
        router.push('/admin/users');
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Ошибка при удалении пользователя');
      }
    }
  };


  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка данных пользователя...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.errorContainer}>
        <i className="ri-error-warning-line"></i>
        <h2>Пользователь не найден</h2>
        <Link href="/admin/users" className={styles.backButton}>
          <i className="ri-arrow-left-line"></i>
          Вернуться к списку
        </Link>
      </div>
    );
  }

  const roleColor = getRoleColor(user.roleId);
  const roleName = getRoleName(user.roleId);

  return (
    <div className={styles.container}>
      <Header role='admin'/>
      {/* Верхняя панель */}
      {/* <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <Link href="/admin/users" className={styles.backLink}>
              <i className="ri-arrow-left-line"></i>
              <span>К списку пользователей</span>
            </Link>
            <div>
              <h1 className={styles.title}>{user.fullName}</h1>
              <p className={styles.subtitle}>
                @{user.username} • {roleName}
              </p>
            </div>
          </div>
          <div className={styles.userInfo}>
            <span className={styles.roleBadge} style={{ backgroundColor: `${roleColor}20`, color: roleColor }}>
              {roleName}
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
            className={`${styles.tab} ${activeTab === 'lists' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('lists')}
          >
            <i className="ri-list-check-3"></i>
            Списки доступа
          </button>
        </div>

        {/* Контент вкладок */}
        <div className={styles.tabContent}>
          {/* Вкладка информации */}
          {activeTab === 'info' && (
            <div className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <i className="ri-user-settings-line"></i>
                  Профиль пользователя
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
                    <label htmlFor="fullName">ФИО</label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={editForm.fullName}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="email">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleChange}
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="phone">Телефон</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={editForm.phone}
                        onChange={handleChange}
                        className={styles.input}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="roleId">Роль</label>
                      <select
                        id="roleId"
                        name="roleId"
                        value={editForm.roleId}
                        onChange={handleChange}
                        className={styles.select}
                      >
                        <option value="1">Администратор</option>
                        <option value="2">Оператор</option>
                        <option value="3">Руководитель</option>
                        <option value="4">Участник</option>
                        <option value="5">Охрана</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="organizationId">Организация</label>
                      <select
                        id="organizationId"
                        name="organizationId"
                        value={editForm.organizationId}
                        onChange={handleChange}
                        className={styles.select}
                      >
                        <option value="">Нет организации</option>
                        {organizations?.map(org => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
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
                    <span className={styles.infoLabel}>Логин:</span>
                    <span className={styles.infoValue}>{user.username}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Email:</span>
                    <span className={styles.infoValue}>{user.email || '—'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Телефон:</span>
                    <span className={styles.infoValue}>{user.phone || '—'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Роль:</span>
                    <span className={styles.infoValue}>
                      <span className={styles.rolePill} style={{ backgroundColor: `${roleColor}20`, color: roleColor }}>
                        {roleName}
                      </span>
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Организация:</span>
                    <span className={styles.infoValue}>
                      {organization ? (
                        <Link href={`/admin/organizations/${organization.id}`} className={styles.orgLink}>
                          {organization.name}
                        </Link>
                      ) : '—'}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Статус:</span>
                    <span className={styles.infoValue}>
                      <span className={`${styles.statusBadge} ${user.isActive ? styles.statusActive : styles.statusInactive}`}>
                        {user.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Дата создания:</span>
                    <span className={styles.infoValue}>{formatDate(user.createdAt)}</span>
                  </div>
                  {user.lastLogin && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Последний вход:</span>
                      <span className={styles.infoValue}>{formatDate(user.lastLogin)}</span>
                    </div>
                  )}
                </div>
              )}

              {!isEditing && (
                <div className={styles.dangerZone}>
                  {/* <h3 className={styles.dangerTitle}>Опасная зона</h3> */}
                  <div className={styles.dangerActions}>
                    <button
                      onClick={handleDeactivate}
                      className={`${styles.dangerButton} ${user.isActive ? styles.deactivateButton : styles.activateButton}`}
                    >
                      <i className={user.isActive ? 'ri-pause-circle-line' : 'ri-play-circle-line'}></i>
                      {user.isActive ? 'Деактивировать' : 'Активировать'}
                    </button>
                    <button
                      onClick={handleDelete}
                      className={`${styles.dangerButton} ${styles.deleteButton}`}
                    >
                      <i className="ri-delete-bin-line"></i>
                      Удалить пользователя
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Вкладка списков доступа */}
          {activeTab === 'lists' && (
            <div className={styles.listsCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <i className="ri-list-check-3"></i>
                  Доступные списки
                </h2>
                <p className={styles.cardDescription}>
                  {user.roleId === 4 
                    ? 'Списки, на которые участник может подавать заявки'
                    : user.roleId === 2
                    ? 'Списки, которые оператор может просматривать'
                    : 'Управление правами доступа к спискам'}
                </p>
              </div>

              <div className={styles.listsGrid}>
                {allLists.map(list => {
                  const hasPermission = userLists?.some(l => l.id === list.id);
                  return (
                    <div
                      key={list.id}
                      className={`${styles.listItem} ${hasPermission ? styles.listItemActive : ''}`}
                      style={{
                        borderColor: hasPermission ? list.color : '#e5e7eb',
                        backgroundColor: hasPermission ? `${list.color}10` : 'white',
                      }}
                    >
                      <div className={styles.listInfo}>
                        <span className={styles.listColor} style={{ backgroundColor: list.color }}></span>
                        <div>
                          <span className={styles.listName}>{list.name}</span>
                          {list.description && (
                            <span className={styles.listDescription}>{list.description}</span>
                          )}
                        </div>
                      </div>
                      
                      {(user.roleId === 4 || user.roleId === 2) && (
                        <button
                          onClick={() => handleToggleList(list.id)}
                          className={`${styles.permissionButton} ${hasPermission ? styles.permissionRemove : styles.permissionAdd}`}
                        >
                          {hasPermission ? (
                            <>
                              <i className="ri-close-line"></i>
                              Убрать
                            </>
                          ) : (
                            <>
                              <i className="ri-add-line"></i>
                              Добавить
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}