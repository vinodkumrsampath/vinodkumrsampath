import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001';

export function useSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(WS_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  return socketRef.current;
}
