"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { formatDate } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

interface DeletedPlate {
  id: string;
  plateNumber: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  organizationName?: string;
  listName?: string;
  deletedByName?: string;
  deleteReason?: string;
  deletedAt: string;
}

export default function DeletedPlatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plates, setPlates] = useState<DeletedPlate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user && user.roleId !== 1) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.roleId === 1) {
      fetchDeletedPlates();
    }
  }, [user]);

  const fetchDeletedPlates = async () => {
    try {
      setLoading(true);
      const response = await api.get<DeletedPlate[]>('/admin/deleted-plates');
      setPlates(response.data || []);
    } catch (error) {
      console.error('Error fetching deleted plates:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlates = plates.filter(plate => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      plate.plateNumber.toLowerCase().includes(term) ||
      (plate.organizationName?.toLowerCase() || '').includes(term) ||
      (plate.deletedByName?.toLowerCase() || '').includes(term) ||
      (plate.deleteReason?.toLowerCase() || '').includes(term)
    );
  });

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header role="admin" />

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <i className="ri-delete-bin-line"></i>
            Удалённые номера
          </h1>
          <p className={styles.subtitle}>
            История номеров, удалённых участниками
          </p>
        </div>

        <div className={styles.controls}>
          <div className={styles.searchBox}>
            <i className="ri-search-line"></i>
            <input
              type="text"
              placeholder="Поиск по номеру, организации, причине..."
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
          <button onClick={fetchDeletedPlates} className={styles.refreshButton}>
            <i className="ri-refresh-line"></i>
            Обновить
          </button>
        </div>

        <div className={styles.stats}>
          Всего удалено: <strong>{plates.length}</strong> номеров
        </div>

        {filteredPlates.length > 0 ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Марка/Модель</th>
                  <th>Организация</th>
                  <th>Список</th>
                  <th>Удалил</th>
                  <th>Причина</th>
                  <th>Дата удаления</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlates.map((plate) => (
                  <tr key={plate.id}>
                    <td className={styles.plateNumber}>{plate.plateNumber}</td>
                    <td>
                      {plate.vehicleBrand && plate.vehicleModel
                        ? `${plate.vehicleBrand} ${plate.vehicleModel}`
                        : '—'}
                      {plate.vehicleColor && <span className={styles.color}> ({plate.vehicleColor})</span>}
                    </td>
                    <td>{plate.organizationName || '—'}</td>
                    <td>{plate.listName || '—'}</td>
                    <td>{plate.deletedByName || '—'}</td>
                    <td className={styles.reason}>{plate.deleteReason || '—'}</td>
                    <td>{formatDate(plate.deletedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <i className="ri-inbox-line"></i>
            <h3>Нет удалённых номеров</h3>
            <p>История удалений пуста</p>
          </div>
        )}
      </main>
    </div>
  );
}