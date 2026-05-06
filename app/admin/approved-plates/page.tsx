"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import approvedPlateService from '@/services/approved-plate.service';
import accessListService from '@/services/access-list.service';
import organizationService from '@/services/organization.service';
import { ApprovedPlate, AccessList, Organization, ApiError } from '@/types';
import { formatDate } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function AdminApprovedPlatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plates, setPlates] = useState<ApprovedPlate[]>([]);
  const [accessLists, setAccessLists] = useState<AccessList[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedList, setSelectedList] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, active, inactive
  const [searchTerm, setSearchTerm] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Состояние для модального окна добавления/редактирования
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlate, setEditingPlate] = useState<ApprovedPlate | null>(null);
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
  });

  // Проверка роли
  useEffect(() => {
    if (user && user.roleId !== 1) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  // Загрузка данных
  useEffect(() => {
    if (user && user.roleId === 1 && !dataLoaded) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dataLoaded]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [platesData, listsData, orgsData] = await Promise.all([
        approvedPlateService.getAll(),
        accessListService.getAll(),
        organizationService.getAll(),
      ]);
      
      setPlates(Array.isArray(platesData) ? platesData : []);
      setAccessLists(Array.isArray(listsData) ? listsData : []);
      setOrganizations(Array.isArray(orgsData) ? orgsData : []);
      
      setDataLoaded(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleListChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedList(e.target.value);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleRefresh = () => {
    setDataLoaded(false);
    fetchData();
  };

  const openAddModal = () => {
    setEditingPlate(null);
    setFormData({
      plateNumber: '',
      vehicleBrand: '',
      vehicleModel: '',
      vehicleColor: '',
      organizationId: '',
      listId: '',
      validFrom: '',
      validUntil: '',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (plate: ApprovedPlate) => {
    setEditingPlate(plate);
    setFormData({
      plateNumber: plate.plateNumber,
      vehicleBrand: plate.vehicleBrand || '',
      vehicleModel: plate.vehicleModel || '',
      vehicleColor: plate.vehicleColor || '',
      organizationId: plate.organizationId || '',
      listId: plate.listId,
      validFrom: plate.validFrom || '',
      validUntil: plate.validUntil || '',
      notes: plate.notes || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingPlate(null);
  };

 const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  
  // Автоматически приводим номер к верхнему регистру
  if (name === 'plateNumber') {
    setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
  } else {
    setFormData(prev => ({ ...prev, [name]: value }));
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      if (editingPlate) {
        // Обновление существующего номера
        await approvedPlateService.update(editingPlate.id, {
          plateNumber: formData.plateNumber,
          vehicleBrand: formData.vehicleBrand || undefined,
          vehicleModel: formData.vehicleModel || undefined,
          vehicleColor: formData.vehicleColor || undefined,
          listId: formData.listId,
          validFrom: formData.validFrom || undefined,
          validUntil: formData.validUntil || undefined,
          notes: formData.notes || undefined,
          isActive: true,
        });
        toast.success('Номер успешно обновлен');
      } else {
        // Добавление нового номера
        await approvedPlateService.addDirect({
          plateNumber: formData.plateNumber,
          organizationId: formData.organizationId,
          listId: formData.listId,
          vehicleBrand: formData.vehicleBrand || undefined,
          vehicleModel: formData.vehicleModel || undefined,
          vehicleColor: formData.vehicleColor || undefined,
          validFrom: formData.validFrom || undefined,
          validUntil: formData.validUntil || undefined,
          notes: formData.notes || undefined,
        });
        toast.success('Номер успешно добавлен');
      }
      
      closeModal();
      await fetchData();
    } catch (error: unknown) {
      console.error('Error saving plate:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        toast.error(apiError.response?.data?.error || 'Ошибка при сохранении');
      } else {
        toast.error('Ошибка при сохранении');
      }
    }
  };

  const handleDelete = async (id: string, plateNumber: string) => {
  if (window.confirm(`Вы уверены, что хотите полностью удалить номер "${plateNumber}" из базы данных? Это действие нельзя отменить.`)) {
    try {
      await approvedPlateService.delete(id);
      toast.success('Номер полностью удален из базы данных');
      await fetchData();
    } catch (error) {
      console.error('Error deleting plate:', error);
      toast.error('Ошибка при удалении номера');
    }
  }
};

  const handleToggleActive = async (plate: ApprovedPlate) => {
    const newStatus = !plate.isActive;
    const action = newStatus ? 'активировать' : 'деактивировать';
    
    if (window.confirm(`Вы уверены, что хотите ${action} номер "${plate.plateNumber}"?`)) {
      try {
        await approvedPlateService.update(plate.id, {
          isActive: newStatus,
        });
        toast.success(`Номер ${newStatus ? 'активирован' : 'деактивирован'}`);
        await fetchData();
      } catch (error) {
        console.error('Error toggling plate status:', error);
        toast.error('Ошибка при изменении статуса');
      }
    }
  };

  const filteredPlates = plates?.filter(plate => {
    // Фильтр по списку
    if (selectedList !== 'all' && plate.listId !== selectedList) return false;
    
    // Фильтр по статусу активности
    if (statusFilter === 'active' && !plate.isActive) return false;
    if (statusFilter === 'inactive' && plate.isActive) return false;
    
    // Поиск по тексту
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        plate.plateNumber.toLowerCase().includes(term) ||
        plate.organizationName?.toLowerCase().includes(term) ||
        plate.vehicleBrand?.toLowerCase().includes(term) ||
        plate.vehicleModel?.toLowerCase().includes(term)
      );
    }
    
    return true;
  });

  const getListName = (listId: string) => {
    return accessLists.find(l => l.id === listId)?.name || 'Неизвестный список';
  };

  const getListColor = (listId: string) => {
    return accessLists.find(l => l.id === listId)?.color || '#6b7280';
  };

  const getOrganizationName = (orgId: string | undefined) => {
    if (!orgId) return 'Не указана';
    return organizations.find(o => o.id === orgId)?.name || 'Неизвестная организация';
  };


  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка номеров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Верхняя панель */}
      {/* <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <Link href="/admin" className={styles.backLink}>
              <i className="ri-arrow-left-line"></i>
              <span>К дашборду</span>
            </Link>
            <div>
              <h1 className={styles.title}>Управление номерами</h1>
              <p className={styles.subtitle}>
                Прямое добавление, редактирование и удаление номеров в списках
              </p>
            </div>
          </div>
          <div className={styles.userInfo}>
            <span className={styles.roleBadge}>
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
      <Header role='admin'/>

      <main className={styles.main}>
        {/* Панель управления */}
        <div className={styles.controls}>
          <div className={styles.searchSection}>
            <div className={styles.searchBox}>
              <i className={`ri-search-line ${styles.searchIcon}`}></i>
              <input
                type="text"
                placeholder="Поиск по номеру, организации или марке..."
                value={searchTerm}
                onChange={handleSearch}
                className={styles.searchInput}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className={styles.clearSearch}
                >
                  <i className="ri-close-line"></i>
                </button>
              )}
            </div>
            
            <select
              value={selectedList}
              onChange={handleListChange}
              className={styles.listSelect}
            >
              <option value="all">Все списки</option>
              {accessLists.map(list => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className={styles.statusSelect}
            >
              <option value="all">Все номера</option>
              <option value="active">Активные</option>
              <option value="inactive">Неактивные</option>
            </select>
          </div>

          <div className={styles.actionButtons}>
            <button
              onClick={handleRefresh}
              className={styles.refreshButton}
              disabled={loading}
            >
              <i className={`ri-refresh-line ${loading ? 'ri-spin' : ''}`}></i>
            </button>
            <button
              onClick={openAddModal}
              className={styles.addButton}
            >
              {/* <i className="ri-add-line"></i> */}
              <span>Добавить номер</span>
            </button>
          </div>
        </div>

        {/* Таблица номеров */}
        {filteredPlates.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Организация</th>
                  <th>Список</th>
                  <th>Автомобиль</th>
                  <th>Срок действия</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlates.map((plate) => {
                  const listColor = getListColor(plate.listId);
                  
                  return (
                    <tr key={plate.id} className={!plate.isActive ? styles.inactiveRow : ''}>
                      <td className={styles.plateNumber}>{plate.plateNumber}</td>
                      <td>{getOrganizationName(plate.organizationId)}</td>
                      <td>
                        <span className={styles.listBadge} style={{ backgroundColor: `${listColor}20`, color: listColor }}>
                          {getListName(plate.listId)}
                        </span>
                      </td>
                      <td>
                        {plate.vehicleBrand && plate.vehicleModel
                          ? `${plate.vehicleBrand} ${plate.vehicleModel}${plate.vehicleColor ? ` (${plate.vehicleColor})` : ''}`
                          : '—'}
                      </td>
                      <td>
                        {plate.validFrom && plate.validUntil
                          ? `${formatDate(plate.validFrom)} - ${formatDate(plate.validUntil)}`
                          : plate.validUntil
                          ? `до ${formatDate(plate.validUntil)}`
                          : 'бессрочно'}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${plate.isActive ? styles.statusActive : styles.statusInactive}`}>
                          {plate.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionIcons}>
                          <button
                            onClick={() => openEditModal(plate)}
                            className={styles.iconButton}
                            title="Редактировать"
                          >
                            <i className="ri-pencil-line"></i>
                          </button>
                          <button
                            onClick={() => handleToggleActive(plate)}
                            className={`${styles.iconButton} ${plate.isActive ? styles.blockButton : styles.unblockButton}`}
                            title={plate.isActive ? 'Деактивировать' : 'Активировать'}
                          >
                            <i className={plate.isActive ? 'ri-pause-circle-line' : 'ri-play-circle-line'}></i>
                          </button>
                          <button
                            onClick={() => handleDelete(plate.id, plate.plateNumber)}
                            className={`${styles.iconButton} ${styles.deleteButton}`}
                            title="Удалить"
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
          </div>
        ) : (
          <div className={styles.emptyState}>
            <i className="ri-inbox-line"></i>
            <h3>Номера не найдены</h3>
            <p>
              {searchTerm || selectedList !== 'all' || statusFilter !== 'all'
                ? 'Попробуйте изменить параметры поиска'
                : 'В списках пока нет номеров'}
            </p>
            <button onClick={openAddModal} className={styles.emptyStateButton}>
              <i className="ri-add-line"></i>
              Добавить первый номер
            </button>
          </div>
        )}
      </main>

      {/* Модальное окно добавления/редактирования */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <i className={editingPlate ? 'ri-pencil-line' : 'ri-add-line'}></i>
                {editingPlate ? 'Редактировать номер' : 'Добавить номер'}
              </h3>
              <button onClick={closeModal} className={styles.modalClose}>
                <i className="ri-close-line"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label htmlFor="plateNumber" className={styles.label}>
                  Государственный номер <span className={styles.required}>*</span>
                </label>
                <input
  type="text"
  id="plateNumber"
  name="plateNumber"
  value={formData.plateNumber}
  onChange={handleFormChange}
  className={styles.input}
  placeholder="123ABC01"
  required
  style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '1px' }}
/>
              </div>

              <div className={styles.formRow}>
                {!editingPlate &&
                <div className={styles.formGroup}>
                  <label htmlFor="organizationId" className={styles.label}>
                    Организация <span className={styles.required}>*</span>
                  </label>
                  <select
                    id="organizationId"
                    name="organizationId"
                    value={formData.organizationId}
                    onChange={handleFormChange}
                    className={styles.select}
                    required
                  >
                    <option value="">Выберите организацию</option>
                    {organizations?.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>}

                <div className={styles.formGroup}>
                  <label htmlFor="listId" className={styles.label}>
                    Список <span className={styles.required}>*</span>
                  </label>
                  <select
                    id="listId"
                    name="listId"
                    value={formData.listId}
                    onChange={handleFormChange}
                    className={styles.select}
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
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="vehicleBrand" className={styles.label}>
                    Марка
                  </label>
                  <input
                    type="text"
                    id="vehicleBrand"
                    name="vehicleBrand"
                    value={formData.vehicleBrand}
                    onChange={handleFormChange}
                    className={styles.input}
                    placeholder="Toyota"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="vehicleModel" className={styles.label}>
                    Модель
                  </label>
                  <input
                    type="text"
                    id="vehicleModel"
                    name="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={handleFormChange}
                    className={styles.input}
                    placeholder="Camry"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="vehicleColor" className={styles.label}>
                    Цвет
                  </label>
                  <input
                    type="text"
                    id="vehicleColor"
                    name="vehicleColor"
                    value={formData.vehicleColor}
                    onChange={handleFormChange}
                    className={styles.input}
                    placeholder="Белый"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="validFrom" className={styles.label}>
                    Действует с
                  </label>
                  <input
                    type="date"
                    id="validFrom"
                    name="validFrom"
                    value={formData.validFrom}
                    onChange={handleFormChange}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="validUntil" className={styles.label}>
                    Действует до
                  </label>
                  <input
                    type="date"
                    id="validUntil"
                    name="validUntil"
                    value={formData.validUntil}
                    onChange={handleFormChange}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="notes" className={styles.label}>
                  Примечания
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  className={styles.textarea}
                  rows={3}
                  placeholder="Дополнительная информация"
                />
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={closeModal} className={styles.cancelButton}>
                  Отмена
                </button>
                <button type="submit" className={styles.saveButton}>
                  <i className={editingPlate ? 'ri-save-line' : 'ri-add-line'}></i>
                  {editingPlate ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}