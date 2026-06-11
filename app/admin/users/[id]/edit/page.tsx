"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import userService from '@/services/user.service';
import organizationService from '@/services/organization.service';
import { User, Organization, ApiError } from '@/types';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  // Разворачиваем Promise с помощью React.use()
  const { id } = use(params);
  
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  
  // Форма профиля
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    roleId: 0,
    organizationId: '',
    isActive: true,
  });

  // Форма смены пароля
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordErrors, setPasswordErrors] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Состояния для видимости паролей
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      
      // Заполняем форму профиля
      setProfileForm({
        fullName: userData.fullName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        roleId: userData.roleId,
        organizationId: userData.organizationId || '',
        isActive: userData.isActive,
      });
      
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

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    
    // Очищаем ошибки при вводе
    if (passwordErrors[name as keyof typeof passwordErrors]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validatePassword = (): boolean => {
    const errors = {
      newPassword: '',
      confirmPassword: '',
    };

    if (!passwordForm.newPassword) {
      errors.newPassword = 'Введите новый пароль';
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'Пароль должен содержать минимум 6 символов';
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Подтвердите пароль';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Пароли не совпадают';
    }

    setPasswordErrors(errors);
    return !errors.newPassword && !errors.confirmPassword;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setSaving(true);
      
      await userService.update(user.id, {
        fullName: profileForm.fullName,
        email: profileForm.email || undefined,
        phone: profileForm.phone || undefined,
        organizationId: profileForm.organizationId || undefined,
        roleId: profileForm.roleId,
        isActive: profileForm.isActive,
      });
      
      toast.success('Данные пользователя обновлены');
      router.push(`/admin/users/${id}`);
      
    } catch (error: unknown) {
      console.error('Error updating user:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        toast.error(apiError.response?.data?.error || 'Ошибка при обновлении');
      } else {
        toast.error('Ошибка при обновлении');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!validatePassword()) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Используем новый метод для смены пароля
      await userService.updatePassword(user.id, passwordForm.newPassword);
      
      toast.success('Пароль успешно изменен');
      
      // Очищаем форму
      setPasswordForm({
        newPassword: '',
        confirmPassword: '',
      });
      
      // Через 2 секунды возвращаемся на страницу пользователя
      setTimeout(() => {
        router.push(`/admin/users/${id}`);
      }, 2000);
      
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        
        // Обрабатываем разные статусы ошибок
        if (apiError.response?.status === 404) {
          toast.error('Функция смены пароля временно недоступна. Пожалуйста, обратитесь к разработчику.');
        } else if (apiError.response?.status === 400) {
          toast.error(apiError.response.data?.error || 'Неверный формат пароля');
        } else {
          toast.error(apiError.response?.data?.error || 'Ошибка при смене пароля');
        }
      } else {
        toast.error('Ошибка при смене пароля');
      }
    } finally {
      setSaving(false);
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


  return (
    <div className={styles.container}>
      <Header role='admin'/>
      {/* Верхняя панель */}
      {/* <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <Link href={`/admin/users/${id}`} className={styles.backLink}>
              <i className="ri-arrow-left-line"></i>
              <span>К профилю пользователя</span>
            </Link>
            <div>
              <h1 className={styles.title}>Редактирование пользователя</h1>
              <p className={styles.subtitle}>
                {user.fullName} • {roleName}
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
            className={`${styles.tab} ${activeTab === 'profile' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <i className="ri-user-settings-line"></i>
            Редактировать профиль
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'password' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <i className="ri-lock-password-line"></i>
            Сменить пароль
          </button>
        </div>

        {/* Контент вкладок */}
        <div className={styles.tabContent}>
          {/* Вкладка редактирования профиля */}
          {activeTab === 'profile' && (
            <div className={styles.formCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <i className="ri-user-settings-line"></i>
                  Редактировать профиль
                </h2>
              </div>

              <form onSubmit={handleProfileSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="fullName">
                    ФИО <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={profileForm.fullName}
                    onChange={handleProfileChange}
                    className={styles.input}
                    required
                    disabled={saving}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      className={styles.input}
                      disabled={saving}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="phone">Телефон</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleProfileChange}
                      className={styles.input}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="roleId">
                      Роль <span className={styles.required}>*</span>
                    </label>
                    <select
                      id="roleId"
                      name="roleId"
                      value={profileForm.roleId}
                      onChange={handleProfileChange}
                      className={styles.select}
                      required
                      disabled={saving}
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
                      value={profileForm.organizationId}
                      onChange={handleProfileChange}
                      className={styles.select}
                      disabled={saving}
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
                      checked={profileForm.isActive}
                      onChange={handleProfileChange}
                      disabled={saving}
                    />
                    <span>Активен</span>
                  </label>
                </div>

                <div className={styles.infoBox}>
                  <i className="ri-information-line"></i>
                  <div className={styles.infoContent}>
                    <p className={styles.infoTitle}>Информация о ролях:</p>
                    <ul className={styles.infoList}>
                      <li><strong>Администратор</strong> - полный доступ к системе</li>
                      <li><strong>Оператор</strong> - обработка заявок и просмотр списков</li>
                      <li><strong>Руководитель</strong> - финальное утверждение заявок</li>
                      <li><strong>Участник</strong> - подача заявок</li>
                      <li><strong>Охрана</strong> - просмотр списков и истории проездов</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <Link
                    href={`/admin/users/${id}`}
                    className={styles.cancelButton}
                  >
                    Отмена
                  </Link>
                  <button
                    type="submit"
                    className={styles.saveButton}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <i className="ri-loader-4-line ri-spin"></i>
                        <span>Сохранение...</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line"></i>
                        <span>Сохранить изменения</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Вкладка смены пароля */}
          {activeTab === 'password' && (
            <div className={styles.formCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <i className="ri-lock-password-line"></i>
                  Сменить пароль
                </h2>
              </div>

              <form onSubmit={handlePasswordSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="newPassword">
                    Новый пароль <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      id="newPassword"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      className={`${styles.input} ${passwordErrors.newPassword ? styles.inputError : ''}`}
                      placeholder="Минимум 6 символов"
                      disabled={saving}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className={styles.passwordToggle}
                      aria-label={showNewPassword ? "Скрыть пароль" : "Показать пароль"}
                      tabIndex={-1}
                    >
                      <i className={`ri-${showNewPassword ? 'eye-off' : 'eye'}-line`}></i>
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className={styles.errorText}>{passwordErrors.newPassword}</p>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword">
                    Подтвердите пароль <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      className={`${styles.input} ${passwordErrors.confirmPassword ? styles.inputError : ''}`}
                      placeholder="Введите пароль еще раз"
                      disabled={saving}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={styles.passwordToggle}
                      aria-label={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
                      tabIndex={-1}
                    >
                      <i className={`ri-${showConfirmPassword ? 'eye-off' : 'eye'}-line`}></i>
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className={styles.errorText}>{passwordErrors.confirmPassword}</p>
                  )}
                </div>

                <div className={styles.passwordRequirements}>
                  <p className={styles.requirementsTitle}>Требования к паролю:</p>
                  <ul className={styles.requirementsList}>
                    <li className={passwordForm.newPassword.length >= 6 ? styles.requirementMet : ''}>
                      <i className={passwordForm.newPassword.length >= 6 ? 'ri-checkbox-circle-line' : 'ri-checkbox-blank-circle-line'}></i>
                      Минимум 6 символов
                    </li>
                    <li className={passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.confirmPassword ? styles.requirementMet : ''}>
                      <i className={passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.confirmPassword ? 'ri-checkbox-circle-line' : 'ri-checkbox-blank-circle-line'}></i>
                      Пароли совпадают
                    </li>
                  </ul>
                </div>

                <div className={styles.formActions}>
                  <Link
                    href={`/admin/users/${id}`}
                    className={styles.cancelButton}
                  >
                    Отмена
                  </Link>
                  <button
                    type="submit"
                    className={styles.saveButton}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <i className="ri-loader-4-line ri-spin"></i>
                        <span>Смена пароля...</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-lock-line"></i>
                        <span>Сменить пароль</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}