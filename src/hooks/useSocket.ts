import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { 
  ServerToClientEvents, 
  ClientToServerEvents,
  JoinRoomResponse 
} from '../../server/types/socket';
import type { DrawingElement, User, Point } from '../types/whiteboard';

export const useSocket = () => {
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [cursors, setCursors] = useState<Map<string, Point>>(new Map());
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {

    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const socketUrl = isProduction 
      ? 'https://collaborative-whiteboard-with-real-time-8zp4.onrender.com'
      : 'http://localhost:3001';
      
    console.log('Connecting to:', socketUrl);
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    socket.on('user-joined', (user) => {
      console.log('User joined:', user);
    });

    socket.on('user-left', (userId) => {
      console.log('User left:', userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(userId);
        return newCursors;
      });
    });

    socket.on('room-users-updated', (roomUsers) => {
      setUsers(roomUsers);
    });

    socket.on('cursor-moved', ({ userId, position }) => {
      setCursors(prev => new Map(prev).set(userId, position));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = (roomId: string, userName: string, password?: string): Promise<JoinRoomResponse> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      socketRef.current.emit('join-room', { roomId, userName, password }, (response) => {
        resolve(response);
      });
    });
  };

  const leaveRoom = () => {
    socketRef.current?.emit('leave-room');
  };

  const emitDrawingStart = (element: DrawingElement) => {
    socketRef.current?.emit('drawing-start', { element });
  };

  const emitDrawingUpdate = (element: DrawingElement) => {
    socketRef.current?.emit('drawing-update', { element });
  };

  const emitDrawingEnd = (element: DrawingElement) => {
    socketRef.current?.emit('drawing-end', { element });
  };

  const emitTextAdded = (element: DrawingElement) => {
    socketRef.current?.emit('text-added', { element });
  };

  const emitClearCanvas = () => {
    socketRef.current?.emit('clear-canvas');
  };

  const emitCursorMove = (position: Point) => {
    socketRef.current?.emit('cursor-move', { position });
  };

  const onDrawingStart = (callback: (data: { element: DrawingElement; userId: string }) => void) => {
    socketRef.current?.on('drawing-start', callback);
    return () => socketRef.current?.off('drawing-start', callback);
  };

  const onDrawingUpdate = (callback: (data: { element: DrawingElement; userId: string }) => void) => {
    socketRef.current?.on('drawing-update', callback);
    return () => socketRef.current?.off('drawing-update', callback);
  };

  const onDrawingEnd = (callback: (data: { element: DrawingElement; userId: string }) => void) => {
    socketRef.current?.on('drawing-end', callback);
    return () => socketRef.current?.off('drawing-end', callback);
  };

  const onTextAdded = (callback: (data: { element: DrawingElement; userId: string }) => void) => {
    socketRef.current?.on('text-added', callback);
    return () => socketRef.current?.off('text-added', callback);
  };

  const onCanvasCleared = (callback: () => void) => {
    socketRef.current?.on('canvas-cleared', callback);
    return () => socketRef.current?.off('canvas-cleared', callback);
  };

  return {
    connected,
    users,
    cursors,
    joinRoom,
    leaveRoom,
    emitDrawingStart,
    emitDrawingUpdate,
    emitDrawingEnd,
    emitTextAdded,
    emitClearCanvas,
    emitCursorMove,
    onDrawingStart,
    onDrawingUpdate,
    onDrawingEnd,
    onTextAdded,
    onCanvasCleared,
  };
};
