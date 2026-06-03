import { io, Socket } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_BASE, {
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
