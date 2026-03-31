"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import organizationService from '@/services/organization.service';
import { ApiError } from '@/types';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function NewOrganizationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bin: '',
    address: '',
    contactPhone: '',
    contactEmail: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.name.trim()) {
      toast.error('Введите название организации');
      return;
    }
    
    if (!formData.bin.trim()) {
      toast.error('Введите БИН');
      return;
    }
    
    if (formData.bin.length !== 12) {
      toast.error('БИН должен содержать 12 цифр');
      return;
    }
    
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      toast.error('Введите корректный email');
      return;
    }

    try {
      setLoading(true);
      
      const newOrganization = await organizationService.create({
        name: formData.name,
        bin: formData.bin,
        address: formData.address || undefined,
        contactPhone: formData.contactPhone || undefined,
        contactEmail: formData.contactEmail || undefined,
      });
      
      toast.success('Организация успешно создана');
      router.push(`/admin/organizations/${newOrganization.id}`);
    } catch (error: unknown) {
      console.error('Error creating organization:', error);
      
      // Проверяем тип ошибки
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        if (apiError.response?.data?.error) {
          toast.error(apiError.response.data.error);
        } else {
          toast.error('Ошибка при создании организации');
        }
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Ошибка при создании организации');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Header role='admin'/>
      {/* Заголовок */}
      {/* <div className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>Новая организация</h1>
            <p className={styles.subtitle}>Создание новой организации-участника</p>
          </div>
          <Link href="/admin/organizations" className={styles.backButton}>
            <i className="ri-arrow-left-line"></i>
            <span>Назад к списку</span>
          </Link>
        </div>
      </div> */}

      {/* Форма */}
      <div className={styles.main}>
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Название организации */}
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>
                Название организации <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={styles.input}
                placeholder="Введите название организации"
                disabled={loading}
                required
              />
            </div>

            {/* БИН */}
            <div className={styles.formGroup}>
              <label htmlFor="bin" className={styles.label}>
                БИН <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="bin"
                name="bin"
                value={formData.bin}
                onChange={handleChange}
                className={styles.input}
                placeholder="Введите БИН"
                maxLength={12}
                disabled={loading}
                required
              />
              <p className={styles.help}>12 цифр</p>
            </div>

            {/* Адрес */}
            <div className={styles.formGroup}>
              <label htmlFor="address" className={styles.label}>
                Адрес
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="Введите адрес"
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Контактный телефон */}
            <div className={styles.formGroup}>
              <label htmlFor="contactPhone" className={styles.label}>
                Контактный телефон
              </label>
              <input
                type="tel"
                id="contactPhone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                className={styles.input}
                placeholder="+7 (7172) 123-456"
                disabled={loading}
              />
            </div>

            {/* Контактный email */}
            <div className={styles.formGroup}>
              <label htmlFor="contactEmail" className={styles.label}>
                Контактный email
              </label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                className={styles.input}
                placeholder="info@empire.kz"
                disabled={loading}
              />
            </div>

            {/* Кнопки */}
            <div className={styles.formActions}>
              <Link
                href="/admin/organizations"
                className={styles.cancelButton}
              >
                Отмена
              </Link>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="ri-loader-4-line ri-spin"></i>
                    <span>Создание...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-check-line"></i>
                    <span>Создать организацию</span>
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