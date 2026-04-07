// hooks/useWebSocket.ts
import { useEffect, useState, useRef } from 'react';

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

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 WebSocket message:', data);
        setLastMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Попытка переподключения через 3 секунды
      setTimeout(() => {
        console.log('Attempting to reconnect...');
        // Рекурсивно вызываем useEffect
      }, 3000);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return { isConnected, lastMessage };
};