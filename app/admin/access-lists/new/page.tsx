"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import accessListService from '@/services/access-list.service';
import { ApiError } from '@/types';
import styles from './page.module.css';

export default function NewAccessListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6', // синий по умолчанию
    priority: '1',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.name.trim()) {
      toast.error('Введите название списка');
      return;
    }
    
    if (formData.name.length < 3) {
      toast.error('Название должно содержать минимум 3 символа');
      return;
    }

    try {
      setLoading(true);
      
      // Отправляем данные без listType
      const newList = await accessListService.create({
        name: formData.name,
        description: formData.description || undefined,
        color: formData.color || undefined,
        priority: parseInt(formData.priority) || 0,
        // listType не отправляем
      });
      
      toast.success('Список доступа успешно создан');
      router.push(`/admin/access-lists/${newList.id}`);
    } catch (error: unknown) {
      console.error('Error creating access list:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        if (apiError.response?.data?.error) {
          toast.error(apiError.response.data.error);
        } else {
          toast.error('Ошибка при создании списка');
        }
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Ошибка при создании списка');
      }
    } finally {
      setLoading(false);
    }
  };

  // Предустановленные цвета
  const presetColors = [
    { value: '#3b82f6', label: 'Синий', icon: 'ri-admin-line' },
    { value: '#10b981', label: 'Зеленый', icon: 'ri-user-line' },
    { value: '#f59e0b', label: 'Оранжевый', icon: 'ri-user-star-line' },
    { value: '#ef4444', label: 'Красный', icon: 'ri-shield-user-line' },
    { value: '#8b5cf6', label: 'Фиолетовый', icon: 'ri-vip-crown-line' },
    { value: '#ec4899', label: 'Розовый', icon: 'ri-heart-line' },
  ];

  return (
    <div className={styles.container}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>Новый список доступа</h1>
            <p className={styles.subtitle}>Создание нового списка для пропусков</p>
          </div>
          <Link href="/admin/access-lists" className={styles.backButton}>
            <i className="ri-arrow-left-line"></i>
            <span>Назад к списку</span>
          </Link>
        </div>
      </div>

      {/* Форма */}
      <div className={styles.main}>
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Название списка */}
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>
                Название списка <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={styles.input}
                placeholder="Введите название списка"
                disabled={loading}
                required
              />
              <p className={styles.help}>Уникальное название списка доступа</p>
            </div>

            {/* Описание */}
            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.label}>
                Описание
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="Краткое описание списка и его назначения"
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Цвет */}
            <div className={styles.formGroup}>
              <label htmlFor="color" className={styles.label}>
                Цвет
              </label>
              
              {/* Предустановленные цвета */}
              <div className={styles.presetColors}>
                {presetColors.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`${styles.presetColor} ${formData.color === preset.value ? styles.presetColorActive : ''}`}
                    style={{ backgroundColor: preset.value }}
                    onClick={() => setFormData(prev => ({ ...prev, color: preset.value }))}
                    title={preset.label}
                    disabled={loading}
                  >
                    <i className={preset.icon}></i>
                  </button>
                ))}
              </div>

              {/* Ручной ввод цвета */}
              <div className={styles.colorInput}>
                <input
                  type="color"
                  id="color"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className={styles.colorPicker}
                  disabled={loading}
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={handleChange}
                  name="color"
                  className={styles.colorValue}
                  placeholder="#000000"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  disabled={loading}
                />
              </div>
              <p className={styles.help}>Цвет для визуального отображения в интерфейсе</p>
            </div>

            {/* Предпросмотр */}
            <div className={styles.previewBox} style={{ backgroundColor: `${formData.color}15` }}>
              <div className={styles.previewIcon} style={{ color: formData.color }}>
                <i className="ri-list-check-3"></i>
              </div>
              <div className={styles.previewContent}>
                <p className={styles.previewTitle} style={{ color: formData.color }}>
                  {formData.name || 'Название списка'}
                </p>
                <p className={styles.previewDescription}>
                  {formData.description || 'Описание списка'}
                </p>
                <div className={styles.previewBadge} style={{ backgroundColor: formData.color }}>
                  Приоритет: {formData.priority}
                </div>
              </div>
            </div>

            {/* Приоритет */}
            <div className={styles.formGroup}>
              <label htmlFor="priority" className={styles.label}>
                Приоритет
              </label>
              <input
                type="number"
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={styles.input}
                placeholder="1"
                min="0"
                max="999"
                disabled={loading}
              />
              <p className={styles.help}>
                Меньше значение = выше приоритет (0 - наивысший)
              </p>
            </div>

            {/* Кнопки */}
            <div className={styles.formActions}>
              <Link
                href="/admin/access-lists"
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
                    <i className="ri-list-check-3"></i>
                    <span>Создать список</span>
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