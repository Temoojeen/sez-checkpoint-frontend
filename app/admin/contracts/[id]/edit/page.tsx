"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import contractService from '@/services/contract.service';
import organizationService from '@/services/organization.service';
import { Contract, Organization, ApiError } from '@/types';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contract, setContract] = useState<Contract | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [formData, setFormData] = useState({
    contractNumber: '',
    organizationId: '',
    contractDate: '',
    validFrom: '',
    validUntil: '',
    contractType: 'standard',
    status: 'active',
    notes: '',
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
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [contractData, orgsData] = await Promise.all([
        contractService.getById(id),
        organizationService.getAll(),
      ]);
      
      setContract(contractData);
      setOrganizations(orgsData);
      
      setFormData({
        contractNumber: contractData.contractNumber || '',
        organizationId: contractData.organizationId || '',
        contractDate: contractData.contractDate ? contractData.contractDate.split('T')[0] : '',
        validFrom: contractData.validFrom ? contractData.validFrom.split('T')[0] : '',
        validUntil: contractData.validUntil ? contractData.validUntil.split('T')[0] : '',
        contractType: contractData.contractType || 'standard',
        status: contractData.status || 'active',
        notes: contractData.notes || '',
      });
      
    } catch (error: unknown) {
      console.error('Error fetching contract:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        if (apiError.response?.status === 404) {
          toast.error('Договор не найден');
          router.push('/admin/contracts');
        } else {
          toast.error('Ошибка при загрузке данных');
        }
      } else {
        toast.error('Ошибка при загрузке данных');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contract) return;
    
    // Валидация
    if (!formData.contractNumber.trim()) {
      toast.error('Введите номер договора');
      return;
    }
    
    if (!formData.organizationId) {
      toast.error('Выберите организацию');
      return;
    }
    
    if (!formData.contractDate) {
      toast.error('Укажите дату договора');
      return;
    }
    
    if (!formData.validFrom) {
      toast.error('Укажите дату начала действия');
      return;
    }
    
    if (formData.validUntil && new Date(formData.validUntil) < new Date(formData.validFrom)) {
      toast.error('Дата окончания не может быть раньше даты начала');
      return;
    }

    try {
      setSaving(true);
      
      await contractService.update(contract.id, {
        contractNumber: formData.contractNumber,
        organizationId: formData.organizationId,
        contractDate: formData.contractDate,
        validFrom: formData.validFrom,
        validUntil: formData.validUntil || undefined,
        contractType: formData.contractType,
        status: formData.status,
        notes: formData.notes || undefined,
      });
      
      toast.success('Договор успешно обновлен');
      router.push(`/admin/contracts/${id}`);
      
    } catch (error: unknown) {
      console.error('Error updating contract:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        toast.error(apiError.response?.data?.error || 'Ошибка при обновлении');
      } else {
        toast.error('Ошибка при обновлении');
      }
    } finally {
      setSaving(false);
    }
  };


  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active': return { text: 'Активен', color: 'green' };
      case 'expired': return { text: 'Истек', color: 'red' };
      case 'terminated': return { text: 'Расторгнут', color: 'gray' };
      default: return { text: status, color: 'gray' };
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'standard': return { text: 'Стандартный', color: '#2563eb' };
      case 'vip': return { text: 'VIP', color: '#8b5cf6' };
      case 'temporary': return { text: 'Временный', color: '#f59e0b' };
      default: return { text: type, color: '#6b7280' };
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка данных договора...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className={styles.errorContainer}>
        <i className="ri-error-warning-line"></i>
        <h2>Договор не найден</h2>
        <Link href="/admin/contracts" className={styles.backButton}>
          <i className="ri-arrow-left-line"></i>
          Вернуться к списку
        </Link>
      </div>
    );
  }

  const status = getStatusInfo(formData.status);
  const type = getTypeInfo(formData.contractType);

  return (
    <div className={styles.container}>
        <Header role='admin'/>
      {/* Верхняя панель */}
      {/* <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <Link href={`/admin/contracts/${id}`} className={styles.backLink}>
              <i className="ri-arrow-left-line"></i>
              <span>К информации о договоре</span>
            </Link>
            <div>
              <h1 className={styles.title}>Редактирование договора</h1>
              <p className={styles.subtitle}>
                {contract.contractNumber}
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
        <div className={styles.formCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <i className="ri-file-copy-line"></i>
              Редактировать договор
            </h2>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Номер договора */}
            <div className={styles.formGroup}>
              <label htmlFor="contractNumber">
                Номер договора <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="contractNumber"
                name="contractNumber"
                value={formData.contractNumber}
                onChange={handleChange}
                className={styles.input}
                placeholder="ДОГ-2024-001"
                disabled={saving}
                required
              />
            </div>

            {/* Организация */}
            <div className={styles.formGroup}>
              <label htmlFor="organizationId">
                Организация <span className={styles.required}>*</span>
              </label>
              <select
                id="organizationId"
                name="organizationId"
                value={formData.organizationId}
                onChange={handleChange}
                className={styles.select}
                disabled={saving || organizations.length === 0}
                required
              >
                <option value="">Выберите организацию</option>
                {organizations?.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.bin})
                  </option>
                ))}
              </select>
            </div>

            {/* Тип договора */}
            <div className={styles.formGroup}>
              <label htmlFor="contractType">
                Тип договора <span className={styles.required}>*</span>
              </label>
              <select
                id="contractType"
                name="contractType"
                value={formData.contractType}
                onChange={handleChange}
                className={styles.select}
                disabled={saving}
                required
              >
                <option value="standard">Стандартный</option>
                <option value="vip">VIP</option>
                <option value="temporary">Временный</option>
              </select>
              <p className={styles.help}>
                Выбран тип: {type.text}
              </p>
            </div>

            {/* Статус договора */}
            <div className={styles.formGroup}>
              <label htmlFor="status">
                Статус <span className={styles.required}>*</span>
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={styles.select}
                disabled={saving}
                required
              >
                <option value="active">Активен</option>
                <option value="expired">Истек</option>
                <option value="terminated">Расторгнут</option>
              </select>
              <p className={styles.help}>
                Текущий статус: {status.text}
              </p>
            </div>

            {/* Даты */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="contractDate">
                  Дата договора <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  id="contractDate"
                  name="contractDate"
                  value={formData.contractDate}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={saving}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="validFrom">
                  Действует с <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  id="validFrom"
                  name="validFrom"
                  value={formData.validFrom}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={saving}
                  required
                />
              </div>
            </div>

            {/* Дата окончания */}
            <div className={styles.formGroup}>
              <label htmlFor="validUntil">
                Действует до
              </label>
              <input
                type="date"
                id="validUntil"
                name="validUntil"
                value={formData.validUntil}
                onChange={handleChange}
                className={styles.input}
                disabled={saving}
                min={formData.validFrom}
              />
              <p className={styles.help}>Оставьте пустым для бессрочного договора</p>
            </div>

            {/* Примечания */}
            <div className={styles.formGroup}>
              <label htmlFor="notes">
                Примечания
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="Дополнительная информация о договоре"
                rows={4}
                disabled={saving}
              />
            </div>

            {/* Информация о типах договоров */}
            <div className={styles.infoBox}>
              <i className="ri-information-line"></i>
              <div className={styles.infoContent}>
                <p className={styles.infoTitle}>О типах договоров:</p>
                <ul className={styles.infoList}>
                  <li><strong>Стандартный</strong> - обычный договор для участников СЭЗ</li>
                  <li><strong>VIP</strong> - особые условия, приоритетная обработка</li>
                  <li><strong>Временный</strong> - краткосрочный договор (до 30 дней)</li>
                </ul>
              </div>
            </div>

            {/* Кнопки */}
            <div className={styles.formActions}>
              <Link
                href={`/admin/contracts/${id}`}
                className={styles.cancelButton}
              >
                Отмена
              </Link>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <i className="ri-loader-4-line ri-spin"></i>
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-save-line"></i>
                    <span>Сохранить изменения</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}