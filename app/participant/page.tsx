"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import applicationService from '@/services/application.service';
import userService from '@/services/user.service';
import { AccessList, Application, ApiError } from '@/types';
import { formatDate, getStatusBadge } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

export default function ParticipantPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [smartParking, setSmartParking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableLists, setAvailableLists] = useState<AccessList[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showContractNumber, setShowContractNumber] = useState(true);

  const getMaxDate = () => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-12-31`;
  };

  const getDefaultValidUntil = () => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-12-31`;
  };

  const [formData, setFormData] = useState({
    contractNumber: '',
    plateNumber: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleColor: '',
    listId: '',
    validFrom: '',
    validUntil: getDefaultValidUntil(),
    notes: '',
  });

  useEffect(() => {
    if (user && user.roleId !== 4) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  useEffect(() => {
    if (user && user.roleId === 4 && !dataLoaded) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dataLoaded]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const lists = await userService.getAvailableLists();
      setAvailableLists(lists || []);
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
    if (name === 'plateNumber') {
      const cleaned = value.replace(/\s/g, '').toUpperCase();
      const latinAndNumbers = cleaned.replace(/[^A-Z0-9]/g, '');
      setFormData(prev => ({ ...prev, [name]: latinAndNumbers }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validatePlateNumber = (plateNumber: string): boolean => {
    if (!plateNumber.trim()) {
      toast.error('Введите государственный номер машины');
      return false;
    }
    if (plateNumber.includes(' ')) {
      toast.error('Номер не должен содержать пробелы');
      return false;
    }
    if (!/^[A-Z0-9]+$/.test(plateNumber)) {
      toast.error('Используйте только заглавные латинские буквы и цифры');
      return false;
    }
    if (plateNumber.length < 4) {
      toast.error('Номер слишком короткий');
      return false;
    }
    if (plateNumber.length > 10) {
      toast.error('Номер слишком длинный');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contractNumber.trim()) {
      toast.error('Введите номер договора');
      return;
    }
    if (!validatePlateNumber(formData.plateNumber)) {
      return;
    }
    if (!formData.listId) {
      toast.error('Выберите список для подачи заявки');
      return;
    }

    try {
      setSubmitting(true);
      const validUntil = formData.validUntil || getDefaultValidUntil();
      
      await applicationService.create({
        contractNumber: formData.contractNumber.trim(),
        plateNumber: formData.plateNumber.toUpperCase().trim(),
        listId: formData.listId,
        vehicleBrand: formData.vehicleBrand.trim() || undefined,
        vehicleModel: formData.vehicleModel.trim() || undefined,
        vehicleColor: formData.vehicleColor.trim() || undefined,
        validFrom: formData.validFrom || undefined,
        validUntil: validUntil,
        notes: formData.notes.trim() || undefined,
        smartParking: smartParking,
      });
      
      toast.success(smartParking ? 'Заявки на КПП 1 и Parkomat успешно отправлены' : 'Заявка успешно отправлена');
      
      setFormData({
        contractNumber: '',
        plateNumber: '',
        vehicleBrand: '',
        vehicleModel: '',
        vehicleColor: '',
        listId: '',
        validFrom: '',
        validUntil: getDefaultValidUntil(),
        notes: '',
      });
      setSmartParking(false);
      
      const updatedApplications = await applicationService.getMyApplications();
      setApplications(updatedApplications);
    } catch (error: unknown) {
      console.error('Error creating application:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        toast.error(apiError.response?.data?.error || 'Ошибка при создании заявки');
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Ошибка при создании заявки');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getDestinationBadge = (destination: string) => {
    switch (destination) {
      case 'kpp1': return { text: 'КПП 1', color: 'blue' };
      case 'smartparking': return { text: 'SmartParking', color: 'green' };
      default: return { text: destination, color: 'gray' };
    }
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
      <Header role={"participant"}/>
      <main className={styles.main}>
        <div className={styles.grid}>
          <div className={styles.formSection}>
            <div className={styles.formCard}>
              <h2 className={styles.sectionTitle}>
                <i className="ri-file-add-line"></i>
                Подать заявку на пропуск
              </h2>
              
              <div className={styles.smartSwitch}>
                <FormControl>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={smartParking} sx={{color:"white"}} onChange={()=>{setSmartParking(!smartParking)}} name="smartparking" />}
                      label="Parkomat"
                    />
                  </FormGroup>
                  {smartParking &&
                    <FormHelperText sx={{color:"white"}}>
                      Также будет создана отдельная заявка для Parkomat. 
                      После одобрения оператором номер автоматически попадёт в систему Parkomat.
                    </FormHelperText>
                  }
                </FormControl>
              </div>
              
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="contractNumber" className={styles.label}>
                    Номер договора <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.passwordInputWrapper}>
                    <input type={showContractNumber ? "text" : "password"} id="contractNumber" name="contractNumber" value={formData.contractNumber} onChange={handleChange} className={styles.input} placeholder="ДОГ-2024-001" disabled={submitting} required />
                    <button type="button" onClick={() => setShowContractNumber(!showContractNumber)} className={styles.passwordToggle} tabIndex={-1} title={showContractNumber ? "Скрыть" : "Показать"}>
                      <i className={`ri-${showContractNumber ? 'eye-off' : 'eye'}-line`}></i>
                    </button>
                  </div>
                  <p className={styles.help}>Введите номер договора из вашего соглашения</p>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="plateNumber" className={styles.label}>
                    Гос. номер машины <span className={styles.required}>*</span>
                  </label>
                  <input type="text" id="plateNumber" name="plateNumber" value={formData.plateNumber} onChange={handleChange} className={styles.input} placeholder="123ABC01" maxLength={10} disabled={submitting} required
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '1px', fontSize: '1.1em' }}
                    autoComplete="off"
                    onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                  />
                  <p className={styles.help}>Формат: латинские буквы и цифры без пробелов</p>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="listId" className={styles.label}>
                    Выберите список <span className={styles.required}>*</span>
                  </label>
                  <select id="listId" name="listId" value={formData.listId} onChange={handleChange} className={styles.select} disabled={submitting || !availableLists || availableLists.length === 0} required>
                    <option value="">Выберите список</option>
                    {availableLists && availableLists.map((list) => (
                      <option key={list.id} value={list.id}>{list.name} {list.description && `- ${list.description}`}</option>
                    ))}
                  </select>
                  {(!availableLists || availableLists.length === 0) && (
                    <p className={styles.error}>У вас нет доступных списков для подачи заявок. Обратитесь к администратору.</p>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="vehicleBrand" className={styles.label}>Марка автомобиля</label>
                  <input type="text" id="vehicleBrand" name="vehicleBrand" value={formData.vehicleBrand} onChange={handleChange} className={styles.input} placeholder="Toyota" disabled={submitting} />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="vehicleModel" className={styles.label}>Модель автомобиля</label>
                  <input type="text" id="vehicleModel" name="vehicleModel" value={formData.vehicleModel} onChange={handleChange} className={styles.input} placeholder="Camry" disabled={submitting} />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="vehicleColor" className={styles.label}>Цвет автомобиля</label>
                  <input type="text" id="vehicleColor" name="vehicleColor" value={formData.vehicleColor} onChange={handleChange} className={styles.input} placeholder="Белый" disabled={submitting} />
                </div>

                <div className={styles.row}>
                  <div className={styles.formGroup}>
                    <label htmlFor="validUntil" className={styles.label}>Действует до</label>
                    <input type="date" id="validUntil" name="validUntil" value={formData.validUntil} onChange={handleChange} className={styles.input} disabled={submitting} min={new Date().toISOString().split('T')[0]} max={getMaxDate()} />
                    <p className={styles.help}>По умолчанию — до конца года.</p>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="notes" className={styles.label}>Примечания</label>
                  <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} className={styles.textarea} placeholder="Дополнительная информация" rows={3} disabled={submitting} />
                </div>

                <button type="submit" className={styles.submitButton} disabled={submitting || !availableLists || availableLists.length === 0}>
                  {submitting ? (
                    <><i className="ri-loader-4-line ri-spin"></i><span>Отправка...</span></>
                  ) : (
                    <><i className="ri-send-plane-line"></i><span>{smartParking ? 'Отправить заявки' : 'Отправить заявку'}</span></>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className={styles.historySection}>
            <div className={styles.historyCard}>
              <h2 className={styles.sectionTitle}><i className="ri-history-line"></i>История заявок</h2>
              {applications && applications?.length > 0 ? (
                <div className={styles.applicationsList}>
                  {applications.filter(app => app.destination !== "smartparking").map((app) => {
                    const status = getStatusBadge(app.status);
                    const destination = getDestinationBadge(app.destination);
                    return (
                      <div key={app.id} className={styles.applicationItem}>
                        <div className={styles.applicationHeader}>
                          <div className={styles.plateRow}>
                            <span className={styles.plateNumber}>{app.plateNumber}</span>
                            <span className={styles.destinationBadge} style={{ backgroundColor: destination.color === 'blue' ? '#dbeafe' : '#d1fae5', color: destination.color === 'blue' ? '#2563eb' : '#059669' }}>{destination.text}</span>
                          </div>
                          <span className={`${styles.statusBadge} ${styles[`status${status.color}`]}`}>{status.text}</span>
                        </div>
                        <div className={styles.applicationDetails}>
                          {app.listName && <div className={styles.detailItem}><i className="ri-list-check-3"></i><span>{app.listName}</span></div>}
                          {app.vehicleBrand && app.vehicleModel && <div className={styles.detailItem}><i className="ri-car-line"></i><span>{app.vehicleBrand} {app.vehicleModel}</span></div>}
                          <div className={styles.detailItem}><i className="ri-calendar-line"></i><span>{formatDate(app.createdAt)}</span></div>
                          {app.validUntil && <div className={styles.detailItem}><i className="ri-hourglass-line"></i><span>До {formatDate(app.validUntil)}</span></div>}
                        </div>
                        {app.rejectReason && app.status === 'rejected' && (
                          <div className={styles.rejectReason}><i className="ri-error-warning-line"></i><span>{app.rejectReason}</span></div>
                        )}
                        {app.status === 'pending' && (
                          <button
                            onClick={async () => {
                              if (window.confirm('Удалить эту заявку?')) {
                                try {
                                  await applicationService.deleteMyApplication(app.id);
                                  toast.success('Заявка удалена');
                                  const updated = await applicationService.getMyApplications();
                                  setApplications(updated);
                                } catch { toast.error('Ошибка при удалении заявки'); }
                              }
                            }}
                            className={styles.deleteAppButton}
                            title="Удалить заявку"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyHistory}><i className="ri-inbox-line"></i><p>У вас пока нет заявок</p></div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}