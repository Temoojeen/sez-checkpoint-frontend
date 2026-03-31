"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import userService from '@/services/user.service';
import organizationService from '@/services/organization.service';
import accessListService from '@/services/access-list.service';
import { Organization, AccessList, ApiError } from '@/types';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function NewUserPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [accessLists, setAccessLists] = useState<AccessList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    organizationId: '',
    roleId: '4', // По умолчанию "Участник"
  });

  // Загружаем список организаций и списков доступа при монтировании
  useEffect(() => {
    fetchOrganizations();
    fetchAccessLists();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const orgs = await organizationService.getAll();
      setOrganizations(orgs);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Ошибка при загрузке списка организаций');
    }
  };

  const fetchAccessLists = async () => {
    try {
      const lists = await accessListService.getAll();
      setAccessLists(lists);
    } catch (error) {
      console.error('Error fetching access lists:', error);
      toast.error('Ошибка при загрузке списков доступа');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Если роль меняется на не-участника и не-оператора, сбрасываем выбранные списки
    if (name === 'roleId' && value !== '4' && value !== '2') {
      setSelectedLists([]);
    }
  };

  const handleListToggle = (listId: string) => {
    setSelectedLists(prev => {
      if (prev.includes(listId)) {
        return prev.filter(id => id !== listId);
      } else {
        return [...prev, listId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedLists.length === accessLists.length) {
      setSelectedLists([]);
    } else {
      setSelectedLists(accessLists.map(list => list.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.username.trim()) {
      toast.error('Введите логин');
      return;
    }
    
    if (formData.username.length < 3) {
      toast.error('Логин должен содержать минимум 3 символа');
      return;
    }
    
    if (!formData.password.trim()) {
      toast.error('Введите пароль');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }
    
    if (!formData.fullName.trim()) {
      toast.error('Введите ФИО');
      return;
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Введите корректный email');
      return;
    }

    // Для участника обязательно выбрать организацию
    if (formData.roleId === '4' && !formData.organizationId) {
      toast.error('Для участника необходимо выбрать организацию');
      return;
    }

    try {
      setLoading(true);
      
      // Создаем пользователя
      const newUser = await userService.create({
        username: formData.username,
        password: formData.password,
        fullName: formData.fullName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        organizationId: formData.organizationId || undefined,
        roleId: parseInt(formData.roleId),
      });
      
      // Если это участник или оператор и выбраны списки, добавляем разрешения
      if ((formData.roleId === '4' || formData.roleId === '2') && selectedLists.length > 0) {
        try {
          for (const listId of selectedLists) {
            await accessListService.addUserPermission(newUser.id, listId);
          }
          toast.success(`Добавлены права на ${selectedLists.length} список(ов)`);
        } catch (error) {
          console.error('Error adding list permissions:', error);
          toast.error('Пользователь создан, но ошибка при добавлении прав на списки');
        }
      }
      
      toast.success('Пользователь успешно создан');
      router.push(`/admin/users/${newUser.id}`);
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        if (apiError.response?.data?.error) {
          toast.error(apiError.response.data.error);
        } else {
          toast.error('Ошибка при создании пользователя');
        }
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Ошибка при создании пользователя');
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleName = (roleId: string) => {
    switch (parseInt(roleId)) {
      case 1: return 'Администратор';
      case 2: return 'Оператор';
      case 3: return 'Руководитель';
      case 4: return 'Участник';
      case 5: return 'Охрана';
      default: return 'Неизвестно';
    }
  };

  // Показываем выбор списков для участника (4) и оператора (2)
  const showListSelection = formData.roleId === '4' || formData.roleId === '2';

  return (
    <div className={styles.container}>
      <Header role='admin'/>
      {/* Заголовок */}
      {/* <div className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>Новый пользователь</h1>
            <p className={styles.subtitle}>Создание нового пользователя системы</p>
          </div>
          <Link href="/admin/users" className={styles.backButton}>
            <i className="ri-arrow-left-line"></i>
            <span>Назад к списку</span>
          </Link>
        </div>
      </div> */}

      {/* Форма */}
      <div className={styles.main}>
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Логин */}
            <div className={styles.formGroup}>
              <label htmlFor="username" className={styles.label}>
                Логин <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={styles.input}
                placeholder="ivanov_i"
                disabled={loading}
                required
              />
              <p className={styles.help}>Минимум 3 символа</p>
            </div>

            {/* Пароль */}
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                Пароль <span className={styles.required}>*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={styles.input}
                placeholder="••••••••"
                disabled={loading}
                required
              />
              <p className={styles.help}>Минимум 6 символов</p>
            </div>

            {/* ФИО */}
            <div className={styles.formGroup}>
              <label htmlFor="fullName" className={styles.label}>
                ФИО <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className={styles.input}
                placeholder="Иванов Иван Иванович"
                disabled={loading}
                required
              />
            </div>

            {/* Роль */}
            <div className={styles.formGroup}>
              <label htmlFor="roleId" className={styles.label}>
                Роль <span className={styles.required}>*</span>
              </label>
              <select
                id="roleId"
                name="roleId"
                value={formData.roleId}
                onChange={handleChange}
                className={styles.select}
                disabled={loading}
                required
              >
                <option value="1">Администратор</option>
                <option value="2">Оператор</option>
                <option value="3">Руководитель</option>
                <option value="4">Участник</option>
                <option value="5">Охрана</option>
              </select>
              <p className={styles.help}>
                Выбрана роль: {getRoleName(formData.roleId)}
              </p>
            </div>

            {/* Организация (только для участника) */}
            {formData.roleId === '4' && (
              <div className={styles.formGroup}>
                <label htmlFor="organizationId" className={styles.label}>
                  Организация <span className={styles.required}>*</span>
                </label>
                <select
                  id="organizationId"
                  name="organizationId"
                  value={formData.organizationId}
                  onChange={handleChange}
                  className={styles.select}
                  disabled={loading || organizations.length === 0}
                  required
                >
                  <option value="">Выберите организацию</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.bin})
                    </option>
                  ))}
                </select>
                {organizations.length === 0 && (
                  <p className={styles.error}>
                    Нет доступных организаций. 
                    <Link href="/admin/organizations/new" className={styles.errorLink}>
                      Создайте организацию
                    </Link>
                  </p>
                )}
              </div>
            )}

            {/* Списки доступа (для участника и оператора) */}
            {showListSelection && accessLists.length > 0 && (
              <div className={styles.formGroup}>
                <div className={styles.listsHeader}>
                  <label className={styles.label}>
                    {formData.roleId === '2' ? 'Списки для просмотра' : 'Списки для подачи заявок'}
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className={styles.selectAllButton}
                    disabled={loading}
                  >
                    {selectedLists.length === accessLists.length ? 'Снять все' : 'Выбрать все'}
                  </button>
                </div>
                <div className={styles.listsGrid}>
                  {accessLists.map((list) => (
                    <label
                      key={list.id}
                      className={styles.listItem}
                      style={{
                        borderColor: selectedLists.includes(list.id) ? list.color : '#e5e7eb',
                        backgroundColor: selectedLists.includes(list.id) ? `${list.color}10` : 'white',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLists.includes(list.id)}
                        onChange={() => handleListToggle(list.id)}
                        className={styles.listCheckbox}
                        disabled={loading}
                      />
                      <span className={styles.listColor} style={{ backgroundColor: list.color }}></span>
                      <div className={styles.listInfo}>
                        <span className={styles.listName}>{list.name}</span>
                        {list.description && (
                          <span className={styles.listDescription}>{list.description}</span>
                        )}
                      </div>
                      {list.priority !== undefined && (
                        <span className={styles.listPriority}>Приоритет: {list.priority}</span>
                      )}
                    </label>
                  ))}
                </div>
                <p className={styles.help}>
                  Выбрано списков: {selectedLists.length} из {accessLists.length}
                </p>
              </div>
            )}

            {/* Email (для всех ролей) */}
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.input}
                placeholder="ivan.ivanov@example.com"
                disabled={loading}
              />
            </div>

            {/* Телефон (для всех ролей) */}
            <div className={styles.formGroup}>
              <label htmlFor="phone" className={styles.label}>
                Телефон
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={styles.input}
                placeholder="+7 (777) 123-45-67"
                disabled={loading}
              />
            </div>

            {/* Информация о ролях */}
            <div className={styles.infoBox}>
              <i className="ri-information-line"></i>
              <div className={styles.infoContent}>
                <p className={styles.infoTitle}>О ролях:</p>
                <ul className={styles.infoList}>
                  <li><strong>Администратор</strong> - полный доступ к системе</li>
                  <li><strong>Оператор</strong> - обработка заявок и просмотр выбранных списков</li>
                  <li><strong>Руководитель</strong> - финальное утверждение</li>
                  <li><strong>Участник</strong> - подача заявок (требуется организация и списки)</li>
                  <li><strong>Охрана</strong> - просмотр списков и истории</li>
                </ul>
              </div>
            </div>

            {/* Кнопки */}
            <div className={styles.formActions}>
              <Link
                href="/admin/users"
                className={styles.cancelButton}
              >
                Отмена
              </Link>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="ri-loader-4-line ri-spin"></i>
                    <span>Создание...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-user-add-line"></i>
                    <span>Создать пользователя</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}