"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import contractService from '@/services/contract.service';
import organizationService from '@/services/organization.service';
import { Contract, Organization, ApiError } from '@/types';
import { formatDate } from '@/utils/format';
import styles from './page.module.css';
import Header from '@/components/Header/Header';
import { Autocomplete, TextField } from '@mui/material';

export default function ContractsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    terminated: 0,
    standard: 0,
    vip: 0,
    temporary: 0,
  });

  // Проверка роли
  useEffect(() => {
    if (user && user.roleId !== 1) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  // Загрузка данных
  useEffect(() => {
    if (user && user.roleId === 1) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [contractsData, orgsData] = await Promise.all([
        contractService.getAll(),
        organizationService.getAll(),
      ]);
      
      setContracts(contractsData);
      setOrganizations(orgsData);
      
      // Подсчет статистики
      const newStats = {
        total: contractsData?.length,
        active: contractsData?.filter(c => c.status === 'active').length,
        expired: contractsData?.filter(c => c.status === 'expired').length,
        terminated: contractsData?.filter(c => c.status === 'terminated').length,
        standard: contractsData?.filter(c => c.contractType === 'standard').length,
        vip: contractsData?.filter(c => c.contractType === 'vip').length,
        temporary: contractsData?.filter(c => c.contractType === 'temporary').length,
      };
      setStats(newStats);
      
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Ошибка при загрузке договоров');
    } finally {
      setLoading(false);
    }
  };

const copyToClipboard = async (text: string, label: string = 'Текст') => {
  try {
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
    toast.success(`${label} скопирован в буфер обмена`);
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    toast.error('Ошибка при копировании');
  }
};

  const handleDelete = async (id: string, contractNumber: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить договор "${contractNumber}"?`)) {
      try {
        await contractService.delete(id);
        toast.success('Договор удален');
        fetchData();
      } catch (error: unknown) {
        console.error('Error deleting contract:', error);
        if (error && typeof error === 'object' && 'response' in error) {
          const apiError = error as ApiError;
          toast.error(apiError.response?.data?.error || 'Ошибка при удалении');
        } else {
          toast.error('Ошибка при удалении');
        }
      }
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setOrgFilter('all');
  };

  const getOrganizationName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    return org?.name || 'Неизвестная организация';
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return { text: 'Активен', color: 'green' };
      case 'expired':
        return { text: 'Истек', color: 'red' };
      case 'terminated':
        return { text: 'Расторгнут', color: 'gray' };
      default:
        return { text: status, color: 'gray' };
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'standard':
        return { text: 'Стандартный', color: '#2563eb' };
      case 'vip':
        return { text: 'VIP', color: '#8b5cf6' };
      case 'temporary':
        return { text: 'Временный', color: '#f59e0b' };
      default:
        return { text: type, color: '#6b7280' };
    }
  };

  const filteredContracts = contracts?.filter(contract => {
    // Поиск по номеру договора или названию организации
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const orgName = getOrganizationName(contract.organizationId).toLowerCase();
      const matchesSearch = 
        contract.contractNumber.toLowerCase().includes(term) ||
        orgName.includes(term);
      
      if (!matchesSearch) return false;
    }
    
    // Фильтр по статусу
    if (statusFilter !== 'all' && contract.status !== statusFilter) return false;
    
    // Фильтр по типу
    if (typeFilter !== 'all' && contract.contractType !== typeFilter) return false;
    
    // Фильтр по организации
    if (orgFilter !== 'all' && contract.organizationId !== orgFilter) return false;
    
    return true;
  });

  // Находим выбранную организацию для Autocomplete
  const selectedOrg = orgFilter !== 'all' 
    ? organizations.find(org => org.id === orgFilter) || null
    : null;

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка договоров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header role='admin'/>

      <main className={styles.main}>
        {/* Верхняя панель с заголовком и кнопкой создания */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderLeft}>
            <h2 className={styles.pageTitle}>Управление договорами</h2>
            <p className={styles.pageSubtitle}>
              Всего договоров: <span className={styles.contractCount}>{stats.total}</span>
            </p>
          </div>
          <Link href="/admin/contracts/new" className={styles.createButton}>
            <i className="ri-add-line"></i>
            <span>Создать договор</span>
          </Link>
        </div>

        {/* Статистика */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
              <i className="ri-file-copy-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Всего договоров</p>
              <p className={styles.statValue}>{stats.total}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
              <i className="ri-checkbox-circle-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Активных</p>
              <p className={styles.statValue}>{stats.active}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <i className="ri-close-circle-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Истекших</p>
              <p className={styles.statValue}>{stats.expired}</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
              <i className="ri-forbid-line"></i>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Расторгнутых</p>
              <p className={styles.statValue}>{stats.terminated}</p>
            </div>
          </div>
        </div>

        {/* Фильтры */}
        <div className={styles.filtersSection}>
          <h3 className={styles.filtersTitle}>
            <i className="ri-filter-3-line"></i>
            Фильтры
          </h3>
          
          <div className={styles.filtersGrid}>
            <div className={styles.searchBox}>
              <i className={`ri-search-line ${styles.searchIcon}`}></i>
              <input
                type="text"
                placeholder="Поиск по номеру договора или организации..."
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

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.select}
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="expired">Истекшие</option>
              <option value="terminated">Расторгнутые</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={styles.select}
            >
              <option value="all">Все типы</option>
              <option value="standard">Стандартные</option>
              <option value="vip">VIP</option>
              <option value="temporary">Временные</option>
            </select>

            <Autocomplete
              value={selectedOrg}
              onChange={(event, newValue) => {
                setOrgFilter(newValue ? newValue.id : 'all');
              }}
              options={organizations || []}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Поиск организации..."
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#fff',
                      '& fieldset': {
                        borderColor: '#e5e7eb',
                      },
                      '&:hover fieldset': {
                        borderColor: '#d1d5db',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#4f46e5',
                      },
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '0.875rem',
                      padding: '0.5rem 0.875rem',
                    },
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.875rem' }}>{option.name}</span>
                    {option.bin && (
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        БИН: {option.bin}
                      </span>
                    )}
                  </div>
                </li>
              )}
              noOptionsText="Организации не найдены"
              loadingText="Загрузка..."
              sx={{
                minWidth: '250px',
                '& .MuiAutocomplete-inputRoot': {
                  padding: '0 !important',
                },
              }}
            />
          </div>

          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || orgFilter !== 'all') && (
            <div className={styles.filtersActions}>
              <button
                onClick={handleClearFilters}
                className={styles.clearFiltersButton}
              >
                <i className="ri-close-line"></i>
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>

        {/* Таблица договоров */}
        <div className={styles.tableContainer}>
          {filteredContracts?.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Номер договора</th>
                  <th>Организация</th>
                  <th>Тип</th>
                  <th>Дата договора</th>
                  <th>Срок действия</th>
                  <th>Статус</th>
                  <th>Дата создания</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract) => {
                  const status = getStatusInfo(contract.status);
                  const type = getTypeInfo(contract.contractType);
                  
                  return (
                    <tr key={contract.id}>
                      <td>
                        <div className={styles.contractNumberCell}>
                          <span className={styles.contractNumber}>{contract.contractNumber}</span>
                          <button
                            onClick={() => copyToClipboard(contract.contractNumber, 'Номер договора')}
                            className={styles.copyButton}
                            title="Копировать номер договора"
                          >
                            <i className="ri-file-copy-line"></i>
                          </button>
                        </div>
                      </td>
                      <td>
                        <Link 
                          href={`/admin/organizations/${contract.organizationId}`}
                          className={styles.organizationLink}
                        >
                          <i className="ri-building-4-line"></i>
                          {getOrganizationName(contract.organizationId)}
                        </Link>
                      </td>
                      <td>
                        <span 
                          className={styles.typeBadge}
                          style={{ 
                            backgroundColor: `${type.color}20`, 
                            color: type.color,
                            borderColor: type.color
                          }}
                        >
                          {type.text}
                        </span>
                      </td>
                      <td>{formatDate(contract.contractDate)}</td>
                      <td>
                        {contract.validUntil 
                          ? `${formatDate(contract.validFrom)} - ${formatDate(contract.validUntil)}`
                          : `с ${formatDate(contract.validFrom)} (бессрочно)`}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`status${status.color}`]}`}>
                          {status.text}
                        </span>
                      </td>
                      <td>{formatDate(contract.createdAt)}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <Link
                            href={`/admin/contracts/${contract.id}`}
                            className={`${styles.actionButton} ${styles.viewButton}`}
                            title="Просмотр"
                          >
                            <i className="ri-eye-line"></i>
                          </Link>
                          <Link
                            href={`/admin/contracts/${contract.id}/edit`}
                            className={`${styles.actionButton} ${styles.editButton}`}
                            title="Редактировать"
                          >
                            <i className="ri-pencil-line"></i>
                          </Link>
                          <button
                            onClick={() => handleDelete(contract.id, contract.contractNumber)}
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            title="Удалить"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <i className="ri-file-copy-line"></i>
              <h3 className={styles.emptyStateTitle}>Договоры не найдены</h3>
              <p className={styles.emptyStateText}>
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || orgFilter !== 'all'
                  ? 'Попробуйте изменить параметры фильтрации'
                  : 'В системе пока нет договоров'}
              </p>
              {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || orgFilter !== 'all') && (
                <button
                  onClick={handleClearFilters}
                  className={styles.clearFiltersButton}
                >
                  <i className="ri-close-line"></i>
                  Сбросить фильтры
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}