"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import organizationService from '@/services/organization.service';
import { Organization } from '@/types';
import { formatDate } from '@/utils/format';
import styles from "./page.module.css"
import Header from '@/components/Header/Header';

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const data = await organizationService.getAll();
      setOrganizations(data);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Ошибка при загрузке организаций');
    } finally {
      setLoading(false);
    }
  };

const handleDelete = async (id: string, name: string) => {
  const reason = window.prompt(
    `Вы собираетесь удалить организацию "${name}".\n\nЭто действие нельзя отменить. Будут удалены:\n- Все номера организации\n- Все заявки организации\n- Все договоры организации\n- Пользователи будут отвязаны от организации\n\nВведите причину удаления:`,
    ''
  );

  if (!reason || reason.trim() === '') {
    toast.error('Удаление отменено. Необходимо указать причину.');
    return;
  }

  if (window.confirm(`Причина: "${reason}"\n\nВы уверены, что хотите удалить организацию "${name}"?`)) {
    try {
      await organizationService.delete(id);
      toast.success('Организация удалена');
      fetchOrganizations();
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('Ошибка при удалении организации');
    }
  }
};

  const filteredOrganizations = organizations?.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.bin.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка организаций...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Заголовок */}
      {/* <div className={styles.header}>
        <h1 className={styles.title}>Организации</h1>
        <p className={styles.subtitle}>Управление организациями-участниками</p>
      </div> */}
      <Header role='admin'/>

      {/* Панель действий */}
      <div className={styles.actionPanel}>
        <div className={styles.actionBar}>
          <div className={styles.searchWrapper}>
            <i className="ri-search-line"></i>
            <input
              type="text"
              placeholder="Поиск по названию или БИН..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <Link
            href="/admin/organizations/new"
            className={styles.addButton}
          >
            <span>Добавить организацию</span>
          </Link>
        </div>
      </div>

      {/* Таблица организаций */}
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeader}>Название</th>
                <th className={styles.tableHeader}>БИН</th>
                <th className={styles.tableHeader}>Контакт</th>
                <th className={styles.tableHeader}>Дата создания</th>
                <th className={styles.tableHeader}>Действия</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {filteredOrganizations?.length > 0 ? (
                filteredOrganizations.map((org) => (
                  <tr key={org.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>
                      <div className={styles.orgName}>{org.name}</div>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={styles.bin}>{org.bin}</span>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.contactInfo}>
                        {org.contactPhone && (
                          <div className={styles.contactItem}>
                            <i className="ri-phone-line"></i>
                            {org.contactPhone}
                          </div>
                        )}
                        {org.contactEmail && (
                          <div className={styles.contactItem}>
                            <i className="ri-mail-line"></i>
                            {org.contactEmail}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={styles.date}>{formatDate(org.createdAt)}</span>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.actions}>
                        <Link
                          href={`/admin/organizations/${org.id}`}
                          className={`${styles.actionButton} ${styles.viewButton}`}
                          title="Просмотр"
                        >
                          <i className="ri-eye-line"></i>
                        </Link>
                        <Link
                          href={`/admin/organizations/${org.id}/edit`}
                          className={`${styles.actionButton} ${styles.editButton}`}
                          title="Редактировать"
                        >
                          <i className="ri-pencil-line"></i>
                        </Link>
                        <button
                          onClick={() => handleDelete(org.id, org.name)}
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          title="Удалить"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    {searchTerm ? 'Ничего не найдено' : 'Нет организаций'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}