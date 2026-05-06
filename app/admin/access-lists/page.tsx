"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import accessListService from '@/services/access-list.service';
import { AccessList } from '@/types';
import { formatDate } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function AccessListsPage() {
  const [lists, setLists] = useState<AccessList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      setLoading(true);
      const data = await accessListService.getAll();
      setLists(data);
    } catch (error) {
      console.error('Error fetching access lists:', error);
      toast.error('Ошибка при загрузке списков доступа');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить список "${name}"?`)) {
      try {
        await accessListService.delete(id);
        toast.success('Список удален');
        fetchLists();
      } catch (error) {
        console.error('Error deleting list:', error);
        toast.error('Ошибка при удалении списка');
      }
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await accessListService.update(id, { isActive: !currentStatus });
      toast.success(`Список ${!currentStatus ? 'активирован' : 'деактивирован'}`);
      fetchLists();
    } catch (error) {
      console.error('Error toggling list status:', error);
      toast.error('Ошибка при изменении статуса');
    }
  };

  const filteredLists = lists?.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityLabel = (priority: number) => {
    if (priority === 0) return 'Наивысший';
    if (priority <= 3) return 'Высокий';
    if (priority <= 7) return 'Средний';
    return 'Низкий';
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка списков доступа...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Заголовок */}
      {/* <div className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>Списки доступа</h1>
            <p className={styles.subtitle}>Управление списками для пропусков</p>
          </div>
          <Link href="/admin/access-lists/new" className={styles.createButton}>
            <i className="ri-add-line"></i>
            <span>Новый список</span>
          </Link>
        </div>
      </div> */}
      <Header role='admin'/>

      <main className={styles.main}>
        {/* Панель поиска */}
        <div className={styles.searchSection}>
          <div className={styles.searchBox}>
            <i className={`ri-search-line ${styles.searchIcon}`}></i>
            <input
              type="text"
              placeholder="Поиск по названию или описанию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
          <div className={styles.stats}>
            <span className={styles.statsItem}>
              <i className="ri-list-check-3"></i>
              Всего: {lists?.length}
            </span>
            <span className={styles.statsItem}>
              <i className="ri-checkbox-circle-line"></i>
              Активных: {lists?.filter(l => l.isActive).length}
            </span>
          </div>
        </div>

        {/* Сетка списков */}
        {filteredLists?.length > 0 ? (
          <div className={styles.listsGrid}>
            {filteredLists.map((list) => (
              <div
                key={list.id}
                className={`${styles.listCard} ${!list.isActive ? styles.listCardInactive : ''}`}
                style={{ borderTopColor: list.color || '#3b82f6' }}
              >
                <div className={styles.listHeader}>
                  <div className={styles.listTitleSection}>
                    <h3 className={styles.listName}>{list.name}</h3>
                    {list.priority !== undefined && (
                      <span 
                        className={styles.priorityBadge}
                        style={{ backgroundColor: `${list.color || '#3b82f6'}20`, color: list.color || '#3b82f6' }}
                      >
                        <i className="ri-arrow-up-line"></i>
                        {getPriorityLabel(list.priority)} ({list.priority})
                      </span>
                    )}
                  </div>
                  <span className={`${styles.statusBadge} ${list.isActive ? styles.statusActive : styles.statusInactive}`}>
                    {list.isActive ? 'Активен' : 'Неактивен'}
                  </span>
                </div>

                {list.description && (
                  <p className={styles.listDescription}>{list.description}</p>
                )}

                <div className={styles.listMeta}>
                  <div className={styles.metaItem}>
                    <i className="ri-calendar-line"></i>
                    <span>Создан: {formatDate(list.createdAt)}</span>
                  </div>
                  {list.color && (
                    <div className={styles.metaItem}>
                      <i className="ri-palette-line"></i>
                      <span className={styles.colorPreview} style={{ backgroundColor: list.color }}>
                        {list.color}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.listActions}>
                  <Link
                    href={`/admin/access-lists/${list.id}`}
                    className={styles.actionButton}
                    title="Просмотр"
                  >
                    <i className="ri-eye-line"></i>
                  </Link>
                  <Link
                    href={`/admin/access-lists/${list.id}/edit`}
                    className={styles.actionButton}
                    title="Редактировать"
                  >
                    <i className="ri-pencil-line"></i>
                  </Link>
                  <button
                    onClick={() => handleToggleActive(list.id, list.isActive)}
                    className={`${styles.actionButton} ${list.isActive ? styles.actionWarn : styles.actionSuccess}`}
                    title={list.isActive ? 'Деактивировать' : 'Активировать'}
                  >
                    <i className={list.isActive ? 'ri-pause-circle-line' : 'ri-play-circle-line'}></i>
                  </button>
                  <button
                    onClick={() => handleDelete(list.id, list.name)}
                    className={`${styles.actionButton} ${styles.actionDanger}`}
                    title="Удалить"
                  >
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <i className="ri-list-check-3"></i>
            <h3 className={styles.emptyStateTitle}>Списки не найдены</h3>
            <p className={styles.emptyStateText}>
              {searchTerm 
                ? 'Попробуйте изменить параметры поиска'
                : 'Создайте первый список доступа для начала работы'}
            </p>
            {!searchTerm && (
              <Link href="/admin/access-lists/new" className={styles.emptyStateButton}>
                <i className="ri-add-line"></i>
                Создать список
              </Link>
            )}
            
          </div>
        )}
         <Link href="/admin/access-lists/new" style={{marginTop:"20px"}} className={styles.emptyStateButton}>
                <i className="ri-add-line"></i>
                Создать новый список
              </Link>
      </main>
    </div>
  );
}