"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import accessListService from '@/services/access-list.service';
import approvedPlateService from '@/services/approved-plate.service';
import { AccessList, ApprovedPlate, ApiError } from '@/types';
import { formatDate } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function OperatorListsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessLists, setAccessLists] = useState<AccessList[]>([]);
  const [selectedList, setSelectedList] = useState<AccessList | null>(null);
  const [plates, setPlates] = useState<ApprovedPlate[]>([]);
  const [platesLoading, setPlatesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);

  // Проверка роли
  useEffect(() => {
    if (user && user.roleId !== 2) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  // Загрузка списков
  useEffect(() => {
    if (user && user.roleId === 2 && !dataLoaded) {
      fetchLists();
    }
  }, [user, dataLoaded]);

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching lists...'); // Отладка
      
      // Загружаем все списки через публичный эндпоинт
      const listsData = await accessListService.getAllPublic();
      console.log('Lists data:', listsData); // Отладка
      
      const safeLists = Array.isArray(listsData) ? listsData : [];
      setAccessLists(safeLists);
      
      // Если есть списки, выбираем первый
      if (safeLists.length > 0) {
        setSelectedList(safeLists[0]);
      }
      
      setDataLoaded(true);
    } catch (error) {
      console.error('Error fetching lists:', error);
      toast.error('Ошибка при загрузке списков');
      setAccessLists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка номеров при выборе списка
  useEffect(() => {
    if (selectedList) {
      fetchPlatesByList(selectedList.id);
    } else {
      setPlates([]);
    }
  }, [selectedList]);

  const fetchPlatesByList = async (listId: string) => {
    try {
      setPlatesLoading(true);
      console.log('Fetching plates for list:', listId); // Отладка
      
      // Загружаем номера для выбранного списка - используем getByList
      const platesData = await approvedPlateService.getByList(listId);
      console.log('Plates data:', platesData); // Отладка
      
      const safePlates = Array.isArray(platesData) ? platesData : [];
      setPlates(safePlates);
      
    } catch (error) {
      console.error('Error fetching plates:', error);
      toast.error('Ошибка при загрузке номеров');
      setPlates([]);
    } finally {
      setPlatesLoading(false);
    }
  };

  const handleListSelect = (list: AccessList) => {
    setSelectedList(list);
    setSearchTerm('');
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleRefresh = () => {
    if (selectedList) {
      fetchPlatesByList(selectedList.id);
    }
  };

  const filteredPlates = plates?.filter(plate => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      plate.plateNumber.toLowerCase().includes(term) ||
      (plate.organizationName?.toLowerCase() || '').includes(term) ||
      (plate.vehicleBrand?.toLowerCase() || '').includes(term) ||
      (plate.vehicleModel?.toLowerCase() || '').includes(term)
    );
  });

  const handleLogout = () => {
    logout();
  };

  const isPlateActive = (plate: ApprovedPlate) => {
    if (!plate.isActive) return false;
    if (plate.validUntil && new Date(plate.validUntil) < new Date()) return false;
    return true;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка списков...</p>
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
            <Link href="/operator" className={styles.backLink}>
              <i className="ri-arrow-left-line"></i>
              <span>К заявкам</span>
            </Link>
            <div>
              <h1 className={styles.title}>Списки пропусков</h1>
              <p className={styles.subtitle}>
                Просмотр номеров в списках доступа
              </p>
            </div>
          </div>
          <div className={styles.userInfo}>
            <span className={styles.roleBadge}>
              Оператор
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
      <Header role="operator"/>

      <main className={styles.main}>
        {accessLists.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="ri-list-check-3"></i>
            <h3 className={styles.emptyStateTitle}>Нет списков</h3>
            <p className={styles.emptyStateText}>
              В системе пока нет созданных списков доступа
            </p>
          </div>
        ) : (
          <div className={styles.content}>
            {/* Боковая панель со списками */}
            <div className={styles.listsSidebar}>
              <h2 className={styles.sidebarTitle}>Списки доступа</h2>
              <div className={styles.listsGrid}>
                {accessLists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => handleListSelect(list)}
                    className={`${styles.listButton} ${selectedList?.id === list.id ? styles.listButtonActive : ''}`}
                    style={{
                      borderLeftColor: list.color || '#3b82f6',
                      backgroundColor: selectedList?.id === list.id ? `${list.color}20` : 'white',
                    }}
                  >
                    <div className={styles.listInfo}>
                      <span className={styles.listName}>{list.name}</span>
                      {list.description && (
                        <span className={styles.listDescription}>{list.description}</span>
                      )}
                    </div>
                    {/* <span className={styles.listPriority}>Приоритет: {list.priority}</span> */}
                  </button>
                ))}
              </div>
            </div>

            {/* Основной контент - номера выбранного списка */}
            <div className={styles.platesContent}>
              {selectedList && (
                <>
                  <div className={styles.platesHeader}>
                    <div>
                      <h2 className={styles.platesTitle}>
                        <span className={styles.listColorDot} style={{ backgroundColor: selectedList.color }}></span>
                        {selectedList.name}
                      </h2>
                      {selectedList.description && (
                        <p className={styles.platesSubtitle}>{selectedList.description}</p>
                      )}
                    </div>
                    
                    <div className={styles.platesControls}>
                      <div className={styles.searchBox}>
                        <i className={`ri-search-line ${styles.searchIcon}`}></i>
                        <input
                          type="text"
                          placeholder="Поиск по номеру или организации..."
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
                      
                      <button
                        onClick={handleRefresh}
                        className={styles.refreshButton}
                        disabled={platesLoading}
                      >
                        <i className={`ri-refresh-line ${platesLoading ? 'ri-spin' : ''}`}></i>
                      </button>
                    </div>
                  </div>

                  {platesLoading ? (
                    <div className={styles.platesLoading}>
                      <div className={styles.spinner}></div>
                      <p>Загрузка номеров...</p>
                    </div>
                  ) : filteredPlates?.length > 0 ? (
                    <div className={styles.platesGrid}>
                      {filteredPlates?.map((plate) => {
                        const active = isPlateActive(plate);
                        return (
                          <div
                            key={plate.id}
                            className={`${styles.plateCard} ${!active ? styles.plateCardInactive : ''}`}
                          >
                            <div className={styles.plateHeader}>
                              <span className={styles.plateNumber}>{plate.plateNumber}</span>
                              <span className={`${styles.statusBadge} ${active ? styles.statusActive : styles.statusInactive}`}>
                                {active ? 'Активен' : 'Неактивен'}
                              </span>
                            </div>
                            
                            <div className={styles.plateDetails}>
                              <div className={styles.detailRow}>
                                <i className="ri-building-4-line"></i>
                                <span>{plate.organizationName || 'Не указана'}</span>
                              </div>
                              
                              {(plate.vehicleBrand || plate.vehicleModel) && (
                                <div className={styles.detailRow}>
                                  <i className="ri-car-line"></i>
                                  <span>
                                    {plate.vehicleBrand} {plate.vehicleModel}
                                    {plate.vehicleColor && ` (${plate.vehicleColor})`}
                                  </span>
                                </div>
                              )}
                              
                              {plate.validFrom && (
                                <div className={styles.detailRow}>
                                  <i className="ri-calendar-check-line"></i>
                                  <span>с {formatDate(plate.validFrom)}</span>
                                </div>
                              )}
                              
                              {plate.validUntil ? (
                                <div className={styles.detailRow}>
                                  <i className="ri-calendar-close-line"></i>
                                  <span className={new Date(plate.validUntil) < new Date() ? styles.expiredDate : ''}>
                                    до {formatDate(plate.validUntil)}
                                  </span>
                                </div>
                              ) : (
                                <div className={styles.detailRow}>
                                  <i className="ri-calendar-line"></i>
                                  <span>бессрочно</span>
                                </div>
                              )}
                            </div>
                            
                            <div className={styles.plateFooter}>
                              <span className={styles.createdAt}>
                                Добавлен: {formatDate(plate.createdAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.emptyPlates}>
                      <i className="ri-inbox-line"></i>
                      <h3>Нет номеров</h3>
                      <p>
                        {searchTerm
                          ? 'По вашему запросу ничего не найдено'
                          : 'В этом списке пока нет утвержденных номеров'}
                      </p>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className={styles.clearSearchButton}
                        >
                          <i className="ri-close-line"></i>
                          Сбросить поиск
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}