"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import contractService from '@/services/contract.service';
import organizationService from '@/services/organization.service';
import { Organization, ApiError } from '@/types';
import styles from './page.module.css';
import Header from '@/components/Header/Header';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

export default function NewContractPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [touched, setTouched] = useState(false);
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

  // Функция генерации случайного номера договора
  const generateContractNumber = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const specials = '!@#$%&*';
    
    // Базовая длина 8 символов
    let contractNumber = '';
    
    // Добавляем 5-6 случайных строчных букв
    const lowercaseCount = Math.floor(Math.random() * 2) + 5; // 5 или 6
    for (let i = 0; i < lowercaseCount; i++) {
      contractNumber += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    }
    
    // Добавляем 2 цифры
    for (let i = 0; i < 2; i++) {
      contractNumber += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    
    // Добавляем одну заглавную букву
    contractNumber += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    
    // Добавляем один спецсимвол
    contractNumber += specials.charAt(Math.floor(Math.random() * specials.length));
    
    // Перемешиваем все символы случайным образом
    contractNumber = contractNumber.split('').sort(() => Math.random() - 0.5).join('');
    
    setFormData(prev => ({ ...prev, contractNumber }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOrganizationChange = (_event: React.SyntheticEvent, newValue: Organization | null) => {
    setSelectedOrg(newValue);
    setFormData(prev => ({
      ...prev,
      organizationId: newValue ? newValue.id : ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    
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
    <ThemeProvider theme={theme}>
      <div className={styles.container}>
        <Header role='admin'/>
        
        {/* Форма */}
        <div className={styles.main}>
          <div className={styles.formCard}>
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Номер договора */}
              <div className={styles.formGroup}>
                <label htmlFor="contractNumber" className={styles.label}>
                  Номер договора <span className={styles.required}>*</span>
                </label>
                <div className={styles.inputWithButton}>
                  <input
                    type="text"
                    id="contractNumber"
                    name="contractNumber"
                    value={formData.contractNumber}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="введите или сгенерируйте Номер договора"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={generateContractNumber}
                    className={styles.generateButton}
                    disabled={loading}
                    title="Сгенерировать номер договора"
                  >
                    <i className="ri-refresh-line"></i>
                    <span>Сгенерировать</span>
                  </button>
                </div>
              </div>

              {/* Организация */}
              <div className={styles.formGroup}>
                <label htmlFor="organizationId" className={styles.label}>
                  Организация <span className={styles.required}>*</span>
                </label>
                <Autocomplete
                  id="organizationId"
                  options={organizations}
                  getOptionLabel={(option: Organization) => `${option.name} (${option.bin})`}
                  value={selectedOrg}
                  onChange={handleOrganizationChange}
                  disabled={loading || organizations?.length === 0}
                  isOptionEqualToValue={(option: Organization, value: Organization) => option.id === value.id}
                  noOptionsText="Организации не найдены"
                  loadingText="Загрузка..."
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Выберите организацию"
                      variant="outlined"
                      size="small"
                      error={touched && !formData.organizationId}
                      helperText={touched && !formData.organizationId ? 'Выберите организацию' : ''}
                    />
                  )}
                  renderOption={(props, option: Organization) => (
                    <li {...props} key={option.id}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{option.name}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>БИН: {option.bin}</div>
                      </div>
                    </li>
                  )}
                />
                {organizations?.length === 0 && (
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
                  disabled={loading || organizations?.length === 0}
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
    </ThemeProvider>
  );
}