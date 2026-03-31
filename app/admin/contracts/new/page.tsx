"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import contractService from '@/services/contract.service';
import organizationService from '@/services/organization.service';
import { Organization, ApiError } from '@/types';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function NewContractPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [formData, setFormData] = useState({
    contractNumber: '',
    organizationId: '',
    contractDate: new Date().toISOString().split('T')[0],
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    contractType: 'standard',
    notes: '',
  });

  // Загружаем список организаций при монтировании
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const orgs = await organizationService.getAll();
      setOrganizations(orgs);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Ошибка при загрузке списка организаций');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      setLoading(true);
      
      const newContract = await contractService.create({
        contractNumber: formData.contractNumber,
        organizationId: formData.organizationId,
        contractDate: formData.contractDate,
        validFrom: formData.validFrom,
        validUntil: formData.validUntil || undefined,
        contractType: formData.contractType,
        notes: formData.notes || undefined,
      });
      
      toast.success('Договор успешно создан');
      router.push(`/admin/contracts/${newContract.id}`);
    } catch (error: unknown) {
      console.error('Error creating contract:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        if (apiError.response?.data?.error) {
          toast.error(apiError.response.data.error);
        } else {
          toast.error('Ошибка при создании договора');
        }
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Ошибка при создании договора');
      }
    } finally {
      setLoading(false);
    }
  };

  const getContractTypeName = (type: string) => {
    switch (type) {
      case 'standard': return 'Стандартный';
      case 'vip': return 'VIP';
      case 'temporary': return 'Временный';
      default: return type;
    }
  };

  return (
    <div className={styles.container}>
      <Header role='admin'/>
      {/* Заголовок */}
      {/* <div className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>Новый договор</h1>
            <p className={styles.subtitle}>Создание нового договора с организацией</p>
          </div>
          <Link href="/admin/contracts" className={styles.backButton}>
            <i className="ri-arrow-left-line"></i>
            <span>Назад к списку</span>
          </Link>
        </div>
      </div> */}

      {/* Форма */}
      <div className={styles.main}>
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Номер договора */}
            <div className={styles.formGroup}>
              <label htmlFor="contractNumber" className={styles.label}>
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
                disabled={loading}
                required
              />
              <p className={styles.help}>Уникальный номер договора</p>
            </div>

            {/* Организация */}
            <div className={styles.formGroup}>
              <label htmlFor="organizationId" className={styles.label}>
                Организация <span className={styles.required}>*</span>
              </label>
              <select
                id="organizationId"
                name="organizationId"
                value={formData.organizationId}
                onChange={handleChange}
                className={styles.select}
                disabled={loading || organizations.length === 0}
                required
              >
                <option value="">Выберите организацию</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.bin})
                  </option>
                ))}
              </select>
              {organizations.length === 0 && (
                <p className={styles.error}>
                  Нет доступных организаций. 
                  <Link href="/admin/organizations/new" className={styles.errorLink}>
                    Создайте организацию
                  </Link>
                </p>
              )}
            </div>

            {/* Тип договора */}
            <div className={styles.formGroup}>
              <label htmlFor="contractType" className={styles.label}>
                Тип договора <span className={styles.required}>*</span>
              </label>
              <select
                id="contractType"
                name="contractType"
                value={formData.contractType}
                onChange={handleChange}
                className={styles.select}
                disabled={loading}
                required
              >
                <option value="standard">Стандартный</option>
                <option value="vip">VIP</option>
                <option value="temporary">Временный</option>
              </select>
              <p className={styles.help}>
                Выбран тип: {getContractTypeName(formData.contractType)}
              </p>
            </div>

            {/* Дата договора */}
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label htmlFor="contractDate" className={styles.label}>
                  Дата договора <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  id="contractDate"
                  name="contractDate"
                  value={formData.contractDate}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={loading}
                  required
                />
              </div>

              {/* Дата начала действия */}
              <div className={styles.formGroup}>
                <label htmlFor="validFrom" className={styles.label}>
                  Действует с <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  id="validFrom"
                  name="validFrom"
                  value={formData.validFrom}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Дата окончания */}
            <div className={styles.formGroup}>
              <label htmlFor="validUntil" className={styles.label}>
                Действует до
              </label>
              <input
                type="date"
                id="validUntil"
                name="validUntil"
                value={formData.validUntil}
                onChange={handleChange}
                className={styles.input}
                disabled={loading}
                min={formData.validFrom}
              />
              <p className={styles.help}>Оставьте пустым для бессрочного договора</p>
            </div>

            {/* Примечания */}
            <div className={styles.formGroup}>
              <label htmlFor="notes" className={styles.label}>
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
                disabled={loading}
              />
            </div>

            {/* Информация о типах договоров */}
            {/* <div className={styles.infoBox}>
              <i className="ri-information-line"></i>
              <div className={styles.infoContent}>
                <p className={styles.infoTitle}>О типах договоров:</p>
                <ul className={styles.infoList}>
                  <li>
                    <strong>Стандартный</strong> - обычный договор для участников СЭЗ
                  </li>
                  <li>
                    <strong>VIP</strong> - особые условия, приоритетная обработка
                  </li>
                  <li>
                    <strong>Временный</strong> - краткосрочный договор (до 30 дней)
                  </li>
                </ul>
              </div>
            </div> */}

            {/* Кнопки */}
            <div className={styles.formActions}>
              <Link
                href="/admin/contracts"
                className={styles.cancelButton}
              >
                Отмена
              </Link>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading || organizations.length === 0}
              >
                {loading ? (
                  <>
                    <i className="ri-loader-4-line ri-spin"></i>
                    <span>Создание...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-file-copy-line"></i>
                    <span>Создать договор</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}