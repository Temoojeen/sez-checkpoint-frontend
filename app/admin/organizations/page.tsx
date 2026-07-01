"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import organizationService from '@/services/organization.service';
import api from '@/services/api';
import { Organization } from '@/types';
import { formatDate } from '@/utils/format';
import styles from "./page.module.css"
import Header from '@/components/Header/Header';

interface ShareData {
  orgId: string;
  username: string;
  contractNumber: string;
  organizationName: string;
}

interface UserData {
  id: string;
  username: string;
  roleId: number;
  isActive: boolean;
  organizationId?: string;
}

interface ContractData {
  id: string;
  contractNumber: string;
  status: string;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

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

  const generatePassword = (): string => {
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '+-*@#$';
    
    let password = '';
    const numCount = Math.floor(Math.random() * 3) + 4;
    for (let i = 0; i < numCount; i++) {
      password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    const symCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < symCount; i++) {
      password += symbols.charAt(Math.floor(Math.random() * symbols.length));
    }
    const letterCount = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < letterCount; i++) {
      password += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleShare = async (orgId: string, orgName: string) => {
    setShareLoading(true);
    setGeneratedPassword('');
    try {
      const usersRes = await api.get<UserData[]>(`/admin/organizations/${orgId}/users`);
      const users = usersRes.data || [];
      const participant = users.find((u) => u.roleId === 4 && u.isActive);

      const contractsRes = await api.get<ContractData[]>(`/admin/organizations/${orgId}/contracts`);
      const contracts = contractsRes.data || [];
      const activeContract = contracts.find((c) => c.status === 'active');

      setShareData({
        orgId: orgId,
        username: participant?.username || 'Не назначен',
        contractNumber: activeContract?.contractNumber || 'Не найден',
        organizationName: orgName,
      });
    } catch (error) {
      console.error('Error loading share data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setShareLoading(false);
    }
  };

const handleCopy = async () => {
  if (!shareData) return;
  const newPassword = generatePassword();
  setGeneratedPassword(newPassword);

  try {
    const usersRes = await api.get<UserData[]>(`/admin/organizations/${shareData.orgId}/users`);
    const users = usersRes.data || [];
    const participant = users.find((u) => u.roleId === 4 && u.isActive);
    if (participant) {
      await api.put(`/admin/users/${participant.id}/password`, { password: newPassword });
    }
  } catch (error) {
    console.error('Error updating password:', error);
  }

  const text = `Логин: ${shareData.username}\nПароль: ${newPassword}\nНомер договора: ${shareData.contractNumber}\nkpp1.sezkhorgos.kz`;
  
  try {
    // Пробуем современный метод
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Фолбэк для HTTP
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopied(true);
    toast.success('Скопировано и пароль обновлён');
    setTimeout(() => setCopied(false), 2000);
  } catch {
    toast.error('Ошибка при копировании');
  }
};

  const handleDelete = async (id: string, name: string) => {
    const reason = window.prompt(
      `Вы собираетесь удалить организацию "${name}".\n\nЭто действие нельзя отменить. Будут удалены:\n- Все пользователи организации\n- Все номера организации\n- Все заявки организации\n- Все договоры организации\n\nВведите причину удаления:`,
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
      <Header role='admin'/>

      <div className={styles.actionPanel}>
        <div className={styles.actionBar}>
          <div className={styles.searchWrapper}>
            <i className="ri-search-line"></i>
            <input type="text" placeholder="Поиск по названию или БИН..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={styles.searchInput} />
          </div>
          <Link href="/admin/organizations/new" className={styles.addButton}><span>Добавить организацию</span></Link>
        </div>
      </div>

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
                    <td className={styles.tableCell}><div className={styles.orgName}>{org.name}</div></td>
                    <td className={styles.tableCell}><span className={styles.bin}>{org.bin}</span></td>
                    <td className={styles.tableCell}>
                      <div className={styles.contactInfo}>
                        {org.contactPhone && <div className={styles.contactItem}><i className="ri-phone-line"></i>{org.contactPhone}</div>}
                        {org.contactEmail && <div className={styles.contactItem}><i className="ri-mail-line"></i>{org.contactEmail}</div>}
                      </div>
                    </td>
                    <td className={styles.tableCell}><span className={styles.date}>{formatDate(org.createdAt)}</span></td>
                    <td className={styles.tableCell}>
                      <div className={styles.actions}>
                        <Link href={`/admin/organizations/${org.id}`} className={`${styles.actionButton} ${styles.viewButton}`} title="Просмотр"><i className="ri-eye-line"></i></Link>
                        <Link href={`/admin/organizations/${org.id}/edit`} className={`${styles.actionButton} ${styles.editButton}`} title="Редактировать"><i className="ri-pencil-line"></i></Link>
                        <button onClick={() => handleShare(org.id, org.name)} className={`${styles.actionButton} ${styles.shareButton}`} title="Поделиться данными" disabled={shareLoading}>
                          <i className="ri-share-line"></i>
                        </button>
                        <button onClick={() => handleDelete(org.id, org.name)} className={`${styles.actionButton} ${styles.deleteButton}`} title="Удалить"><i className="ri-delete-bin-line"></i></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className={styles.emptyState}>{searchTerm ? 'Ничего не найдено' : 'Нет организаций'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {shareData && (
        <div className={styles.modal} onClick={() => setShareData(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              <i className="ri-share-line"></i> Данные для {shareData.organizationName}
            </h3>
            <div className={styles.shareDataList}>
              <div className={styles.shareDataItem}>
                <span className={styles.shareDataLabel}>Логин:</span>
                <span className={styles.shareDataValue}>{shareData.username}</span>
              </div>
              <div className={styles.shareDataItem}>
                <span className={styles.shareDataLabel}>Пароль:</span>
                <span className={styles.shareDataValue}>
                  {generatedPassword || '••••••••'}
                </span>
              </div>
              <div className={styles.shareDataItem}>
                <span className={styles.shareDataLabel}>Номер договора:</span>
                <span className={styles.shareDataValue}>{shareData.contractNumber}</span>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setShareData(null)} className={styles.cancelBtn}>Закрыть</button>
              <button onClick={handleCopy} className={styles.copyBtn}>
                <i className={copied ? "ri-check-line" : "ri-file-copy-line"}></i>
                {copied ? 'Скопировано' : 'Скопировать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}