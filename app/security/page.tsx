"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import approvedPlateService from '@/services/approved-plate.service';
import { CheckPlateResponse } from '@/types';
import { formatTime } from '@/utils/format';
import styles from './page.module.css';
import CameraPlayer from "@/components/CameraPlayer/CameraPlayer"
import WebRTCPlayer from '@/components/WebRTCPlayer/WebRTCPlayer';
import Cookies from 'js-cookie';
import Header from '@/components/Header/Header';
import statsSidebar from '@/components/statsSidebar/statsSidebar';
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

export default function SecurityPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [processing, setProcessing] = useState(false);
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
  const wsRef = useRef<WebSocket | null>(null);
  const TEST_PLATE_NUMBER = 'A583OE197';

  useEffect(() => {
    loadTodayStats();
    loadRecentLogs();
    
    let wsUrl: string;
    
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      
      wsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://10.24.32.31:8080/ws`;
    } else {
      wsUrl = `ws://10.24.32.31:8080/ws`;
    }
    
    console.log('Connecting to WebSocket at:', wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
  
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setWsConnected(true);
        // toast.success('Подключение к серверу установлено');
      };
  
      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('📡 WebSocket message received:', data);
          
          if (data.type === 'plate_detected') {
            handlePlateDetection(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
  
      ws.onerror = (error) => {
        console.error('WebSocket error details:', {
          url: wsUrl,
          readyState: ws.readyState,
          error: error
        });
        setWsConnected(false);
      };
  
      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setWsConnected(false);
        
        if (!event.wasClean) {
          toast.error('Соединение с сервером разорвано');
        }
        
        const timeoutId = setTimeout(() => {
          console.log('Attempting to reconnect...');
        }, 5000);
        
        return () => clearTimeout(timeoutId);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setWsConnected(false);
    }
  
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  const handlePlateDetection = (data: WebSocketMessage) => {
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
    
    const newLog: AccessLog = {
      id: Date.now().toString(),
      plateNumber: plateNumber,
      organizationName: organizationName,
      listName: listName,
      listColor: listColor,
      timestamp: new Date(timestamp || Date.now()),
      status: status,
      isActive: isActive,
      message: message,
    };
    
    setRecentLogs(prev => [newLog, ...prev].slice(0, 5));
    
    setStats(prev => {
      const newStats = {
        today: prev.today + 1,
        granted: prev.granted + (accessGranted ? 1 : 0),
        denied: prev.denied + (!accessGranted ? 1 : 0),
        unknown: prev.unknown,
      };
      return newStats;
    });
    
    setOverlayMessage({
      title: title,
      listColor: color,
      listName: listName || '',
      plateNumber: plateNumber,
      organizationName: organizationName || '',
      isActive: isActive,
    });
    
    setShowOverlay(true);
    setTimeout(() => {
      setShowOverlay(false);
    }, 4000);
    
    if (accessGranted) {
      playSound('granted');
    } else {
      playSound('denied');
    }
  };
  
  const playSound = (type: 'granted' | 'denied') => {
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
      console.log('Sound not supported');
    }
  };

  useEffect(() => {
    if (user && user.roleId !== 5) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  useEffect(() => {
    loadRecentLogs();
    loadTodayStats();
    
    setCurrentDate(new Date().toLocaleDateString('ru-RU'));
    setCurrentTime(new Date().toLocaleTimeString('ru-RU'));
    
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('ru-RU'));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Интервал для перезагрузки страницы каждые 3 минуты (180000 миллисекунд)
    const reloadInterval = setInterval(() => {
      console.log('Автоматическая перезагрузка страницы...');
      window.location.reload();
    }, 180000); // 3 минуты = 180000 мс
  
    // Очистка интервала при размонтировании компонента
    return () => clearInterval(reloadInterval);
  }, []);

  const loadRecentLogs = async () => {
    try {
      const token = Cookies.get('token');
      if (!token) return;
      
      const response = await fetch('/api/security/recent-logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const logs = await response.json();
        console.log('Loaded logs from API:', logs);
        
        if (logs && Array.isArray(logs) && logs.length > 0) {
          const formattedLogs: AccessLog[] = logs.map((log: any) => ({
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
          setRecentLogs(formattedLogs.slice(0, 5));
        } else {
          setRecentLogs([]);
        }
      } else {
        console.error('Failed to load logs, status:', response.status);
        setRecentLogs([]);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      setRecentLogs([]);
    }
  };
  
  const loadTodayStats = async () => {
    try {
      const response = await fetch('/api/security/statistics', {
        headers: {
          'Authorization': `Bearer ${Cookies.get('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats({
          today: data?.statistics?.total || 0,
          granted: data?.statistics?.granted || 0,
          denied: data?.statistics?.denied || 0,
          unknown: 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const openOverlay = () => {
    setShowOverlay(true);
    setTimeout(() => {
      setShowOverlay(false);
    }, 5000);
  };

  


  const handleLogout = () => {
    logout();
  };

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
  
  const handleError = (error: Error) => {
    console.error("Camera error:", error);
  }

  return (
    <div className={styles.container}>
      <Header role='security'/>
      
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
                            <>
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
                            </>
                          ) : log.status === 'denied' ? (
                            <>
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
                            </>
                          ) : log.status === 'unknown' ? (
                            <>
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
                            </>
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
                    <strong>{currentDate || 'Загрузка...'}</strong>
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