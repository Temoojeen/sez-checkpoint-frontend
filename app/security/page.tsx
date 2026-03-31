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

export default function SecurityPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnded, setVideoEnded] = useState(false);
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

  const TEST_PLATE_NUMBER = 'A583OE197';

  useEffect(() => {
    if (user && user.roleId !== 5) {
      router.push('/');
      toast.error('У вас нет доступа к этой странице');
    }
  }, [user, router]);

  useEffect(() => {
    loadRecentLogs();
  }, []);

  const loadRecentLogs = async () => {
    try {
      setRecentLogs([]);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const openOverlay = () => {
    setShowOverlay(true);
    setTimeout(() => {
      setShowOverlay(false);
    }, 5000);
  };

  const handleVideoEnd = async () => {
    if (processing) return;
    
    setVideoEnded(true);
    setProcessing(true);
    
    try {
      let response: CheckPlateResponse;
      try {
        response = await approvedPlateService.checkPlate(TEST_PLATE_NUMBER);
        console.log('Response from server:', response);
      } catch (error) {
        console.error('Error checking plate:', error);
        response = {
          exists: false,
          plateNumber: TEST_PLATE_NUMBER,
          message: 'Ошибка при проверке'
        };
      }
      
      let status: 'granted' | 'denied' | 'unknown' = 'unknown';
      let isActive = true;
      let title = "";
      let listColor = "#f59e0b";
      
      if (response.exists) {
        if (response.isActive !== false) {
          // Номер активен
          status = 'granted';
          isActive = true;
          title = "Машина опознана";
          listColor = response.listColor || '#10b981';
        } else {
          // Номер найден, но неактивен
          status = 'denied';
          isActive = false;
          title = "Номер неактивен";
          listColor = "#f59e0b";
        }
      } else {
        // Номер не найден
        status = 'unknown';
        isActive = false;
        title = "Машина не опознана";
        listColor = "#ef4444";
      }
      
      const newLog: AccessLog = {
        id: Date.now().toString(),
        plateNumber: TEST_PLATE_NUMBER,
        organizationName: response.organizationName,
        listName: response.listName,
        listType: response.listType,
        listColor: response.listColor,
        timestamp: new Date(),
        status: status,
        isActive: isActive,
        message: response.message,
      };
      
      setRecentLogs(prev => [newLog, ...prev].slice(0, 5));
      
      setStats(prev => {
        const newStats = {
          today: prev.today + 1,
          granted: prev.granted,
          denied: prev.denied,
          unknown: prev.unknown,
        };
        
        if (status === 'granted') {
          newStats.granted += 1;
        } else if (status === 'denied') {
          newStats.denied += 1;
        } else {
          newStats.unknown += 1;
        }
        
        return newStats;
      });
      
      openOverlay();
      
      setOverlayMessage({
        title: title,
        listColor: listColor,
        listName: response.listName || '',
        plateNumber: response.plateNumber || TEST_PLATE_NUMBER,
        organizationName: response.organizationName || '',
        isActive: isActive,
      });
      
    } catch (error) {
      console.error('Error in handleVideoEnd:', error);
      toast.error('Ошибка при проверке номера');
    } finally {
      setProcessing(false);
    }
  };

  const handlePlayAgain = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setVideoEnded(false);
    }
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

  return (
    <div className={styles.container}>
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
      
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>Обзорная панель охраны</h1>
            <p className={styles.subtitle}>
              Добро пожаловать, {user?.fullName || user?.username}
            </p>
          </div>
          <div className={styles.userInfo}>
            <button onClick={handleLogout} className={styles.logoutButton}>
              <i className="ri-logout-box-line"></i>
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.videoSection}>
            <div className={styles.videoCard}>
              <h2 className={styles.sectionTitle}>
                <i className="ri-camera-line"></i>
                Камера пропускного пункта
              </h2>
              
              <div className={styles.videoContainer}>
               <CameraPlayer />
                
                {videoEnded && (
                  <div className={styles.videoOverlay}>
                    <p className={styles.overlayText}>
                      {processing ? 'Обработка...' : 'Машина проехала'}
                    </p>
                    <button
                      onClick={handlePlayAgain}
                      className={styles.replayButton}
                      disabled={processing}
                    >
                      <i className="ri-repeat-line"></i>
                      Повторить заезд
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.videoInfo}>
                <div className={styles.infoRow}>
                  <i className="ri-information-line"></i>
                  <span> номер: <strong>{TEST_PLATE_NUMBER}</strong></span>
                </div>
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
                            {formatTime(log.timestamp.toISOString())}
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
                    Нажмите &quot;Повторить заезд&quot; для имитации
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
                  <strong>{new Date().toLocaleDateString('ru-RU')}</strong>
                </div>
                <div className={styles.infoItem}>
                  <span>Время:</span>
                  <strong>{new Date().toLocaleTimeString('ru-RU')}</strong>
                </div>
                <div className={styles.infoItem}>
                  <span>Режим:</span>
                  <strong className={styles.demoMode}>Демо</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}