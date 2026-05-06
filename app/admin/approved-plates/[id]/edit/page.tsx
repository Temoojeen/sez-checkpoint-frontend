"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import approvedPlateService from '@/services/approved-plate.service';
import organizationService from '@/services/organization.service';
import accessListService from '@/services/access-list.service';
import { ApprovedPlate, Organization, AccessList, ApiError } from '@/types';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function EditApprovedPlatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plate, setPlate] = useState<ApprovedPlate | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [accessLists, setAccessLists] = useState<AccessList[]>([]);
  const [formData, setFormData] = useState({
    plateNumber: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleColor: '',
    organizationId: '',
    listId: '',
    validFrom: '',
    validUntil: '',
    notes: '',
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
    fetchData();
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentUser, id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Загружаем все необходимые данные
      const [allPlates, orgsData, listsData] = await Promise.all([
        approvedPlateService.getAll(),
        organizationService.getAll(),
        accessListService.getAll(),
      ]);
      
      // Находим нужный номер
      const plateData = allPlates.find(p => p.id === id);
      
      if (!plateData) {
        toast.error('Номер не найден');
        router.push('/admin/approved-plates');
        return;
      }
      
      setPlate(plateData);
      setOrganizations(orgsData);
      setAccessLists(listsData);
      
      // Заполняем форму
      setFormData({
        plateNumber: plateData.plateNumber || '',
        vehicleBrand: plateData.vehicleBrand || '',
        vehicleModel: plateData.vehicleModel || '',
        vehicleColor: plateData.vehicleColor || '',
        organizationId: plateData.organizationId || '',
        listId: plateData.listId || '',
        validFrom: plateData.validFrom || '',
        validUntil: plateData.validUntil || '',
        notes: plateData.notes || '',
        isActive: plateData.isActive,
      });
      
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!plate) return;
    
    // Валидация
    if (!formData.plateNumber.trim()) {
      toast.error('Введите государственный номер');
      return;
    }
    
    if (!formData.organizationId) {
      toast.error('Выберите организацию');
      return;
    }
    
    if (!formData.listId) {
      toast.error('Выберите список');
      return;
    }

    try {
      setSaving(true);
      
      // Проверяем, существует ли уже такой номер в этом списке (кроме текущего)
      const allPlates = await approvedPlateService.getAll();
      const duplicateExists = allPlates.some(p => 
        p.id !== id && 
        p.plateNumber === formData.plateNumber && 
        p.listId === formData.listId &&
        p.isActive
      );
      
      if (duplicateExists) {
        toast.error('Такой номер уже существует в этом списке');
        setSaving(false);
        return;
      }
      
      // Здесь должен быть метод update
      // Пока показываем сообщение, что функционал в разработке
      toast.success('Функционал обновления в разработке');
      
      /* 
      // Когда будет готово:
      await approvedPlateService.update(plate.id, {
        plateNumber: formData.plateNumber,
        vehicleBrand: formData.vehicleBrand || undefined,
        vehicleModel: formData.vehicleModel || undefined,
        vehicleColor: formData.vehicleColor || undefined,
        listId: formData.listId,
        validFrom: formData.validFrom || undefined,
        validUntil: formData.validUntil || undefined,
        notes: formData.notes || undefined,
        isActive: formData.isActive,
      });
      
      toast.success('Номер успешно обновлен');
      router.push(`/admin/approved-plates/${id}`);
      */
      
    } catch (error: unknown) {
      console.error('Error updating plate:', error);
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
          <p className={styles.loadingText}>Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (!plate) {
    return (
      <div className={styles.errorContainer}>
        <i className="ri-error-warning-line"></i>
        <h2>Номер не найден</h2>
        <Link href="/admin/approved-plates" className={styles.backButton}>
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
            <Link href={`/admin/approved-plates/${id}`} className={styles.backLink}>
              <i className="ri-arrow-left-line"></i>
              <span>К информации о номере</span>
            </Link>
            <div>
              <h1 className={styles.title}>Редактирование номера</h1>
              <p className={styles.subtitle}>
                {plate.plateNumber}
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
              <i className="ri-car-line"></i>
              Редактировать номер
            </h2>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Государственный номер */}
            <div className={styles.formGroup}>
              <label htmlFor="plateNumber">
                Государственный номер <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="plateNumber"
                name="plateNumber"
                value={formData.plateNumber}
                onChange={handleChange}
                className={styles.input}
                placeholder="123ABC01"
                maxLength={20}
                disabled={saving}
                required
              />
              <p className={styles.help}>Пример: 123ABC01 или A123BC</p>
            </div>

            {/* Организация */}
            <div className={styles.formGroup}>
              <label htmlFor="organizationId">
                Организация <span className={styles.required}>*</span>
              </label>
              <select
                id="organizationId"
                name="organizationId"
                value={formData.organizationId}
                onChange={handleChange}
                className={styles.select}
                disabled={saving || organizations.length === 0}
                required
              >
                <option value="">Выберите организацию</option>
                {organizations?.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.bin})
                  </option>
                ))}
              </select>
            </div>

            {/* Список */}
            <div className={styles.formGroup}>
              <label htmlFor="listId">
                Список <span className={styles.required}>*</span>
              </label>
              <select
                id="listId"
                name="listId"
                value={formData.listId}
                onChange={handleChange}
                className={styles.select}
                disabled={saving || accessLists.length === 0}
                required
              >
                <option value="">Выберите список</option>
                {accessLists.map(list => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Информация об автомобиле */}
            <div className={styles.sectionTitle}>
              <i className="ri-car-line"></i>
              Информация об автомобиле
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="vehicleBrand">Марка</label>
                <input
                  type="text"
                  id="vehicleBrand"
                  name="vehicleBrand"
                  value={formData.vehicleBrand}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Toyota"
                  disabled={saving}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="vehicleModel">Модель</label>
                <input
                  type="text"
                  id="vehicleModel"
                  name="vehicleModel"
                  value={formData.vehicleModel}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Camry"
                  disabled={saving}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="vehicleColor">Цвет</label>
                <input
                  type="text"
                  id="vehicleColor"
                  name="vehicleColor"
                  value={formData.vehicleColor}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Белый"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Срок действия */}
            <div className={styles.sectionTitle}>
              <i className="ri-calendar-line"></i>
              Срок действия
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="validFrom">Действует с</label>
                <input
                  type="date"
                  id="validFrom"
                  name="validFrom"
                  value={formData.validFrom}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={saving}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="validUntil">Действует до</label>
                <input
                  type="date"
                  id="validUntil"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={saving}
                  min={formData.validFrom}
                />
              </div>
            </div>

            {/* Примечания */}
            <div className={styles.formGroup}>
              <label htmlFor="notes">Примечания</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className={styles.textarea}
                rows={3}
                placeholder="Дополнительная информация"
                disabled={saving}
              />
            </div>

            {/* Статус */}
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  disabled={saving}
                />
                <span>Активен</span>
              </label>
              <p className={styles.help}>
                Неактивные номера не пропускаются через шлагбаум
              </p>
            </div>

            {/* Информационное сообщение */}
            <div className={styles.infoBox}>
              <i className="ri-information-line"></i>
              <div className={styles.infoContent}>
                <p className={styles.infoTitle}>Примечание:</p>
                <p className={styles.infoText}>
                  При изменении номера или списка проверяется уникальность. 
                  Один и тот же номер не может быть в одном списке дважды.
                </p>
              </div>
            </div>

            {/* Кнопки */}
            <div className={styles.formActions}>
              <Link
                href={`/admin/approved-plates/${id}`}
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