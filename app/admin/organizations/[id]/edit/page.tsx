"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import organizationService from '@/services/organization.service';
import { Organization, ApiError } from '@/types';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function EditOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
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
      
      const orgData = await organizationService.getById(id);
      setOrganization(orgData);
      
      setFormData({
        name: orgData.name || '',
        bin: orgData.bin || '',
        address: orgData.address || '',
        contactPhone: orgData.contactPhone || '',
        contactEmail: orgData.contactEmail || '',
      });
      
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organization) return;
    
    // Валидация
    if (!formData.name.trim()) {
      toast.error('Введите название организации');
      return;
    }
    
    if (!formData.bin.trim()) {
      toast.error('Введите БИН');
      return;
    }
    
    if (formData.bin.length !== 12) {
      toast.error('БИН должен содержать 12 цифр');
      return;
    }
    
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      toast.error('Введите корректный email');
      return;
    }

    try {
      setSaving(true);
      
      await organizationService.update(organization.id, {
        name: formData.name,
        bin: formData.bin,
        address: formData.address || undefined,
        contactPhone: formData.contactPhone || undefined,
        contactEmail: formData.contactEmail || undefined,
      });
      
      toast.success('Данные организации обновлены');
      router.push(`/admin/organizations/${id}`);
      
    } catch (error: unknown) {
      console.error('Error updating organization:', error);
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
      {/* Верхняя панель */}
      {/* <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <Link href={`/admin/organizations/${id}`} className={styles.backLink}>
              <i className="ri-arrow-left-line"></i>
              <span>К информации об организации</span>
            </Link>
            <div>
              <h1 className={styles.title}>Редактирование организации</h1>
              <p className={styles.subtitle}>
                {organization.name}
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
        <div className={styles.formCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <i className="ri-building-4-line"></i>
              Редактировать организацию
            </h2>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="name">
                Название организации <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={styles.input}
                placeholder="Введите название организации"
                disabled={saving}
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
                value={formData.bin}
                onChange={handleChange}
                className={styles.input}
                placeholder="Введите БИН"
                maxLength={12}
                disabled={saving}
                required
              />
              <p className={styles.help}>12 цифр</p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="address">Адрес</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="Введите адрес"
                rows={3}
                disabled={saving}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="contactPhone">Контактный телефон</label>
                <input
                  type="tel"
                  id="contactPhone"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="+7 (7172) 123-456"
                  disabled={saving}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="contactEmail">Email</label>
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="info@empire.kz"
                  disabled={saving}
                />
              </div>
            </div>


            <div className={styles.formActions}>
              <Link
                href={`/admin/organizations/${id}`}
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
      </main>
    </div>
  );
}