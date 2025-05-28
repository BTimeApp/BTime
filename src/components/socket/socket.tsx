"use client";
import { io, Socket } from "socket.io-client";
import React, { createContext, useContext, useEffect, useRef } from 'react';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io();
  }
  return socket;
};

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    if (!socketRef.current.connected) {
        socketRef.current.connect();
    }
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};
