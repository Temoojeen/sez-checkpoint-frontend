"use client";

import { useEffect, useState, useRef, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import styles from './page.module.css';
import WebRTCPlayer from '@/components/WebRTCPlayer/WebRTCPlayer';
import Cookies from 'js-cookie';
import Header from '@/components/Header/Header';
import StatsButton from '@/components/statsSidebar/StatsButton';

interface AccessLog {
  id: string;
  plateNumber: string;
  organizationName?: string;
  listName?: string;
  listType?: string;
  listColor?: string;
  timestamp: Date;
  status: 'granted' | 'denied' | 'unknown';
  isActive?: boolean;
  message?: string;
}

interface WebSocketMessage {
  type: string;
  plateNumber: string;
  accessGranted: boolean;
  organizationName?: string;
  listName?: string;
  listColor?: string;
  message?: string;
  timestamp: string;
}

interface ApiLog {
  id: string;
  plateNumber: string;
  organizationName?: string;
  listName?: string;
  listColor?: string;
  createdAt: string;
  accessGranted: boolean;
  message?: string;
}

interface StatisticsResponse {
  statistics?: {
    total?: number;
    granted?: number;
    denied?: number;
  };
}

interface CheckPlateResponse {
  exists: boolean;
  plateNumber?: string;
  organizationName?: string;
  listName?: string;
  listType?: string;
  listColor?: string;
  validUntil?: string;
  isActive?: boolean;
  message?: string;
}

interface SearchSuggestion {
  plateNumber: string;
  organizationName?: string;
  listName?: string;
  listColor?: string;
  isActive?: boolean;
}

export default function SecurityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showOverlay, setShowOverlay] = useState(false);
  const [recentLogs, setRecentLogs] = useState<AccessLog[]>([]);
  const [overlayMessage, setOverlayMessage] = useState({
    title: "",
    listColor: "#10b981",
    listName: "",
    plateNumber: "",
    organizationName: "",
    isActive: true,
  });
  const [stats, setStats] = useState({
    today: 0,
    granted: 0,
    denied: 0,
    unknown: 0,
  });
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [wsConnected, setWsConnected] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Состояния для ручного поиска номера
  const [searchPlate, setSearchPlate] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<CheckPlateResponse | null>(null);
  const [showSearchResult, setShowSearchResult] = useState(false);

  // Состояния для автодополнения
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const logIdCounterRef = useRef<number>(0);
  const isInitializedRef = useRef(false);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);

// Функция поиска похожих номеров
const searchSimilarPlates = async (query: string) => {
  if (query.length < 3) {
    setSuggestions([]);
    setShowSuggestions(false);
    return;
  }

  try {
    const token = Cookies.get('token');
    if (!token) return;

    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://10.24.32.31/api';

    const response = await fetch(`${baseURL}/security/search-plates?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data: SearchSuggestion[] = await response.json();
      // Проверяем что data существует и является массивом
      if (data && Array.isArray(data)) {
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
        
        // Если похожих номеров нет - показываем оверлей
        if (data.length === 0) {
          setOverlayMessage({
            title: "Похожих номеров не найдено",
            listColor: '#ef4444',
            listName: '',
            plateNumber: query,
            organizationName: '',
            isActive: false,
          });
          setShowOverlay(true);
          setTimeout(() => setShowOverlay(false), 3000);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        
        // Показываем оверлей что ничего не найдено
        setOverlayMessage({
          title: "Похожих номеров не найдено",
          listColor: '#ef4444',
          listName: '',
          plateNumber: query,
          organizationName: '',
          isActive: false,
        });
        setShowOverlay(true);
        setTimeout(() => setShowOverlay(false), 3000);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  } catch (error) {
    console.error('Error searching plates:', error);
    setSuggestions([]);
    setShowSuggestions(false);
  }
};

  // Функция для ручной проверки номера
  const handleManualCheck = async (plateNumber: string) => {
    if (!plateNumber.trim()) {
      setSearchResult(null);
      setShowSearchResult(false);
      return;
    }

    try {
      setSearchLoading(true);
      const token = Cookies.get('token');
      if (!token) return;

      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://10.24.32.31/api';

      const response = await fetch(`${baseURL}/security/check-plate/${encodeURIComponent(plateNumber.trim().toUpperCase())}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: CheckPlateResponse = await response.json();
        setSearchResult(data);
        setShowSearchResult(true);

        // Показываем оверлей с результатом
        if (data.exists) {
          setOverlayMessage({
            title: data.isActive ? "Доступ разрешен" : "Номер неактивен",
            listColor: data.listColor || (data.exists ? '#10b981' : '#ef4444'),
            listName: data.listName || '',
            plateNumber: plateNumber.trim().toUpperCase(),
            organizationName: data.organizationName || '',
            isActive: data.isActive || false,
          });
          setShowOverlay(true);
          setTimeout(() => setShowOverlay(false), 4000);
        } else {
          setOverlayMessage({
            title: "Номер не найден",
            listColor: '#ef4444',
            listName: '',
            plateNumber: plateNumber.trim().toUpperCase(),
            organizationName: '',
            isActive: false,
          });
          setShowOverlay(true);
          setTimeout(() => setShowOverlay(false), 3000);
        }

      } else {
        toast.error('Ошибка при проверке номера');
      }
    } catch (error) {
      console.error('Error checking plate:', error);
      toast.error('Ошибка при проверке номера');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setSearchPlate(value);
    setSearchResult(null);
    setShowSearchResult(false);
    setSelectedIndex(-1);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        searchSimilarPlates(value);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    setSearchPlate(suggestion.plateNumber);
    setSuggestions([]);
    setShowSuggestions(false);
    handleManualCheck(suggestion.plateNumber);
  };

const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (!showSuggestions || suggestions.length === 0) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setSelectedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
      break;
    case 'ArrowUp':
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
      break;
    case 'Enter':
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else {
        // Создаем синтетическое событие формы
        const form = e.currentTarget.closest('form');
        if (form) {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        }
      }
      break;
    case 'Escape':
      setShowSuggestions(false);
      setSuggestions([]);
      break;
  }
};

const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (searchPlate.trim()) {
    handleManualCheck(searchPlate);
    setSuggestions([]);
    setShowSuggestions(false);
  }
};


  // Закрытие выпадающего списка при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Функции загрузки данных
  const loadRecentLogs = useCallback(async () => {
    try {
      const token = Cookies.get('token');
      if (!token) return;
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://10.24.32.31/api';

      const response = await fetch(baseURL + '/security/recent-logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const logs: ApiLog[] = await response.json();

        if (logs && Array.isArray(logs) && logs.length > 0) {
          const formattedLogs: AccessLog[] = logs.map((log: ApiLog) => ({
            id: log.id,
            plateNumber: log.plateNumber,
            organizationName: log.organizationName,
            listName: log.listName,
            listColor: log.listColor,
            timestamp: new Date(log.createdAt),
            status: log.accessGranted ? 'granted' : 'denied' as const,
            isActive: log.accessGranted,
            message: log.message,
          }));
          startTransition(() => {
            setRecentLogs(formattedLogs.slice(0, 5));
          });
        } else {
          startTransition(() => {
            setRecentLogs([]);
          });
        }
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      startTransition(() => {
        setRecentLogs([]);
      });
    }
  }, [startTransition]);

  const loadTodayStats = useCallback(async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://10.24.32.31/api';

      const response = await fetch(baseURL + '/security/statistics', {
        headers: {
          'Authorization': `Bearer ${Cookies.get('token')}`
        }
      });

      if (response.ok) {
        const data: StatisticsResponse = await response.json();
        startTransition(() => {
          setStats({
            today: data?.statistics?.total || 0,
            granted: data?.statistics?.granted || 0,
            denied: data?.statistics?.denied || 0,
            unknown: 0,
          });
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [startTransition]);

  const generateUniqueId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    logIdCounterRef.current += 1;
    return `${Date.now()}-${logIdCounterRef.current}`;
  };

  const getCurrentTimestamp = (): Date => {
    return new Date();
  };

  const playSound = useCallback((type: 'granted' | 'denied') => {
    try {
      const audio = new Audio();
      if (type === 'granted') {
        audio.src = '/sounds/access-granted.mp3';
      } else {
        audio.src = '/sounds/access-denied.mp3';
      }
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (error) {
      console.log('Sound not supported==>', error);
    }
  }, []);

  const handlePlateDetection = useCallback((data: WebSocketMessage) => {
    const { plateNumber, accessGranted, organizationName, listName, listColor, message, timestamp } = data;

    let status: 'granted' | 'denied' | 'unknown' = 'unknown';
    let isActive = true;
    let title = "";
    let color = listColor || "#f59e0b";

    if (accessGranted) {
      status = 'granted';
      isActive = true;
      title = "Машина опознана";
      color = listColor || '#10b981';
    } else {
      status = 'denied';
      isActive = false;
      title = "Машины нет в списках";
      color = listColor || '#ef4444';
    }

    let logTimestamp: Date;
    if (timestamp) {
      logTimestamp = new Date(timestamp);
    } else {
      logTimestamp = getCurrentTimestamp();
    }

    const newLog: AccessLog = {
      id: generateUniqueId(),
      plateNumber: plateNumber,
      organizationName: organizationName,
      listName: listName,
      listColor: listColor,
      timestamp: logTimestamp,
      status: status,
      isActive: isActive,
      message: message,
    };

    startTransition(() => {
      setRecentLogs(prev => [newLog, ...prev].slice(0, 5));
    });

    startTransition(() => {
      setStats(prev => {
        return {
          today: prev.today + 1,
          granted: prev.granted + (accessGranted ? 1 : 0),
          denied: prev.denied + (!accessGranted ? 1 : 0),
          unknown: prev.unknown,
        };
      });
    });

    startTransition(() => {
      setOverlayMessage({
        title: title,
        listColor: color,
        listName: listName || '',
        plateNumber: plateNumber,
        organizationName: organizationName || '',
        isActive: isActive,
      });
    });

    startTransition(() => {
      setShowOverlay(true);
    });

    setTimeout(() => {
      startTransition(() => {
        setShowOverlay(false);
      });
    }, 4000);

    if (accessGranted) {
      playSound('granted');
    } else {
      playSound('denied');
    }
  }, [playSound, startTransition]);

  // Проверка прав доступа
  useEffect(() => {
    if (user && user.roleId !== 5) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  // Инициализация на клиенте
  useEffect(() => {
    if (!hydrated) {
      const timeoutId = setTimeout(() => {
        setHydrated(true);
        setCurrentDate(new Date().toLocaleDateString('ru-RU'));
        setCurrentTime(new Date().toLocaleTimeString('ru-RU'));
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [hydrated]);

  // Обновление времени
  useEffect(() => {
    if (!hydrated) return;

    timeIntervalRef.current = setInterval(() => {
      startTransition(() => {
        setCurrentTime(new Date().toLocaleTimeString('ru-RU'));
      });
    }, 1000);

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, [startTransition, hydrated]);

  // Загрузка данных
  useEffect(() => {
    if (!isInitializedRef.current && hydrated) {
      isInitializedRef.current = true;

      const loadData = async () => {
        await Promise.all([loadRecentLogs(), loadTodayStats()]);
      };

      loadData().catch(error => {
        console.error('Error loading initial data:', error);
      });
    }
  }, [loadRecentLogs, loadTodayStats, hydrated]);

  // WebSocket подключение
  useEffect(() => {
    if (!hydrated) return;

    let wsUrl: string;

    if (typeof window !== 'undefined') {
      wsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://10.24.32.31:8080/ws`;
    } else {
      wsUrl = `ws://10.24.32.31:8080/ws`;
    }

    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        startTransition(() => {
          setWsConnected(true);
        });
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          if (data.type === 'plate_detected') {
            handlePlateDetection(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        startTransition(() => {
          setWsConnected(false);
        });
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code);
        startTransition(() => {
          setWsConnected(false);
        });

        if (!event.wasClean) {
          toast.error('Соединение с сервером разорвано');
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      startTransition(() => {
        setWsConnected(false);
      });
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [handlePlateDetection, startTransition, hydrated]);

  // Интервал для перезагрузки страницы
  useEffect(() => {
    if (!hydrated) return;

    const reloadInterval = setInterval(() => {
      window.location.reload();
    }, 180000);

    return () => clearInterval(reloadInterval);
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className={styles.container}>
        <Header role='security' />
        <div className={styles.pageWrapper}>
          <main className={styles.main}>
            <div className={styles.content}>
              <div className={styles.videoSection}>
                <div className={styles.videoCard}>
                  <div className={styles.videoContainer}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      Загрузка...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: 'granted' | 'denied' | 'unknown') => {
    switch (status) {
      case 'granted':
        return <i className="ri-checkbox-circle-line" style={{ color: '#10b981' }}></i>;
      case 'denied':
        return <i className="ri-close-circle-line" style={{ color: '#f59e0b' }}></i>;
      case 'unknown':
        return <i className="ri-question-line" style={{ color: '#ef4444' }}></i>;
    }
  };

  const getStatusText = (status: 'granted' | 'denied' | 'unknown') => {
    switch (status) {
      case 'granted': return 'Доступ разрешен';
      case 'denied': return 'Номер неактивен';
      case 'unknown': return 'Неопознанная машина';
    }
  };

  const getListColor = (listType?: string) => {
    switch (listType) {
      case 'white': return '#10b981';
      case 'black': return '#ef4444';
      case 'vip': return '#8b5cf6';
      case 'temporary': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: 'granted' | 'denied' | 'unknown') => {
    switch (status) {
      case 'granted': return '#10b981';
      case 'denied': return '#f59e0b';
      case 'unknown': return '#ef4444';
    }
  };

  const formatDateTime = (dateString: string) => {
    const localDateString = dateString.replace('Z', '');
    const date = new Date(localDateString);

    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={styles.container}>
      <Header role='security' />

      <div className={styles.pageWrapper}>
        {showOverlay && (
          <div
            className={styles.fullscreenOverlay}
            style={{
              borderColor: overlayMessage.listColor,
              color: overlayMessage.listColor,
            }}
          >
            <div className={styles.overlayContent}>
              <div className={styles.overlayTitle} style={{ color: overlayMessage.listColor }}>
                {overlayMessage.title}
              </div>
              {overlayMessage.organizationName && (
                <div className={styles.overlayOrg}>
                  <i className="ri-building-4-line"></i>
                  {overlayMessage.organizationName}
                </div>
              )}
              <div className={styles.overlayPlate}>
                <i className="ri-car-line"></i>
                {overlayMessage.plateNumber}
              </div>
              {overlayMessage.listName && (
                <div className={styles.overlayList} style={{ color: overlayMessage.listColor }}>
                  <i className="ri-list-check-3"></i>
                  {overlayMessage.listName}
                </div>
              )}
              {!overlayMessage.isActive && overlayMessage.listName && (
                <div className={styles.overlayWarning}>
                  <i className="ri-alert-line"></i>
                  Номер неактивен
                </div>
              )}
            </div>
          </div>
        )}

        <main className={styles.main}>
          <div className={styles.content}>
            <div className={styles.videoSection}>
              <div className={styles.videoCard}>
                <StatsButton stats={stats} />

                {/* Форма ручного поиска номера */}
                <div className={styles.searchSection} ref={searchContainerRef}>
                  <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
                    <div className={styles.searchInputWrapper}>
                      <i className="ri-search-line"></i>
                      <input
                        type="text"
                        value={searchPlate}
                        onChange={handleSearchInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Введите номер для проверки..."
                        className={styles.searchInput}
                        maxLength={20}
                        autoComplete="off"
                      />
                      {searchLoading && (
                        <i className="ri-loader-4-line ri-spin" style={{ position: 'absolute', right: '40px', color: '#9ca3af' }}></i>
                      )}

                      {/* Выпадающий список с подсказками */}
                      {showSuggestions && suggestions.length > 0 && (
                        <div className={styles.suggestionsDropdown}>
                          {suggestions.map((suggestion, index) => (
                            <div
                              key={suggestion.plateNumber}
                              className={`${styles.suggestionItem} ${index === selectedIndex ? styles.suggestionItemSelected : ''}`}
                              onClick={() => handleSelectSuggestion(suggestion)}
                              onMouseEnter={() => setSelectedIndex(index)}
                            >
                              <div className={styles.suggestionMain}>
                                <span className={styles.suggestionPlate}>{suggestion.plateNumber}</span>
                                <span
                                  className={styles.suggestionStatus}
                                  style={{
                                    color: suggestion.isActive ? '#10b981' : '#f59e0b'
                                  }}
                                >
                                  {suggestion.isActive ? '✓ Активен' : '⚠ Неактивен'}
                                </span>
                              </div>
                              {suggestion.organizationName && (
                                <div className={styles.suggestionDetail}>
                                  <i className="ri-building-4-line"></i>
                                  <span>{suggestion.organizationName}</span>
                                </div>
                              )}
                              {suggestion.listName && (
                                <div className={styles.suggestionDetail}>
                                  <i className="ri-list-check-3"></i>
                                  <span style={{ color: suggestion.listColor }}>{suggestion.listName}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {showSuggestions && suggestions.length === 0 && searchPlate.length >= 3 && !searchLoading && (
                        <div className={styles.suggestionsDropdown}>
                          <div className={styles.noSuggestions}>
                            <i className="ri-search-line"></i>
                            <span>Похожих номеров не найдено</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </form>

                  {/* Результат поиска */}
                  {showSearchResult && searchResult && (
                    <div
                      className={styles.searchResult}
                      style={{
                        borderColor: searchResult.exists && searchResult.isActive
                          ? (searchResult.listColor || '#10b981')
                          : '#ef4444'
                      }}
                    >
                      <div className={styles.searchResultHeader}>
                        <span className={styles.searchResultPlate}>{searchResult.plateNumber}</span>
                        <span
                          className={styles.searchResultStatus}
                          style={{
                            color: searchResult.exists && searchResult.isActive ? '#10b981' : '#ef4444'
                          }}
                        >
                          {searchResult.exists && searchResult.isActive ? '✓ Доступ разрешен' : '✗ Доступ запрещен'}
                        </span>
                      </div>

                      {searchResult.organizationName && (
                        <div className={styles.searchResultRow}>
                          <i className="ri-building-4-line"></i>
                          <span>{searchResult.organizationName}</span>
                        </div>
                      )}

                      {searchResult.listName && (
                        <div className={styles.searchResultRow}>
                          <i className="ri-list-check-3"></i>
                          <span style={{ color: searchResult.listColor }}>
                            {searchResult.listName}
                          </span>
                        </div>
                      )}

                      {searchResult.validUntil && (
                        <div className={styles.searchResultRow}>
                          <i className="ri-calendar-line"></i>
                          <span>Действует до: {new Date(searchResult.validUntil).toLocaleDateString('ru-RU')}</span>
                        </div>
                      )}

                      {!searchResult.isActive && searchResult.exists && (
                        <div className={styles.searchResultWarning}>
                          <i className="ri-alert-line"></i>
                          <span>Номер найден, но неактивен</span>
                        </div>
                      )}

                      {searchResult.message && (
                        <div className={styles.searchResultMessage}>
                          <i className="ri-information-line"></i>
                          <span>{searchResult.message}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={styles.videoContainer}>
                  <WebRTCPlayer cameraId="camera1" />
                </div>
              </div>
            </div>

            <div className={styles.sidebar}>
              <div className={styles.sidebarCard}>
                <h2 className={styles.sidebarTitle}>
                  <i className="ri-history-line"></i>
                  Последние проезды
                  <span className={styles.logsCount}>{recentLogs.length}/5</span>
                </h2>

                {recentLogs.length > 0 ? (
                  <div className={styles.logsList}>
                    {recentLogs.map((log) => {
                      const listColor = log.listColor || getListColor(log.listType);
                      const statusColor = getStatusColor(log.status);

                      return (
                        <div
                          key={log.id}
                          className={`${styles.logItem} ${styles[`logItem_${log.status}`]}`}
                          style={{ borderLeftColor: statusColor }}
                        >
                          <div className={styles.logHeader}>
                            <span className={styles.logPlate}>{log.plateNumber}</span>
                            {getStatusIcon(log.status)}
                          </div>

                          {log.status === 'granted' ? (
                            <div className={styles.logDetails}>
                              <div className={styles.detailRow}>
                                <i className="ri-building-4-line"></i>
                                <span>{log.organizationName || 'Неизвестная организация'}</span>
                              </div>
                              <div className={styles.detailRow}>
                                <i className="ri-list-check-3"></i>
                                <span style={{ color: listColor }}>
                                  {log.listName || 'Неизвестный список'}
                                </span>
                              </div>
                            </div>
                          ) : log.status === 'denied' ? (
                            <div className={styles.logDetails}>
                              <div className={styles.detailRow}>
                                <i className="ri-error-warning-line" style={{ color: '#f59e0b' }}></i>
                                <span>{log.organizationName || 'Неизвестная организация'}</span>
                              </div>
                              <div className={styles.detailRow}>
                                <i className="ri-list-check-3"></i>
                                <span style={{ color: listColor }}>
                                  {log.listName || 'Неизвестный список'}
                                </span>
                              </div>
                              <div className={styles.detailRow}>
                                <i className="ri-alert-line"></i>
                                <span className={styles.warningText}>Номер неактивен</span>
                              </div>
                            </div>
                          ) : log.status === 'unknown' ? (
                            <div className={styles.logDetails}>
                              <div className={styles.detailRow}>
                                <i className="ri-error-warning-line" style={{ color: '#ef4444' }}></i>
                                <span>Неопознанная машина</span>
                              </div>
                              {log.message && (
                                <div className={styles.detailRow}>
                                  <i className="ri-information-line"></i>
                                  <span className={styles.logMessage}>{log.message}</span>
                                </div>
                              )}
                            </div>
                          ) : null}

                          <div className={styles.logFooter}>
                            <span className={styles.logTime}>
                              {formatDateTime(log.timestamp.toISOString())}
                            </span>
                            <span className={styles.logStatus} style={{ color: statusColor }}>
                              {getStatusText(log.status)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyLogs}>
                    <i className="ri-inbox-line"></i>
                    <p>Нет проездов</p>
                    <p className={styles.emptyHint}>
                      Ожидайте прибытия транспорта
                    </p>
                  </div>
                )}
              </div>

              <div className={styles.infoCard}>
                <h3 className={styles.infoTitle}>
                  <i className="ri-information-line"></i>
                  Информация
                </h3>
                <div className={styles.infoContent}>
                  <div className={styles.infoItem}>
                    <span>Дата:</span>
                    <strong suppressHydrationWarning>{currentDate || '--.--.----'}</strong>
                  </div>
                  <div className={styles.infoItem}>
                    <span>Время:</span>
                    <strong suppressHydrationWarning>{currentTime || '--:--:--'}</strong>
                  </div>
                  <div className={styles.infoItem}>
                    <span>Режим:</span>
                    <strong className={wsConnected ? styles.liveMode : styles.demoMode}>
                      {wsConnected ? 'Live' : 'Демо'}
                    </strong>
                  </div>
                  {wsConnected && (
                    <div className={styles.infoItem}>
                      <span>WebSocket:</span>
                      <strong className={styles.online}>Подключен</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}