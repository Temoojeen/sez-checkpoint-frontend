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
  const [overlayClosing, setOverlayClosing] = useState(false);
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

  const [searchPlate, setSearchPlate] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<CheckPlateResponse | null>(null);
  const [showSearchResult, setShowSearchResult] = useState(false);

  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const logIdCounterRef = useRef<number>(0);
  const isInitializedRef = useRef(false);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [similarPlates, setSimilarPlates] = useState<SearchSuggestion[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  const loadSimilarPlates = useCallback(async (plateNumber: string) => {
    if (!plateNumber || plateNumber.length < 3) return;
    setSimilarLoading(true);
    try {
      const token = Cookies.get('token');
      if (!token) return;
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://kpp1.sezkhorgos.kz/api';
      const cleanPlate = plateNumber.replace(/\s/g, '').toUpperCase();
      const searchQuery = cleanPlate.length >= 3 ? cleanPlate.slice(0, 3) : cleanPlate;
      const response = await fetch(`${baseURL}/security/search-plates?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data: SearchSuggestion[] = await response.json();
        setSimilarPlates(data || []);
      }
    } catch (error) {
      console.error('Error loading similar plates:', error);
    } finally {
      setSimilarLoading(false);
    }
  }, []);

  const searchSimilarPlates = async (query: string) => {
    if (query.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    try {
      const token = Cookies.get('token');
      if (!token) return;
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://kpp1.sezkhorgos.kz/api';
      const response = await fetch(`${baseURL}/security/search-plates?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data: SearchSuggestion[] = await response.json();
        if (data && Array.isArray(data)) {
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      setSuggestions([]);
      setShowSuggestions(false);
      console.log(error)
    }
  };

const handleManualCheck = async (plateNumber: string) => {
    if (!plateNumber.trim()) { setSearchResult(null); setShowSearchResult(false); return; }
    try {
      setSearchLoading(true);
      const token = Cookies.get('token');
      if (!token) return;
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://kpp1.sezkhorgos.kz/api';
      const response = await fetch(`${baseURL}/security/check-plate/${encodeURIComponent(plateNumber.trim().toUpperCase())}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data: CheckPlateResponse = await response.json();
        setSearchResult(data);
        setShowSearchResult(true);
        
        // Определяем заголовок в зависимости от статуса
        let title = "";
        let color = data.listColor || '#10b981';
        let isActive = data.isActive || false;
        
        if (data.exists) {
          if (isActive) {
            title = data.organizationName ? "Доступ разрешен" : "Нет организации";
            color = data.listColor || (data.organizationName ? '#10b981' : '#f59e0b');
          } else {
            title = "Номер неактивен";
            color = '#ef4444';
          }
        } else {
          title = "Номер не найден";
          color = '#ef4444';
          isActive = false;
        }
        
        setOverlayMessage({
          title: title,
          listColor: color,
          listName: data.listName || '',
          plateNumber: plateNumber.trim().toUpperCase(),
          organizationName: data.organizationName || '',
          isActive: isActive,
        });
        setOverlayClosing(false);
        setShowOverlay(true);
        setTimeout(() => {
          setOverlayClosing(true);
          setTimeout(() => setShowOverlay(false), 300);
        }, 3700);
      }
    } catch (error) {
      toast.error('Ошибка при проверке номера');
      console.log(error)
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
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => searchSimilarPlates(value), 300);
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
      case 'ArrowDown': e.preventDefault(); setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev); break;
      case 'ArrowUp': e.preventDefault(); setSelectedIndex(prev => prev > 0 ? prev - 1 : -1); break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) { e.preventDefault(); handleSelectSuggestion(suggestions[selectedIndex]); }
        else { const form = e.currentTarget.closest('form'); if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }
        break;
      case 'Escape': setShowSuggestions(false); setSuggestions([]); break;
    }
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchPlate.trim()) { handleManualCheck(searchPlate); setSuggestions([]); setShowSuggestions(false); }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadRecentLogs = useCallback(async () => {
    try {
      const token = Cookies.get('token');
      if (!token) return;
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://kpp1.sezkhorgos.kz/api';
      const response = await fetch(baseURL + '/security/recent-logs', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const logs: ApiLog[] = await response.json();
        if (logs && Array.isArray(logs) && logs.length > 0) {
          startTransition(() => setRecentLogs(logs.map(log => ({
            id: log.id,
            plateNumber: log.plateNumber,
            organizationName: log.organizationName,
            listName: log.listName,
            listColor: log.listColor,
            timestamp: new Date(log.createdAt),
            status: (log.accessGranted ? 'granted' : 'denied') as 'granted' | 'denied',
            isActive: log.accessGranted,
            message: log.message,
          })).slice(0, 5)));
        } else { startTransition(() => setRecentLogs([])); }
      }
    } catch (error) { startTransition(() => setRecentLogs([])); console.error(error); }
  }, [startTransition]);

  const loadTodayStats = useCallback(async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://kpp1.sezkhorgos.kz/api';
      const response = await fetch(baseURL + '/security/statistics', { headers: { 'Authorization': `Bearer ${Cookies.get('token')}` } });
      if (response.ok) {
        const data: StatisticsResponse = await response.json();
        startTransition(() => setStats({ today: data?.statistics?.total || 0, granted: data?.statistics?.granted || 0, denied: data?.statistics?.denied || 0, unknown: 0 }));
      }
    } catch (error) {
      console.log(error)
    }
  }, [startTransition]);

  const generateUniqueId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    logIdCounterRef.current += 1;
    return `${Date.now()}-${logIdCounterRef.current}`;
  };

  const playSound = useCallback((type: 'granted' | 'denied') => {
    try {
      const audio = new Audio();
      audio.src = type === 'granted' ? '/assets/sounds/granted.mp3' : '/assets/sounds/denied.mp3';
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (error) {
      console.log(error)
    }
  }, []);

  const speakText = useCallback((text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.rate = 0.9;
      utterance.volume = 0.8;
      const voices = window.speechSynthesis.getVoices();
      const russianVoice = voices.find(voice => voice.lang.startsWith('ru'));
      if (russianVoice) utterance.voice = russianVoice;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.log(error)
    }
  }, []);

const handlePlateDetection = useCallback((data: WebSocketMessage) => {
    const { plateNumber, accessGranted, organizationName, listName, listColor, message, timestamp } = data;
    let status: 'granted' | 'denied' | 'unknown';
    let isActive = true;
    let title = "";
    let color = listColor || "#f59e0b";

    if (accessGranted) {
      status = 'granted';
      isActive = true; // Явно указываем что активный
      title = organizationName ? "Доступ разрешен" : "Номер добавлен без организации";
      color = listColor || (organizationName ? '#10b981' : '#f59e0b');
    } else {
      status = 'denied';
      isActive = false;
      title = "Доступ запрещен";
      color = '#ef4444';
    }

    const logTimestamp = timestamp ? new Date(timestamp) : new Date();
    const newLog: AccessLog = { 
      id: generateUniqueId(), 
      plateNumber, 
      organizationName, 
      listName, 
      listColor, 
      timestamp: logTimestamp, 
      status, 
      isActive, 
      message 
    };

    startTransition(() => setRecentLogs(prev => [newLog, ...prev].slice(0, 5)));
    startTransition(() => setStats(prev => ({ 
      today: prev.today + 1, 
      granted: prev.granted + (accessGranted ? 1 : 0), 
      denied: prev.denied + (!accessGranted ? 1 : 0), 
      unknown: prev.unknown 
    })));
    startTransition(() => setOverlayMessage({ 
      title, 
      listColor: color, 
      listName: listName || '', 
      plateNumber, 
      organizationName: organizationName || '', 
      isActive 
    }));
    startTransition(() => {
      setOverlayClosing(false);
      setShowOverlay(true);
    });

    if (accessGranted) playSound('granted');
    else playSound('denied');

    const statusText = isActive ? 'активный' : 'неактивный';
    speakText(accessGranted ? `Номер ${plateNumber.split('').join(' ')}. ${statusText}` : 'Номер не найден');
    loadSimilarPlates(plateNumber);

    setTimeout(() => {
      setOverlayClosing(true);
      setTimeout(() => startTransition(() => setShowOverlay(false)), 300);
    }, 3700);
  }, [playSound, speakText, startTransition, loadSimilarPlates]);

  useEffect(() => { if (user && user.roleId !== 5) { router.push('/'); toast.error('У вас нет доступа к этой странице'); } }, [user, router]);

  useEffect(() => {
    if (!hydrated) {
      const timeoutId = setTimeout(() => { setHydrated(true); setCurrentDate(new Date().toLocaleDateString('ru-RU')); setCurrentTime(new Date().toLocaleTimeString('ru-RU')); }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    timeIntervalRef.current = setInterval(() => startTransition(() => setCurrentTime(new Date().toLocaleTimeString('ru-RU'))), 1000);
    return () => { if (timeIntervalRef.current) clearInterval(timeIntervalRef.current); };
  }, [startTransition, hydrated]);

  useEffect(() => {
    if (!isInitializedRef.current && hydrated) { isInitializedRef.current = true; Promise.all([loadRecentLogs(), loadTodayStats()]).catch(() => {}); }
  }, [loadRecentLogs, loadTodayStats, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://kpp1.sezkhorgos.kz:8080/ws';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => startTransition(() => setWsConnected(true));
    ws.onmessage = (event) => {
      try { const data: WebSocketMessage = JSON.parse(event.data); if (data.type === 'plate_detected') handlePlateDetection(data); } catch (error) {
        console.log(error)
      }
    };
    ws.onerror = () => startTransition(() => setWsConnected(false));
    ws.onclose = (event) => { startTransition(() => setWsConnected(false)); if (!event.wasClean) toast.error('Соединение с сервером разорвано'); };
    return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [handlePlateDetection, startTransition, hydrated]);

  useEffect(() => { if (!hydrated) return; const reloadInterval = setInterval(() => window.location.reload(), 180000); return () => clearInterval(reloadInterval); }, [hydrated]);

  if (!hydrated) {
    return (
      <div className={styles.container}>
        <Header role='security' />
        <div className={styles.pageWrapper}><main className={styles.main}><div className={styles.content}><div className={styles.videoSection}><div className={styles.videoCard}><div className={styles.videoContainer}><div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Загрузка...</div></div></div></div></div></main></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header role='security' />
      <div className={styles.pageWrapper}>
        {showOverlay && (
  <div 
    className={`${styles.fullscreenOverlay} ${overlayClosing ? styles.overlayDisappear : styles.overlayAppear}`}
    style={{ '--border-color': overlayMessage.listColor, background: overlayMessage.listColor } as React.CSSProperties}
  >
    <div className={styles.overlayContent}>
      {/* Иконка статуса */}
      <div className={styles.overlayIcon}>
        {overlayMessage.isActive ? (
          <i className="ri-check-line" style={{ color: '#10b981' }}></i>
        ) : overlayMessage.title === "Номер неактивен" || overlayMessage.title === "Доступ запрещен" ? (
          <i className="ri-close-line" style={{ color: '#ef4444' }}></i>
        ) : (
          <i className="ri-alert-line" style={{ color: '#f59e0b' }}></i>
        )}
      </div>
      
      {/* Заголовок */}
      <div className={styles.overlayTitle}>
        {overlayMessage.title}
      </div>
      
      {/* Номер машины - черный шрифт */}
      <div className={styles.overlayPlate}>
        <i className="ri-car-line"></i>
        {overlayMessage.plateNumber}
      </div>
      
      {/* Организация */}
      {overlayMessage.organizationName ? (
        <div className={styles.overlayOrg}>
          <i className="ri-building-4-line"></i>
          {overlayMessage.organizationName}
        </div>
      ) : overlayMessage.title !== "Номер не найден" && (
        <div className={styles.overlayOrg} style={{ color: '#f59e0b' }}>
          <i className="ri-alert-line"></i>
          Организация не указана
        </div>
      )}
      
      {/* Список */}
      {overlayMessage.listName && (
        <div className={styles.overlayList} style={{ color: overlayMessage.listColor }}>
          <i className="ri-list-check-3"></i>
          {overlayMessage.listName}
        </div>
      )}
      
      {/* Предупреждение для неактивных номеров */}
      {!overlayMessage.isActive && (
        <div className={styles.overlayWarning}>
          <i className="ri-error-warning-line"></i>
          {overlayMessage.title === "Номер не найден" ? "Номер не найден в системе" : "Номер неактивен"}
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
                <div className={styles.searchSection} ref={searchContainerRef}>
                  <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
                    <div className={styles.searchInputWrapper}>
                      <i className="ri-search-line"></i>
                      <input type="text" value={searchPlate} onChange={handleSearchInputChange} onKeyDown={handleKeyDown} placeholder="Введите номер для проверки..." className={styles.searchInput} maxLength={20} autoComplete="off" />
                      {searchLoading && <i className="ri-loader-4-line ri-spin" style={{ position: 'absolute', right: '40px', color: '#9ca3af' }}></i>}
                      {showSuggestions && suggestions.length > 0 && (
                        <div className={styles.suggestionsDropdown}>
                          {suggestions.map((suggestion, index) => (
                            <div key={suggestion.plateNumber} className={`${styles.suggestionItem} ${index === selectedIndex ? styles.suggestionItemSelected : ''}`} onClick={() => handleSelectSuggestion(suggestion)} onMouseEnter={() => setSelectedIndex(index)}>
                              <div className={styles.suggestionMain}><span className={styles.suggestionPlate}>{suggestion.plateNumber}</span><span className={styles.suggestionStatus} style={{ color: suggestion.isActive ? '#10b981' : '#f59e0b' }}>{suggestion.isActive ? '✓ Активен' : '⚠ Неактивен'}</span></div>
                              {suggestion.organizationName && <div className={styles.suggestionDetail}><span>{suggestion.organizationName}</span></div>}
                              {suggestion.listName && <div className={styles.suggestionDetail}><span style={{ color: suggestion.listColor }}>{suggestion.listName}</span></div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </form>
                  {showSearchResult && searchResult && (
                    <div className={styles.searchResult} style={{ borderColor: searchResult.exists && searchResult.isActive ? (searchResult.listColor || '#10b981') : '#ef4444' }}>
                      <div className={styles.searchResultHeader}><span className={styles.searchResultPlate}>{searchResult.plateNumber}</span><span className={styles.searchResultStatus} style={{ color: searchResult.exists && searchResult.isActive ? '#10b981' : '#ef4444' }}>{searchResult.exists && searchResult.isActive ? '✓ Доступ разрешен' : '✗ Доступ запрещен'}</span></div>
                      {searchResult.organizationName ? <div className={styles.searchResultRow}><i className="ri-building-4-line"></i><span>{searchResult.organizationName}</span></div> : searchResult.exists && <div className={styles.searchResultRow} style={{ color: '#f59e0b' }}><i className="ri-alert-line"></i><span>Организация не указана</span></div>}
                      {searchResult.listName && <div className={styles.searchResultRow}><i className="ri-list-check-3"></i><span style={{ color: searchResult.listColor }}>{searchResult.listName}</span></div>}
                      {searchResult.validUntil && <div className={styles.searchResultRow}><i className="ri-calendar-line"></i><span>Действует до: {new Date(searchResult.validUntil).toLocaleDateString('ru-RU')}</span></div>}
                      {!searchResult.isActive && searchResult.exists && <div className={styles.searchResultWarning}><i className="ri-alert-line"></i><span>Номер найден, но неактивен</span></div>}
                      {searchResult.message && <div className={styles.searchResultMessage}><i className="ri-information-line"></i><span>{searchResult.message}</span></div>}
                    </div>
                  )}
                </div>
                <div className={styles.videoContainer}><WebRTCPlayer cameraId="camera1" /></div>
              </div>
            </div>
            <div className={styles.similarNumbers}>
              <div className={styles.similarNumbersTitle}><i className="ri-list-check-3"></i>Похожие номера{similarLoading && <i className="ri-loader-4-line ri-spin" style={{ marginLeft: 8 }}></i>}</div>
              {similarPlates.length > 0 ? (
                <div className={styles.similarNumbersList}>
                  {similarPlates.map((plate) => (
                    <div key={plate.plateNumber} className={styles.similarNumberItem} onClick={() => handleManualCheck(plate.plateNumber)} style={{ cursor: 'pointer' }}>
                      <span className={styles.similarNumberPlate}>{plate.plateNumber}</span>
                      <span style={{ color: plate.isActive ? '#10b981' : '#f59e0b', fontSize: 12 }}>{plate.isActive ? '✓' : '⚠'}</span>
                      {plate.organizationName && <span className={styles.similarNumberOrg}>{plate.organizationName}</span>}
                      {plate.listName && <span className={styles.similarNumberListName} style={{ color: plate.listColor }}>{plate.listName}</span>}
                    </div>
                  ))}
                </div>
              ) : <p className={styles.similarNumbersEmpty}>Нет похожих номеров</p>}
            </div>
            <div className={styles.sidebar}>
              <div className={styles.sidebarCard}>
                <h2 className={styles.sidebarTitle}><i className="ri-history-line"></i>Последние проезды<span className={styles.logsCount}>{recentLogs.length}/5</span></h2>
                {recentLogs.length > 0 ? (
                  <div className={styles.logsList}>
                    {recentLogs.map((log) => (
                      <div key={log.id} className={`${styles.logItem} ${styles[`logItem_${log.status}`]}`} style={{ borderLeftColor: log.status === 'granted' ? '#10b981' : log.status === 'denied' ? '#f59e0b' : '#ef4444' }}>
                        <div className={styles.logHeader}><span className={styles.logPlate}>{log.plateNumber}</span>{log.status === 'granted' ? <i className="ri-checkbox-circle-line" style={{ color: '#10b981' }}></i> : log.status === 'denied' ? <i className="ri-close-circle-line" style={{ color: '#f59e0b' }}></i> : <i className="ri-question-line" style={{ color: '#ef4444' }}></i>}</div>
                        <div className={styles.logDetails}>
                          <div className={styles.detailRow}><i className={log.organizationName ? "ri-building-4-line" : "ri-alert-line"} style={{ color: log.organizationName ? 'inherit' : '#f59e0b' }}></i><span style={{ color: log.organizationName ? 'inherit' : '#f59e0b' }}>{log.organizationName || 'Организация не указана'}</span></div>
                          {log.listName && <div className={styles.detailRow}><i className="ri-list-check-3"></i><span style={{ color: log.listColor || '#6b7280' }}>{log.listName}</span></div>}
                          {log.status === 'denied' && log.listName && <div className={styles.detailRow}><i className="ri-alert-line"></i><span className={styles.warningText}>Номер неактивен</span></div>}
                          {log.status === 'granted' && !log.organizationName && <div className={styles.detailRow}><i className="ri-error-warning-line" style={{ color: '#f59e0b' }}></i><span className={styles.warningText}>Номер в списке</span></div>}
                          {log.message && <div className={styles.detailRow}><i className="ri-information-line"></i><span className={styles.logMessage}>{log.message}</span></div>}
                        </div>
                        <div className={styles.logFooter}><span className={styles.logTime}>{new Date(log.timestamp.toISOString().replace('Z', '')).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span><span className={styles.logStatus} style={{ color: log.status === 'granted' ? '#10b981' : log.status === 'denied' ? '#f59e0b' : '#ef4444' }}>{log.status === 'granted' ? (log.organizationName ? 'Доступ разрешен' : 'Требует внимания') : log.status === 'denied' ? 'Доступ запрещен' : 'Неопознанная машина'}</span></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyLogs}><i className="ri-inbox-line"></i><p>Нет проездов</p><p className={styles.emptyHint}>Ожидайте прибытия транспорта</p></div>
                )}
              </div>
              <div className={styles.infoCard}>
                <h3 className={styles.infoTitle}><i className="ri-information-line"></i>Информация</h3>
                <div className={styles.infoContent}>
                  <div className={styles.infoItem}><span>Дата:</span><strong suppressHydrationWarning>{currentDate || '--.--.----'}</strong></div>
                  <div className={styles.infoItem}><span>Время:</span><strong suppressHydrationWarning>{currentTime || '--:--:--'}</strong></div>
                  <div className={styles.infoItem}><span>Режим:</span><strong className={wsConnected ? styles.liveMode : styles.demoMode}>{wsConnected ? 'Live' : 'Демо'}</strong></div>
                  {wsConnected && <div className={styles.infoItem}><span>WebSocket:</span><strong className={styles.online}>Подключен</strong></div>}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}