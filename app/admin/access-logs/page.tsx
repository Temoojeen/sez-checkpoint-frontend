"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import accessLogsService from '@/services/access-logs.service';
import { AccessLog } from '@/types';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function AdminAccessLogs() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [plateNumber, setPlateNumber] = useState(''); // добавляем состояние для номера
  const [period, setPeriod] = useState({ from: '', to: '' });

  // Проверка прав доступа
  useEffect(() => {
    if (!loading && (!user || user.roleId !== 1)) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, loading, router]);

  // Загрузка логов при монтировании и при изменении фильтров
  useEffect(() => {
    if (user && user.roleId === 1) {
      fetchLogs();
    }
  }, [user, dateFrom, dateTo, plateNumber]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoadingData(true);
      const response = await accessLogsService.getAll(
        dateFrom || undefined, 
        dateTo || undefined,
        plateNumber || undefined
      );
      setLogs(response.logs || []);
      setTotal(response.total || 0);
      if (response.period) {
        setPeriod(response.period);
      }
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      toast.error(error.response?.data?.error || 'Ошибка при загрузке истории');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoadingData(false);
    }
  }, [dateFrom, dateTo, plateNumber]);

  const handleFilter = () => {
    fetchLogs();
  };

  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setPlateNumber('');
  };

  const formatDateTime = (dateString: string) => {
    const localDateString = dateString.replace('Z', '');
    const date = new Date(localDateString);
  
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (granted: boolean) => {
    if (granted) {
      return <span className={styles.statusGranted}>Разрешен</span>;
    } else {
      return <span className={styles.statusDenied}>Запрещен</span>;
    }
  };

  if (loading || !user) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* <div className={styles.header}>
        <h1 className={styles.title}>
          <i className="ri-history-line"></i>
          История проездов
        </h1>
        <p className={styles.subtitle}>
          Просмотр всех проездов через КПП
        </p>
      </div> */}
      <Header role='admin'/>

      <div className={styles.filterCard}>
        <div className={styles.filterTitle}>
          <i className="ri-filter-line"></i>
          Фильтр по датам и номеру
        </div>
        <div className={styles.filterForm}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Дата с</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={styles.filterInput}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Дата по</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={styles.filterInput}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Гос. номер</label>
            <input
              type="text"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
              className={styles.filterInput}
              placeholder="A583OE197"
              style={{ minWidth: '150px' }}
            />
          </div>
          <div className={styles.filterActions}>
            <button onClick={handleFilter} className={styles.filterButton}>
              <i className="ri-search-line"></i>
              Поиск
            </button>
            <button onClick={handleReset} className={styles.resetButton}>
              <i className="ri-close-line"></i>
              Сбросить
            </button>
          </div>
        </div>
        {period.from && period.to && (
          <div className={styles.periodInfo}>
            <i className="ri-calendar-line"></i>
            Период: {period.from} — {period.to}
            {plateNumber && (
              <span style={{ marginLeft: '16px' }}>
                <i className="ri-car-line"></i>
                Номер: {plateNumber}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.statsCard}>
        <div className={styles.statsInfo}>
          <i className="ri-bar-chart-2-line"></i>
          <span>Найдено записей: <strong>{total}</strong></span>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loadingData ? (
          <div className={styles.loadingContent}>
            <div className={styles.spinner}></div>
            <p>Загрузка данных...</p>
          </div>
        ) : logs.length > 0 ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Гос. номер</th>
                  <th>Организация</th>
                  <th>Список</th>
                  <th>Статус</th>
                  <th>Камера</th>
                  <th>Время проезда</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={log.id}>
                    <td>{index + 1}</td>
                    <td className={styles.plateNumber}>{log.plateNumber}</td>
                    <td>{log.organizationName || '—'}</td>
                    <td>{log.listName || '—'}</td>
                    <td>{getStatusBadge(log.accessGranted)}</td>
                    <td>{log.cameraLocation || log.cameraId || 'КПП-1'}</td>
                    <td>{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <i className="ri-inbox-line"></i>
            <h3>Нет данных</h3>
            <p>За выбранный период не найдено записей о проездах</p>
          </div>
        )}
      </div>
    </div>
  );
}