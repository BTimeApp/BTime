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
  const socketRef = useRef<Socket>(null);

  useEffect(() => {
    if (!socketRef.current) {
        socketRef.current = getSocket();
    }
    const socket = socketRef.current;

    if (!socket.connected) {
      socket.connect();
      console.log("Socket Provider: ", socket);
    }
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};
