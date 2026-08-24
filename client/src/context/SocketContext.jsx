import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    // Connect to backend socket
    const socketClient = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketClient.on('connect', () => {
      console.log('⚡ [WebSocket Connected] Live sync active');
      setIsConnected(true);
    });

    socketClient.on('disconnect', () => {
      console.log('❌ [WebSocket Disconnected]');
      setIsConnected(false);
    });

    setSocket(socketClient);

    return () => {
      socketClient.disconnect();
    };
  }, []);

  // Join user room whenever user changes
  useEffect(() => {
    if (socket && user?.id) {
      socket.emit('join_user_room', user.id);
    }
  }, [socket, user?.id]);

  const subscribeToResource = (resourceId) => {
    if (socket && resourceId) {
      socket.emit('join_resource_room', resourceId);
    }
  };

  const addLiveEvent = (event) => {
    setLiveEvents((prev) => [
      { id: Date.now(), ...event, timestamp: new Date().toLocaleTimeString() },
      ...prev.slice(0, 19),
    ]);
  };

  const value = {
    socket,
    isConnected,
    liveEvents,
    addLiveEvent,
    subscribeToResource,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
