"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import approvedPlateService from '@/services/approved-plate.service';
import accessListService from '@/services/access-list.service';
import organizationService from '@/services/organization.service';
import { ApprovedPlate, AccessList, Organization, ApiError } from '@/types';
import { formatDate } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

export default function AdminApprovedPlatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plates, setPlates] = useState<ApprovedPlate[]>([]);
  const [accessLists, setAccessLists] = useState<AccessList[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedList, setSelectedList] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlate, setEditingPlate] = useState<ApprovedPlate | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedAccessList, setSelectedAccessList] = useState<AccessList | null>(null);
  const [touched, setTouched] = useState(false);
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

  useEffect(() => {
    if (user && user.roleId !== 1) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

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
    
    // Обновляем статус для номеров с истекшим сроком
    const updatedPlates = (Array.isArray(platesData) ? platesData : []).map(plate => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (plate.isActive && plate.validUntil) {
        const validUntil = new Date(plate.validUntil);
        validUntil.setHours(23, 59, 59, 999);
        if (validUntil < now) {
          return { ...plate, isActive: false };
        }
      }
      return plate;
    });
    
    setPlates(updatedPlates);
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
  const currentYear = new Date().getFullYear();
  setEditingPlate(null);
  setSelectedOrg(null);
  setSelectedAccessList(null);
  setTouched(false);
  setFormData({
    plateNumber: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleColor: '',
    organizationId: '',
    listId: '',
    validFrom: '',
    validUntil: `${currentYear}-12-31`, // <-- до конца года
    notes: '',
  });
  setModalOpen(true);
};

 const openEditModal = (plate: ApprovedPlate) => {
  setEditingPlate(plate);
  setSelectedOrg(organizations.find(org => org.id === plate.organizationId) || null);
  setSelectedAccessList(accessLists.find(list => list.id === plate.listId) || null);
  setTouched(false);
  setFormData({
    plateNumber: plate.plateNumber,
    vehicleBrand: plate.vehicleBrand || '',
    vehicleModel: plate.vehicleModel || '',
    vehicleColor: plate.vehicleColor || '',
    organizationId: plate.organizationId || '',
    listId: plate.listId,
    validFrom: plate.validFrom ? plate.validFrom.split('T')[0] : '',
    validUntil: plate.validUntil ? plate.validUntil.split('T')[0] : '',
    notes: plate.notes || '',
  });
  setModalOpen(true);
};

  const closeModal = () => {
    setModalOpen(false);
    setEditingPlate(null);
    setSelectedOrg(null);
    setSelectedAccessList(null);
    setTouched(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'plateNumber') {
      const cleaned = value.replace(/\s/g, '').toUpperCase();
      const latinAndNumbers = cleaned.replace(/[^A-Z0-9]/g, '');
      setFormData(prev => ({ ...prev, [name]: latinAndNumbers }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleOrganizationChange = (_event: React.SyntheticEvent, newValue: Organization | null) => {
    setSelectedOrg(newValue);
    setFormData(prev => ({ ...prev, organizationId: newValue ? newValue.id : '' }));
  };

  const handleAccessListChange = (_event: React.SyntheticEvent, newValue: AccessList | null) => {
    setSelectedAccessList(newValue);
    setFormData(prev => ({ ...prev, listId: newValue ? newValue.id : '' }));
  };

  const validatePlateNumber = (plateNumber: string): boolean => {
    if (!plateNumber.trim()) { toast.error('Введите государственный номер'); return false; }
    if (plateNumber.includes(' ')) { toast.error('Номер не должен содержать пробелы'); return false; }
    if (!/^[A-Z0-9]+$/.test(plateNumber)) { toast.error('Используйте только заглавные латинские буквы и цифры'); return false; }
    if (plateNumber.length < 4) { toast.error('Номер слишком короткий'); return false; }
    if (plateNumber.length > 10) { toast.error('Номер слишком длинный'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    
    if (!validatePlateNumber(formData.plateNumber)) return;
    if (!formData.organizationId) { toast.error('Выберите организацию'); return; }
    if (!formData.listId) { toast.error('Выберите список'); return; }

    try {
      if (editingPlate) {
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
        await approvedPlateService.hardDelete(id);
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
        await approvedPlateService.update(plate.id, { isActive: newStatus });
        toast.success(`Номер ${newStatus ? 'активирован' : 'деактивирован'}`);
        await fetchData();
      } catch (error) {
        console.error('Error toggling plate status:', error);
        toast.error('Ошибка при изменении статуса');
      }
    }
  };

  const filteredPlates = plates?.filter(plate => {
    if (selectedList !== 'all' && plate.listId !== selectedList) return false;
    if (statusFilter === 'active' && !plate.isActive) return false;
    if (statusFilter === 'inactive' && plate.isActive) return false;
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

  const getListName = (listId: string) => accessLists.find(l => l.id === listId)?.name || 'Неизвестный список';
  const getListColor = (listId: string) => accessLists.find(l => l.id === listId)?.color || '#6b7280';
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
    <ThemeProvider theme={theme}>
      <div className={styles.container}>
        <Header role='admin'/>

        <main className={styles.main}>
          <div className={styles.controls}>
            <div className={styles.searchSection}>
              <div className={styles.searchBox}>
                <i className={`ri-search-line ${styles.searchIcon}`}></i>
                <input type="text" placeholder="Поиск по номеру, организации или марке..." value={searchTerm} onChange={handleSearch} className={styles.searchInput} />
                {searchTerm && <button onClick={() => setSearchTerm('')} className={styles.clearSearch}><i className="ri-close-line"></i></button>}
              </div>
              
              <select value={selectedList} onChange={handleListChange} className={styles.listSelect}>
                <option value="all">Все списки</option>
                {accessLists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
              </select>

              <select value={statusFilter} onChange={handleStatusChange} className={styles.statusSelect}>
                <option value="all">Все номера</option>
                <option value="active">Активные</option>
                <option value="inactive">Неактивные</option>
              </select>
            </div>

            <div className={styles.actionButtons}>
              <button onClick={handleRefresh} className={styles.refreshButton} disabled={loading}>
                <i className={`ri-refresh-line ${loading ? 'ri-spin' : ''}`}></i>
              </button>
              <button onClick={openAddModal} className={styles.addButton}><span>Добавить номер</span></button>
            </div>
          </div>

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
                        <td><span className={styles.listBadge} style={{ backgroundColor: `${listColor}20`, color: listColor }}>{getListName(plate.listId)}</span></td>
                        <td>{plate.vehicleBrand && plate.vehicleModel ? `${plate.vehicleBrand} ${plate.vehicleModel}${plate.vehicleColor ? ` (${plate.vehicleColor})` : ''}` : '—'}</td>
                        <td>{plate.validFrom && plate.validUntil ? `${formatDate(plate.validFrom)} - ${formatDate(plate.validUntil)}` : plate.validUntil ? `до ${formatDate(plate.validUntil)}` : 'бессрочно'}</td>
                        <td><span className={`${styles.statusBadge} ${plate.isActive ? styles.statusActive : styles.statusInactive}`}>{plate.isActive ? 'Активен' : 'Неактивен'}</span></td>
                        <td>
                          <div className={styles.actionIcons}>
                            <button onClick={() => openEditModal(plate)} className={styles.iconButton} title="Редактировать"><i className="ri-pencil-line"></i></button>
                            <button onClick={() => handleToggleActive(plate)} className={`${styles.iconButton} ${plate.isActive ? styles.blockButton : styles.unblockButton}`} title={plate.isActive ? 'Деактивировать' : 'Активировать'}><i className={plate.isActive ? 'ri-pause-circle-line' : 'ri-play-circle-line'}></i></button>
                            <button onClick={() => handleDelete(plate.id, plate.plateNumber)} className={`${styles.iconButton} ${styles.deleteButton}`} title="Удалить"><i className="ri-delete-bin-line"></i></button>
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
              <p>{searchTerm || selectedList !== 'all' || statusFilter !== 'all' ? 'Попробуйте изменить параметры поиска' : 'В списках пока нет номеров'}</p>
              <button onClick={openAddModal} className={styles.emptyStateButton}><i className="ri-add-line"></i>Добавить первый номер</button>
            </div>
          )}
        </main>

        {modalOpen && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}><i className={editingPlate ? 'ri-pencil-line' : 'ri-add-line'}></i>{editingPlate ? 'Редактировать номер' : 'Добавить номер'}</h3>
                <button onClick={closeModal} className={styles.modalClose}><i className="ri-close-line"></i></button>
              </div>

              <form onSubmit={handleSubmit} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="plateNumber" className={styles.label}>Государственный номер <span className={styles.required}>*</span></label>
                  <input type="text" id="plateNumber" name="plateNumber" value={formData.plateNumber} onChange={handleFormChange} className={styles.input} placeholder="A123BC177" required maxLength={10}
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '1px', fontSize: '1.1em' }}
                    autoComplete="off" onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }} />
                  <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Формат: латинские буквы и цифры без пробелов</small>
                </div>

                <div className={styles.formRow}>
                  {!editingPlate &&
                  <div className={styles.formGroup}>
                    <label htmlFor="organizationId" className={styles.label}>Организация <span className={styles.required}>*</span></label>
                    <Autocomplete id="organizationId" options={organizations} getOptionLabel={(option: Organization) => option.name} value={selectedOrg} onChange={handleOrganizationChange}
                      disabled={organizations?.length === 0} isOptionEqualToValue={(option: Organization, value: Organization) => option.id === value.id}
                      noOptionsText="Организации не найдены" loadingText="Загрузка..."
                      renderInput={(params) => <TextField {...params} placeholder="Выберите организацию" variant="outlined" size="small" error={touched && !formData.organizationId} helperText={touched && !formData.organizationId ? 'Выберите организацию' : ''} />}
                      renderOption={(props, option: Organization) => (
                        <li {...props} key={option.id}><div><div style={{ fontWeight: 500 }}>{option.name}</div>{option.bin && <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>БИН: {option.bin}</div>}</div></li>
                      )} />
                  </div>}

                  <div className={styles.formGroup}>
                    <label htmlFor="listId" className={styles.label}>Список <span className={styles.required}>*</span></label>
                    <Autocomplete id="listId" options={accessLists} getOptionLabel={(option: AccessList) => option.name} value={selectedAccessList} onChange={handleAccessListChange}
                      disabled={accessLists?.length === 0} isOptionEqualToValue={(option: AccessList, value: AccessList) => option.id === value.id}
                      noOptionsText="Списки не найдены" loadingText="Загрузка..."
                      renderInput={(params) => <TextField {...params} placeholder="Выберите список" variant="outlined" size="small" error={touched && !formData.listId} helperText={touched && !formData.listId ? 'Выберите список' : ''} />}
                      renderOption={(props, option: AccessList) => (
                        <li {...props} key={option.id}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: option.color || '#6b7280', display: 'inline-block', flexShrink: 0 }}></span>
                            <div><div style={{ fontWeight: 500 }}>{option.name}</div>{option.description && <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{option.description}</div>}</div>
                          </div>
                        </li>
                      )} />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}><label htmlFor="vehicleBrand" className={styles.label}>Марка</label><input type="text" id="vehicleBrand" name="vehicleBrand" value={formData.vehicleBrand} onChange={handleFormChange} className={styles.input} placeholder="Toyota" /></div>
                  <div className={styles.formGroup}><label htmlFor="vehicleModel" className={styles.label}>Модель</label><input type="text" id="vehicleModel" name="vehicleModel" value={formData.vehicleModel} onChange={handleFormChange} className={styles.input} placeholder="Camry" /></div>
                  <div className={styles.formGroup}><label htmlFor="vehicleColor" className={styles.label}>Цвет</label><input type="text" id="vehicleColor" name="vehicleColor" value={formData.vehicleColor} onChange={handleFormChange} className={styles.input} placeholder="Белый" /></div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}><label htmlFor="validFrom" className={styles.label}>Действует с</label><input type="date" id="validFrom" name="validFrom" value={formData.validFrom} onChange={handleFormChange} className={styles.input} /></div>
                  <div className={styles.formGroup}><label htmlFor="validUntil" className={styles.label}>Действует до</label><input type="date" id="validUntil" name="validUntil" value={formData.validUntil} onChange={handleFormChange} className={styles.input} /></div>
                </div>

                <div className={styles.formGroup}><label htmlFor="notes" className={styles.label}>Примечания</label><textarea id="notes" name="notes" value={formData.notes} onChange={handleFormChange} className={styles.textarea} rows={3} placeholder="Дополнительная информация" /></div>

                <div className={styles.modalFooter}>
                  <button type="button" onClick={closeModal} className={styles.cancelButton}>Отмена</button>
                  <button type="submit" className={styles.saveButton}><i className={editingPlate ? 'ri-save-line' : 'ri-add-line'}></i>{editingPlate ? 'Сохранить' : 'Добавить'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}