"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import applicationService from '@/services/application.service';
import userService from '@/services/user.service';
import { AccessList, Application, ApiError } from '@/types';
import { formatDate, getStatusBadge } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

export default function ParticipantPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableLists, setAvailableLists] = useState<AccessList[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [formData, setFormData] = useState({
    contractNumber: '',
    plateNumber: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleColor: '',
    listId: '',
    validFrom: '',
    validUntil: '',
    notes: '',
  });

  // Проверка роли
  useEffect(() => {
    if (user && user.roleId !== 4) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  // Загрузка данных только один раз
  useEffect(() => {
    if (user && user.roleId === 4 && !dataLoaded) {
      fetchData();
    }
  }, [user, dataLoaded]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('Fetching available lists for participant...');
      
      // Загружаем доступные списки для участника
      const lists = await userService.getAvailableLists();
      console.log('Available lists:', lists);
      
      setAvailableLists(lists || []);
      
      // Загружаем заявки участника
      const myApplications = await applicationService.getMyApplications();
      setApplications(myApplications || []);
      
      setDataLoaded(true);
      
      if (!lists || lists.length === 0) {
        toast.error('У вас нет доступных списков для подачи заявок. Обратитесь к администратору.');
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Ошибка при загрузке данных');
      setAvailableLists([]);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
  
  if (!formData.plateNumber.trim()) {
    toast.error('Введите государственный номер машины');
    return;
  }
  
  if (!formData.listId) {
    toast.error('Выберите список для подачи заявки');
    return;
  }

  try {
    setSubmitting(true);
    
    await applicationService.create({
      contractNumber: formData.contractNumber.trim(),
      plateNumber: formData.plateNumber.toUpperCase().trim(),
      listId: formData.listId,
      vehicleBrand: formData.vehicleBrand.trim() || undefined,
      vehicleModel: formData.vehicleModel.trim() || undefined,
      vehicleColor: formData.vehicleColor.trim() || undefined,
      validFrom: formData.validFrom || undefined,
      validUntil: formData.validUntil || undefined,
      notes: formData.notes.trim() || undefined,
    });
    
    toast.success('Заявка успешно отправлена');
    
    // Очищаем форму
    setFormData({
      contractNumber: '',
      plateNumber: '',
      vehicleBrand: '',
      vehicleModel: '',
      vehicleColor: '',
      listId: '',
      validFrom: '',
      validUntil: '',
      notes: '',
    });
    
    // Обновляем список заявок
    const updatedApplications = await applicationService.getMyApplications();
    setApplications(updatedApplications);
    
  } catch (error: unknown) {
    console.error('Error creating application:', error);
    
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as ApiError;
      if (apiError.response?.data?.error) {
        // Показываем конкретную ошибку от сервера
        toast.error(apiError.response.data.error);
      } else {
        toast.error('Ошибка при создании заявки');
      }
    } else if (error instanceof Error) {
      toast.error(error.message);
    } else {
      toast.error('Ошибка при создании заявки');
    }
  } finally {
    setSubmitting(false);
  }
};

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Верхняя панель */}
      {/* <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>Личный кабинет участника</h1>
            <p className={styles.subtitle}>
              Добро пожаловать, {user?.fullName || user?.username}
            </p>
            {user?.organizationName && (
              <p className={styles.organizationName}>
                <i className="ri-building-4-line"></i>
                {user.organizationName}
              </p>
            )}
          </div>
          <div className={styles.userInfo}>
  <Link href="/participant/lists" className={styles.viewListsLink}>
    <i className="ri-list-check-3"></i>
    <span>Мои номера</span>
  </Link>
  <span className={styles.roleBadge}>
    Участник
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
      <Header role={"participant"}/>
      <main className={styles.main}>
      
        <div className={styles.grid}>
          {/* Левая колонка - Форма подачи заявки */}
          <div className={styles.formSection}>
            <div className={styles.formCard}>
              <h2 className={styles.sectionTitle}>
                <i className="ri-file-add-line"></i>
                Подать заявку на пропуск
              </h2>
              
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
                    disabled={submitting}
                    required
                  />
                  <p className={styles.help}>Введите номер договора из вашего соглашения</p>
                </div>

                {/* Государственный номер */}
                <div className={styles.formGroup}>
                  <label htmlFor="plateNumber" className={styles.label}>
                    Гос. номер машины <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    id="plateNumber"
                    name="plateNumber"
                    value={formData.plateNumber}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="123ABC01"
                    maxLength={20}
                    disabled={submitting}
                    required
                  />
                  <p className={styles.help}>Пример: 123ABC01 или A123BC</p>
                </div>

                {/* Список для подачи */}
                <div className={styles.formGroup}>
                  <label htmlFor="listId" className={styles.label}>
                    Выберите список <span className={styles.required}>*</span>
                  </label>
                  <select
                    id="listId"
                    name="listId"
                    value={formData.listId}
                    onChange={handleChange}
                    className={styles.select}
                    disabled={submitting || !availableLists || availableLists.length === 0}
                    required
                  >
                    <option value="">Выберите список</option>
                    {availableLists && availableLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name} {list.description && `- ${list.description}`}
                      </option>
                    ))}
                  </select>
                  {(!availableLists || availableLists.length === 0) && (
                    <p className={styles.error}>
                      У вас нет доступных списков для подачи заявок. Обратитесь к администратору.
                    </p>
                  )}
                </div>

                {/* Марка авто */}
                <div className={styles.formGroup}>
                  <label htmlFor="vehicleBrand" className={styles.label}>
                    Марка автомобиля
                  </label>
                  <input
                    type="text"
                    id="vehicleBrand"
                    name="vehicleBrand"
                    value={formData.vehicleBrand}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Toyota"
                    disabled={submitting}
                  />
                </div>

                {/* Модель авто */}
                <div className={styles.formGroup}>
                  <label htmlFor="vehicleModel" className={styles.label}>
                    Модель автомобиля
                  </label>
                  <input
                    type="text"
                    id="vehicleModel"
                    name="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Camry"
                    disabled={submitting}
                  />
                </div>

                {/* Цвет авто */}
                <div className={styles.formGroup}>
                  <label htmlFor="vehicleColor" className={styles.label}>
                    Цвет автомобиля
                  </label>
                  <input
                    type="text"
                    id="vehicleColor"
                    name="vehicleColor"
                    value={formData.vehicleColor}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Белый"
                    disabled={submitting}
                  />
                </div>

                {/* Срок действия */}
                {/* <div className={styles.row}>
                  <div className={styles.formGroup}>
                    <label htmlFor="validFrom" className={styles.label}>
                      Действует с
                    </label>
                    <input
                      type="date"
                      id="validFrom"
                      name="validFrom"
                      value={formData.validFrom}
                      onChange={handleChange}
                      className={styles.input}
                      disabled={submitting}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

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
                      disabled={submitting}
                      min={formData.validFrom || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div> */}

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
                    placeholder="Дополнительная информация"
                    rows={3}
                    disabled={submitting}
                  />
                </div>

                {/* Кнопка отправки */}
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting || !availableLists || availableLists.length === 0}
                >
                  {submitting ? (
                    <>
                      <i className="ri-loader-4-line ri-spin"></i>
                      <span>Отправка...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-line"></i>
                      <span>Отправить заявку</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Правая колонка - История заявок */}
          <div className={styles.historySection}>
            <div className={styles.historyCard}>
              <h2 className={styles.sectionTitle}>
                <i className="ri-history-line"></i>
                История заявок
              </h2>

              {applications && applications?.length > 0 ? (
                <div className={styles.applicationsList}>
                  {applications.map((app) => {
                    const status = getStatusBadge(app.status);
                    return (
                      <div key={app.id} className={styles.applicationItem}>
                        <div className={styles.applicationHeader}>
                          <span className={styles.plateNumber}>{app.plateNumber}</span>
                          <span className={`${styles.statusBadge} ${styles[`status${status.color}`]}`}>
                            {status.text}
                          </span>
                        </div>
                        
                        <div className={styles.applicationDetails}>
                          {app.listName && (
                            <div className={styles.detailItem}>
                              <i className="ri-list-check-3"></i>
                              <span>{app.listName}</span>
                            </div>
                          )}
                          
                          {app.vehicleBrand && app.vehicleModel && (
                            <div className={styles.detailItem}>
                              <i className="ri-car-line"></i>
                              <span>{app.vehicleBrand} {app.vehicleModel}</span>
                            </div>
                          )}
                          
                          <div className={styles.detailItem}>
                            <i className="ri-calendar-line"></i>
                            <span>{formatDate(app.createdAt)}</span>
                          </div>
                          
                          {app.validUntil && (
                            <div className={styles.detailItem}>
                              <i className="ri-hourglass-line"></i>
                              <span>До {formatDate(app.validUntil)}</span>
                            </div>
                          )}
                        </div>

                        {app.rejectReason && app.status === 'rejected' && (
                          <div className={styles.rejectReason}>
                            <i className="ri-error-warning-line"></i>
                            <span>{app.rejectReason}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyHistory}>
                  <i className="ri-inbox-line"></i>
                  <p>У вас пока нет заявок</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}