import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import type { User } from '@shared/schema';

interface SocketMessage {
  type: string;
  data?: any;
  conversationId?: string;
  userId?: string;
}

export function useSocket(conversationId?: string) {
  const { user, isAuthenticated } = useAuth() as { user: User | null; isAuthenticated: boolean };
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageHandlers = useRef<Map<string, (data: any) => void>>(new Map());

  const connect = useCallback(() => {
    if (!isAuthenticated || !user || ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Join conversation if specified
      if (conversationId && user && user.id) {
        ws.current?.send(JSON.stringify({
          type: 'join_conversation',
          conversationId,
          userId: user.id,
        }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message: SocketMessage = JSON.parse(event.data);
        const handler = messageHandlers.current.get(message.type);
        if (handler) {
          handler(message.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [isAuthenticated, user, conversationId]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendMessage = useCallback((message: SocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const on = useCallback((eventType: string, handler: (data: any) => void) => {
    messageHandlers.current.set(eventType, handler);
  }, []);

  const off = useCallback((eventType: string) => {
    messageHandlers.current.delete(eventType);
  }, []);

  const startTyping = useCallback(() => {
    if (conversationId && user && user.id) {
      sendMessage({
        type: 'typing_start',
        conversationId,
        userId: user.id,
      });
    }
  }, [conversationId, user, sendMessage]);

  const stopTyping = useCallback(() => {
    if (conversationId && user && user.id) {
      sendMessage({
        type: 'typing_stop',
        conversationId,
        userId: user.id,
      });
    }
  }, [conversationId, user, sendMessage]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  // Join conversation when conversationId changes
  useEffect(() => {
    if (isConnected && conversationId && user && user.id) {
      sendMessage({
        type: 'join_conversation',
        conversationId,
        userId: user.id,
      });
    }
  }, [isConnected, conversationId, user, sendMessage]);

  return {
    isConnected,
    sendMessage,
    on,
    off,
    startTyping,
    stopTyping,
  };
}
