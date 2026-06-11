// app/pass-manager/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import Header from '@/components/Header/Header';
import CustomAutocomplete from '@/components/CustomAutocomplete/CustomAutocomplete';
import styles from './page.module.css';

interface Plate {
  id: string;
  plateNumber: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  organizationName?: string;
  organizationId?: string;
  listId: string;
  listName: string;
  listColor: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

interface AccessList {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface Organization {
  id: string;
  name: string;
}

export default function PassManagerPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState<AccessList[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [plates, setPlates] = useState<Plate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    plateNumber: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleColor: '',
    organizationId: '',
    withoutOrg: false,
    notes: '',
  });
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const [editingPlate, setEditingPlate] = useState<Plate | null>(null);
  const [selectedEditList, setSelectedEditList] = useState<AccessList | null>(null);
  const [deletingPlate, setDeletingPlate] = useState<Plate | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    if (user && user.roleId !== 7) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.roleId === 7) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const formatPlateNumber = (value: string): string => {
    return value
      .toUpperCase()
      .replace(/\s/g, '')
      .replace(/[^A-Z0-9]/g, '');
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [listsRes, orgsRes] = await Promise.all([
        api.get('/pass-manager/lists'),
        api.get('/pass-manager/organizations'),
      ]);
      setLists(listsRes.data || []);
      setOrganizations(orgsRes.data || []);
      if (listsRes.data?.length > 0) {
        setSelectedListId(listsRes.data[0].id);
        loadPlates(listsRes.data[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const loadPlates = async (listId: string) => {
    try {
      const res = await api.get(`/pass-manager/plates/${listId}`);
      setPlates(res.data || []);
    } catch (error) {
      console.error('Error loading plates:', error);
    }
  };

  const handleListChange = (listId: string) => {
    setSelectedListId(listId);
    loadPlates(listId);
  };

  const handleAddPlate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plateNumber.trim()) {
      toast.error('Введите номер');
      return;
    }
    if (!selectedListId) {
      toast.error('Выберите список');
      return;
    }
    if (!formData.notes.trim()) {
      toast.error('Примечание не может быть пустым');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/pass-manager/plates', {
        plateNumber: formData.plateNumber,
        vehicleBrand: formData.vehicleBrand,
        vehicleModel: formData.vehicleModel,
        vehicleColor: formData.vehicleColor,
        listId: selectedListId,
        organizationId: formData.withoutOrg ? '' : formData.organizationId,
        withoutOrg: formData.withoutOrg,
        notes: formData.notes,
      });
      toast.success('Номер добавлен');
      setShowAddForm(false);
      setFormData({ plateNumber: '', vehicleBrand: '', vehicleModel: '', vehicleColor: '', organizationId: '', withoutOrg: false, notes: '' });
      setSelectedOrg(null);
      loadPlates(selectedListId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Ошибка при добавлении');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePlate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlate) return;
    
    if (!editingPlate.notes?.trim()) {
      toast.error('Примечание не может быть пустым');
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/pass-manager/plates/${editingPlate.id}`, {
        plateNumber: editingPlate.plateNumber,
        vehicleBrand: editingPlate.vehicleBrand,
        vehicleModel: editingPlate.vehicleModel,
        vehicleColor: editingPlate.vehicleColor,
        listId: editingPlate.listId,
        notes: editingPlate.notes,
        isActive: editingPlate.isActive,
      });
      toast.success('Номер обновлен');
      setEditingPlate(null);
      setSelectedEditList(null);
      loadPlates(selectedListId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Ошибка при обновлении');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlate = async () => {
    if (!deletingPlate || !deleteReason.trim()) {
      toast.error('Укажите причину удаления');
      return;
    }

    try {
      await api.delete(`/pass-manager/plates/${deletingPlate.id}`, {
        data: { reason: deleteReason },
      });
      toast.success('Номер удален');
      setDeletingPlate(null);
      setDeleteReason('');
      loadPlates(selectedListId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Ошибка при удалении');
    }
  };

  const filteredPlates = plates.filter(p =>
    p.plateNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className={styles.container}>
        <Header role="pass_manager" />
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header role="pass_manager" />

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Управление номерами</h1>
          <button className={styles.addButton} onClick={() => setShowAddForm(true)}>
            <i className="ri-add-line"></i> Добавить номер
          </button>
        </div>

        <div className={styles.listSelector}>
          {lists.map(list => (
            <button
              key={list.id}
              className={`${styles.listTab} ${selectedListId === list.id ? styles.listTabActive : ''}`}
              style={{ borderColor: selectedListId === list.id ? list.color : 'transparent' }}
              onClick={() => handleListChange(list.id)}
            >
              {list.name}
            </button>
          ))}
        </div>

        <div className={styles.searchBox}>
          <i className="ri-search-line"></i>
          <input
            type="text"
            placeholder="Поиск по номеру..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Номер</th>
                <th>Организация</th>
                <th>Список</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlates.map(plate => (
                <tr key={plate.id} className={!plate.isActive ? styles.inactiveRow : ''}>
                  <td>
                    <span className={styles.plateNumber}>{plate.plateNumber}</span>
                    {plate.vehicleBrand && <span className={styles.vehicleInfo}>{plate.vehicleBrand} {plate.vehicleModel}</span>}
                  </td>
                  <td>{plate.organizationName || 'Гость'}</td>
                  <td><span style={{ color: plate.listColor }}>{plate.listName}</span></td>
                  <td>
                    <span className={`${styles.statusBadge} ${plate.isActive ? styles.active : styles.inactive}`}>
                      {plate.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.actionBtn} onClick={() => {
                        setEditingPlate(plate);
                        setSelectedEditList(lists.find(l => l.id === plate.listId) || null);
                      }} title="Редактировать">
                        <i className="ri-pencil-line"></i>
                      </button>
                      <button className={styles.actionBtn} onClick={() => setDeletingPlate(plate)} title="Удалить">
                        <i className="ri-delete-bin-line" style={{ color: '#ef4444' }}></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPlates.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>Номера не найдены</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Модалка добавления номера */}
      {showAddForm && (
        <div className={styles.modal} onClick={() => setShowAddForm(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2>Добавить номер</h2>
            <form onSubmit={handleAddPlate}>
              <input 
                type="text" 
                placeholder="Гос. номер * (латиница и цифры)" 
                value={formData.plateNumber} 
                onChange={e => setFormData(prev => ({ ...prev, plateNumber: formatPlateNumber(e.target.value) }))} 
                required 
              />
              <input type="text" placeholder="Марка" value={formData.vehicleBrand} onChange={e => setFormData(prev => ({ ...prev, vehicleBrand: e.target.value }))} />
              <input type="text" placeholder="Модель" value={formData.vehicleModel} onChange={e => setFormData(prev => ({ ...prev, vehicleModel: e.target.value }))} />
              <input type="text" placeholder="Цвет" value={formData.vehicleColor} onChange={e => setFormData(prev => ({ ...prev, vehicleColor: e.target.value }))} />
              
              <CustomAutocomplete
                options={organizations.filter((org) => org.name !== "Гость")}
                value={selectedOrg}
                onChange={(newValue) => {
                  setSelectedOrg(newValue);
                  setFormData(prev => ({ ...prev, organizationId: newValue?.id || '' }));
                }}
                placeholder="Поиск организации..."
                disabled={formData.withoutOrg}
                noOptionsText="Организации не найдены"
              />

              <label className={styles.checkbox}>
                <input type="checkbox" checked={formData.withoutOrg} onChange={e => {
                  setFormData(prev => ({ ...prev, withoutOrg: e.target.checked, organizationId: '' }));
                  if (e.target.checked) setSelectedOrg(null);
                }} />
                Без организации (Гость)
              </label>
              <textarea 
                placeholder="Примечания *" 
                value={formData.notes} 
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                required 
              />
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowAddForm(false)}>Отмена</button>
                <button type="submit" disabled={submitting}>{submitting ? 'Добавление...' : 'Добавить'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка редактирования номера */}
      {editingPlate && (
        <div className={styles.modal} onClick={() => setEditingPlate(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2>Редактировать номер</h2>
            <form onSubmit={handleUpdatePlate}>
              <input 
                type="text" 
                value={editingPlate.plateNumber} 
                onChange={e => setEditingPlate(prev => prev ? { ...prev, plateNumber: formatPlateNumber(e.target.value) } : null)} 
              />
              <input type="text" placeholder="Марка" value={editingPlate.vehicleBrand || ''} onChange={e => setEditingPlate(prev => prev ? { ...prev, vehicleBrand: e.target.value } : null)} />
              <input type="text" placeholder="Модель" value={editingPlate.vehicleModel || ''} onChange={e => setEditingPlate(prev => prev ? { ...prev, vehicleModel: e.target.value } : null)} />
              <input type="text" placeholder="Цвет" value={editingPlate.vehicleColor || ''} onChange={e => setEditingPlate(prev => prev ? { ...prev, vehicleColor: e.target.value } : null)} />
              
              <CustomAutocomplete
                options={lists}
                value={selectedEditList}
                onChange={(newValue) => {
                  setSelectedEditList(newValue);
                  setEditingPlate(prev => prev ? { ...prev, listId: newValue?.id || '' } : null);
                }}
                placeholder="Поиск списка..."
                noOptionsText="Списки не найдены"
              />

              <label className={styles.checkbox}>
                <input type="checkbox" checked={editingPlate.isActive} onChange={e => setEditingPlate(prev => prev ? { ...prev, isActive: e.target.checked } : null)} />
                Активен
              </label>
              <textarea 
                placeholder="Примечания *" 
                value={editingPlate.notes || ''} 
                onChange={e => setEditingPlate(prev => prev ? { ...prev, notes: e.target.value } : null)}
                required 
              />
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setEditingPlate(null)}>Отмена</button>
                <button type="submit" disabled={submitting}>Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка удаления номера */}
      {deletingPlate && (
        <div className={styles.modal} onClick={() => setDeletingPlate(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2>Удалить номер</h2>
            <p>Вы собираетесь удалить номер <strong>{deletingPlate.plateNumber}</strong></p>
            <textarea
              placeholder="Укажите причину удаления *"
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              required
            />
            <div className={styles.modalActions}>
              <button type="button" onClick={() => { setDeletingPlate(null); setDeleteReason(''); }}>Отмена</button>
              <button className={styles.deleteButton} onClick={handleDeletePlate}>Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}