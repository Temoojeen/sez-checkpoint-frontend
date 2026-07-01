"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import userService from '@/services/user.service';
import organizationService from '@/services/organization.service';
import { User, Organization, ApiError } from '@/types';
import { getRoleName, getRoleColor } from '@/utils/roleRedirect';
import { formatDate } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<number | 'all'>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    operators: 0,
    supervisors: 0,
    participants: 0,
    security: 0,
    smartParking: 0,
    passManagers: 0,
    active: 0,
    inactive: 0,
  });

  useEffect(() => {
    if (user && user.roleId !== 1) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  useEffect(() => {
    if (user && user.roleId === 1) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [usersData, orgsData] = await Promise.all([
        userService.getAll(),
        organizationService.getAll(),
      ]);
      
      setUsers(usersData);
      setOrganizations(orgsData);
      
      const newStats = {
        total: usersData.length,
        admins: usersData.filter(u => u.roleId === 1).length,
        operators: usersData.filter(u => u.roleId === 2).length,
        supervisors: usersData.filter(u => u.roleId === 3).length,
        participants: usersData.filter(u => u.roleId === 4).length,
        security: usersData.filter(u => u.roleId === 5).length,
        smartParking: usersData.filter(u => u.roleId === 6).length,
        passManagers: usersData.filter(u => u.roleId === 7).length,
        active: usersData.filter(u => u.isActive).length,
        inactive: usersData.filter(u => !u.isActive).length,
      };
      setStats(newStats);
      
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Ошибка при загрузке пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean, name: string) => {
    try {
      console.log(name)
      await userService.update(id, { isActive: !isActive });
      toast.success(`Пользователь ${!isActive ? 'активирован' : 'деактивирован'}`);
      fetchData();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Ошибка при изменении статуса');
    }
  };

  const handleHardDelete = async (id: string, name: string) => {
    if (window.confirm(`Вы уверены, что хотите ПОЛНОСТЬЮ удалить пользователя "${name}"?\n\nЭто действие нельзя отменить.`)) {
      try {
        await userService.hardDelete(id);
        toast.success('Пользователь полностью удален');
        fetchData();
      } catch (error: unknown) {
        console.error('Error hard deleting user:', error);
        if (error && typeof error === 'object' && 'response' in error) {
          const apiError = error as ApiError;
          toast.error(apiError.response?.data?.error || 'Ошибка при удалении');
        } else {
          toast.error('Ошибка при удалении');
        }
      }
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setOrgFilter('all');
  };

  const getOrganizationName = (orgId: string | undefined | null) => {
    if (!orgId) return null;
    const org = organizations.find(o => o.id === orgId);
    return org?.name;
  };

  const filteredUsers = users.filter(user => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        user.fullName.toLowerCase().includes(term) ||
        user.username.toLowerCase().includes(term) ||
        (user.email?.toLowerCase() || '').includes(term) ||
        (user.phone?.toLowerCase() || '').includes(term);
      
      if (!matchesSearch) return false;
    }
    
    if (roleFilter !== 'all' && user.roleId !== roleFilter) return false;
    
    if (orgFilter !== 'all' && user.organizationId !== orgFilter) return false;
    
    return true;
  });

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка пользователей...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header role='admin'/>

      <main className={styles.main}>
        {/* Верхняя панель с заголовком и кнопкой создания */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderLeft}>
            <h2 className={styles.pageTitle}>Управление пользователями</h2>
            <p className={styles.pageSubtitle}>
              Всего пользователей: <span className={styles.userCount}>{stats.total}</span>
            </p>
          </div>
          <Link href="/admin/users/new" className={styles.createButton}>
            <i className="ri-user-add-line"></i>
            <span>Создать пользователя</span>
          </Link>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
              <i className="ri-user-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Всего пользователей</p>
              <p className={styles.statValue}>{stats.total}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
              <i className="ri-checkbox-circle-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Активных</p>
              <p className={styles.statValue}>{stats.active}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <i className="ri-close-circle-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Неактивных</p>
              <p className={styles.statValue}>{stats.inactive}</p>
            </div>
          </div>
        </div>

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
                placeholder="Поиск по имени, email или телефону..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className={styles.searchInput} 
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className={styles.clearSearch}>
                  <i className="ri-close-line"></i>
                </button>
              )}
            </div>

            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} 
              className={styles.select}
            >
              <option value="all">Все роли</option>
              <option value="1">Администраторы</option>
              <option value="2">Операторы КПП 1</option>
              <option value="6">Операторы SmartParking</option>
              <option value="3">Руководители</option>
              <option value="4">Участники</option>
              <option value="5">Охрана</option>
              <option value="7">Менеджеры пропусков</option>
            </select>

            <select 
              value={orgFilter} 
              onChange={(e) => setOrgFilter(e.target.value)} 
              className={styles.select}
            >
              <option value="all">Все организации</option>
              {organizations?.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          {(searchTerm || roleFilter !== 'all' || orgFilter !== 'all') && (
            <div className={styles.filtersActions}>
              <button onClick={handleClearFilters} className={styles.clearFiltersButton}>
                <i className="ri-close-line"></i>
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>

        <div className={styles.tableContainer}>
          {filteredUsers.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Роль</th>
                  <th>Организация</th>
                  <th>Контакты</th>
                  <th>Статус</th>
                  <th>Дата создания</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((userItem) => {
                  const roleColor = getRoleColor(userItem.roleId);
                  const roleName = getRoleName(userItem.roleId);
                  const orgName = getOrganizationName(userItem.organizationId);
                  
                  return (
                    <tr key={userItem.id}>
                      <td>
                        <div className={styles.userInfo}>
                          <span className={styles.userName}>{userItem.fullName}</span>
                          <span className={styles.userUsername}>@{userItem.username}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.roleBadge} style={{ backgroundColor: `${roleColor}20`, color: roleColor }}>
                          {roleName}
                        </span>
                      </td>
                      <td>
                        {orgName ? (
                          <span className={styles.organizationName}>
                            <i className="ri-building-4-line"></i>
                            {orgName}
                          </span>
                        ) : (
                          <span className={styles.organizationName}>—</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.contactInfo}>
                          {userItem.email && (
                            <span className={styles.contactItem}>
                              <i className="ri-mail-line"></i>
                              {userItem.email}
                            </span>
                          )}
                          {userItem.phone && (
                            <span className={styles.contactItem}>
                              <i className="ri-phone-line"></i>
                              {userItem.phone}
                            </span>
                          )}
                          {!userItem.email && !userItem.phone && (
                            <span className={styles.contactItem}>—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${userItem.isActive ? styles.statusActive : styles.statusInactive}`}>
                          {userItem.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                      </td>
                      <td>{formatDate(userItem.createdAt)}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <Link href={`/admin/users/${userItem.id}`} className={`${styles.actionButton} ${styles.viewButton}`} title="Просмотр">
                            <i className="ri-eye-line"></i>
                          </Link>
                          <Link href={`/admin/users/${userItem.id}/edit`} className={`${styles.actionButton} ${styles.editButton}`} title="Редактировать">
                            <i className="ri-pencil-line"></i>
                          </Link>
                          <button 
                            onClick={() => handleToggleActive(userItem.id, userItem.isActive, userItem.fullName)} 
                            className={`${styles.actionButton} ${userItem.isActive ? styles.warnButton : styles.successButton}`} 
                            title={userItem.isActive ? 'Деактивировать' : 'Активировать'}
                          >
                            <i className={userItem.isActive ? 'ri-pause-circle-line' : 'ri-play-circle-line'}></i>
                          </button>
                          <button 
                            onClick={() => handleHardDelete(userItem.id, userItem.fullName)} 
                            className={`${styles.actionButton} ${styles.deleteButton}`} 
                            title="Удалить полностью"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <i className="ri-user-search-line"></i>
              <h3 className={styles.emptyStateTitle}>Пользователи не найдены</h3>
              <p className={styles.emptyStateText}>
                {searchTerm || roleFilter !== 'all' || orgFilter !== 'all' 
                  ? 'Попробуйте изменить параметры фильтрации' 
                  : 'В системе пока нет пользователей'}
              </p>
              {(searchTerm || roleFilter !== 'all' || orgFilter !== 'all') && (
                <button onClick={handleClearFilters} className={styles.clearFiltersButton}>
                  <i className="ri-close-line"></i>
                  Сбросить фильтры
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}