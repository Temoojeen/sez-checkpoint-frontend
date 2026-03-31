"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import approvedPlateService from '@/services/approved-plate.service';
import organizationService from '@/services/organization.service';
import accessListService from '@/services/access-list.service';
import userService from '@/services/user.service';
import { ApprovedPlate, Organization, AccessList, User, ApiError } from '@/types';
import { formatDate } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function ApprovedPlateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { user: currentUser, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plate, setPlate] = useState<ApprovedPlate | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [accessList, setAccessList] = useState<AccessList | null>(null);
  const [approvedBy, setApprovedBy] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    plateNumber: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleColor: '',
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
      fetchPlateData();
    }
  }, [currentUser, id]);

  const fetchPlateData = async () => {
    try {
      setLoading(true);
      
      // Получаем все утвержденные номера и фильтруем по ID
      // В идеале должен быть отдельный эндпоинт getById, но пока так
      const allPlates = await approvedPlateService.getAll();
      const plateData = allPlates.find(p => p.id === id);
      
      if (!plateData) {
        toast.error('Номер не найден');
        router.push('/admin/approved-plates');
        return;
      }
      
      setPlate(plateData);
      
      // Заполняем форму редактирования
      setEditForm({
        plateNumber: plateData.plateNumber || '',
        vehicleBrand: plateData.vehicleBrand || '',
        vehicleModel: plateData.vehicleModel || '',
        vehicleColor: plateData.vehicleColor || '',
        validFrom: plateData.validFrom || '',
        validUntil: plateData.validUntil || '',
        notes: plateData.notes || '',
        isActive: plateData.isActive,
      });
      
      // Загружаем связанные данные параллельно
      const promises = [];
      
      // Загрузка организации
      if (plateData.organizationId) {
        promises.push(
          organizationService.getById(plateData.organizationId)
            .then(setOrganization)
            .catch(() => setOrganization(null))
        );
      }
      
      // Загрузка списка
      if (plateData.listId) {
        promises.push(
          accessListService.getById(plateData.listId)
            .then(setAccessList)
            .catch(() => setAccessList(null))
        );
      }
      
      // Загрузка утвердившего пользователя
      if (plateData.approvedBy) {
        promises.push(
          userService.getById(plateData.approvedBy)
            .then(setApprovedBy)
            .catch(() => setApprovedBy(null))
        );
      }
      
      await Promise.all(promises);
      
    } catch (error: unknown) {
      console.error('Error fetching plate:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (plate) {
      setEditForm({
        plateNumber: plate.plateNumber || '',
        vehicleBrand: plate.vehicleBrand || '',
        vehicleModel: plate.vehicleModel || '',
        vehicleColor: plate.vehicleColor || '',
        validFrom: plate.validFrom || '',
        validUntil: plate.validUntil || '',
        notes: plate.notes || '',
        isActive: plate.isActive,
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSave = async () => {
    if (!plate) return;
    
    try {
      setLoading(true);
      
      // В реальном проекте здесь должен быть метод update
      // Пока показываем сообщение, что функционал в разработке
      toast.success('Функционал обновления в разработке');
      setIsEditing(false);
      
      /* 
      // Когда будет готово:
      await approvedPlateService.update(plate.id, {
        plateNumber: editForm.plateNumber,
        vehicleBrand: editForm.vehicleBrand || undefined,
        vehicleModel: editForm.vehicleModel || undefined,
        vehicleColor: editForm.vehicleColor || undefined,
        validFrom: editForm.validFrom || undefined,
        validUntil: editForm.validUntil || undefined,
        notes: editForm.notes || undefined,
        isActive: editForm.isActive,
      });
      
      toast.success('Данные номера обновлены');
      setIsEditing(false);
      await fetchPlateData();
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
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!plate) return;
    
    if (window.confirm(`Вы уверены, что хотите удалить номер "${plate.plateNumber}" из списка?`)) {
      try {
        await approvedPlateService.delete(plate.id);
        toast.success('Номер удален из списка');
        router.push('/admin/approved-plates');
      } catch (error: unknown) {
        console.error('Error deleting plate:', error);
        if (error && typeof error === 'object' && 'response' in error) {
          const apiError = error as ApiError;
          toast.error(apiError.response?.data?.error || 'Ошибка при удалении');
        } else {
          toast.error('Ошибка при удалении');
        }
      }
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
          <p className={styles.loadingText}>Загрузка данных номера...</p>
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

  const isActive = plate.isActive && (!plate.validUntil || new Date(plate.validUntil) >= new Date());

  return (
    <div className={styles.container}>
      <Header role='admin'/>
      {/* Верхняя панель */}
      {/* <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <Link href="/admin/approved-plates" className={styles.backLink}>
              <i className="ri-arrow-left-line"></i>
              <span>К списку номеров</span>
            </Link>
            <div>
              <h1 className={styles.title}>Номер {plate.plateNumber}</h1>
              <p className={styles.subtitle}>
                Детальная информация о номере в списке пропусков
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
        {/* Карточка номера */}
        <div className={styles.plateCard}>
          <div className={styles.plateHeader}>
            <div className={styles.plateTitleSection}>
              <h2 className={styles.plateTitle}>
                <i className="ri-car-line"></i>
                Информация о номере
              </h2>
              <span className={`${styles.statusBadge} ${isActive ? styles.statusActive : styles.statusInactive}`}>
                {isActive ? 'Активен' : 'Неактивен'}
              </span>
            </div>
            <div className={styles.actionButtons}>
              <button
                onClick={handleEdit}
                className={`${styles.actionButton} ${styles.editButton}`}
                title="Редактировать"
              >
                <i className="ri-pencil-line"></i>
              </button>
              <button
                onClick={handleDelete}
                className={`${styles.actionButton} ${styles.deleteButton}`}
                title="Удалить"
              >
                <i className="ri-delete-bin-line"></i>
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <label htmlFor="plateNumber">
                  Государственный номер <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="plateNumber"
                  name="plateNumber"
                  value={editForm.plateNumber}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="vehicleBrand">Марка</label>
                  <input
                    type="text"
                    id="vehicleBrand"
                    name="vehicleBrand"
                    value={editForm.vehicleBrand}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Toyota"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="vehicleModel">Модель</label>
                  <input
                    type="text"
                    id="vehicleModel"
                    name="vehicleModel"
                    value={editForm.vehicleModel}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Camry"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="vehicleColor">Цвет</label>
                  <input
                    type="text"
                    id="vehicleColor"
                    name="vehicleColor"
                    value={editForm.vehicleColor}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Белый"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="validFrom">Действует с</label>
                  <input
                    type="date"
                    id="validFrom"
                    name="validFrom"
                    value={editForm.validFrom}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="validUntil">Действует до</label>
                  <input
                    type="date"
                    id="validUntil"
                    name="validUntil"
                    value={editForm.validUntil}
                    onChange={handleChange}
                    className={styles.input}
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
                  rows={3}
                  placeholder="Дополнительная информация"
                />
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
            <div className={styles.plateDetails}>
              <div className={styles.detailsGrid}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Номер:</span>
                  <span className={`${styles.detailValue} ${styles.plateNumberValue}`}>
                    {plate.plateNumber}
                  </span>
                </div>

                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Организация:</span>
                  <span className={styles.detailValue}>
                    {organization ? (
                      <Link href={`/admin/organizations/${organization.id}`} className={styles.link}>
                        {organization.name}
                      </Link>
                    ) : (
                      plate.organizationName || 'Не указана'
                    )}
                  </span>
                </div>

                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Список:</span>
                  <span className={styles.detailValue}>
                    {accessList ? (
                      <Link 
                        href={`/admin/access-lists/${accessList.id}`}
                        className={styles.listLink}
                        style={{ color: accessList.color }}
                      >
                        <span className={styles.listColorDot} style={{ backgroundColor: accessList.color }}></span>
                        {accessList.name}
                      </Link>
                    ) : (
                      plate.listName || 'Не указан'
                    )}
                  </span>
                </div>

                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Автомобиль:</span>
                  <span className={styles.detailValue}>
                    {plate.vehicleBrand || plate.vehicleModel || plate.vehicleColor ? (
                      <>
                        {plate.vehicleBrand} {plate.vehicleModel}
                        {plate.vehicleColor && ` (${plate.vehicleColor})`}
                      </>
                    ) : (
                      'Не указан'
                    )}
                  </span>
                </div>

                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Срок действия:</span>
                  <span className={styles.detailValue}>
                    {plate.validFrom && plate.validUntil ? (
                      <>с {formatDate(plate.validFrom)} до {formatDate(plate.validUntil)}</>
                    ) : plate.validFrom ? (
                      <>с {formatDate(plate.validFrom)}</>
                    ) : plate.validUntil ? (
                      <>до {formatDate(plate.validUntil)}</>
                    ) : (
                      'бессрочно'
                    )}
                  </span>
                </div>

                {plate.notes && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Примечания:</span>
                    <span className={styles.detailValue}>{plate.notes}</span>
                  </div>
                )}

                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Дата добавления:</span>
                  <span className={styles.detailValue}>{formatDate(plate.createdAt)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Информация о связанных данных */}
        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>
            <i className="ri-information-line"></i>
            Дополнительная информация
          </h3>
          
          <div className={styles.infoGrid}>
            
            
            
            
            {approvedBy && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Кем утвержден:</span>
                <Link href={`/admin/users/${approvedBy.id}`} className={styles.link}>
                  {approvedBy.fullName} (@{approvedBy.username})
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Кнопки навигации */}
        <div className={styles.navigationButtons}>
          {accessList && (
            <Link href={`/admin/access-lists/${plate.listId}`} className={styles.navButton}>
              <span>К списку {accessList.name}</span>
            </Link>
          )}
          
          {plate.organizationId && organization && (
            <Link href={`/admin/organizations/${plate.organizationId}`} className={styles.navButton}>
              <i className="ri-building-4-line"></i>
              <span>К организации {organization.name}</span>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}