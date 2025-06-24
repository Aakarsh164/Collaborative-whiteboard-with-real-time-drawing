import type { DrawingElement, Room, User, Point } from './whiteboard.js';

export interface ServerToClientEvents {
  'user-joined': (user: User) => void;
  'user-left': (userId: string) => void;
  'room-users-updated': (users: User[]) => void;
  'drawing-start': (data: { element: DrawingElement; userId: string }) => void;
  'drawing-update': (data: { element: DrawingElement; userId: string }) => void;
  'drawing-end': (data: { element: DrawingElement; userId: string }) => void;
  'text-added': (data: { element: DrawingElement; userId: string }) => void;
  'canvas-cleared': () => void;
  'cursor-moved': (data: { userId: string; position: Point }) => void;
}

export interface ClientToServerEvents {
  'join-room': (
    data: { roomId: string; password?: string; userName: string },
    callback: (response: JoinRoomResponse) => void
  ) => void;
  'leave-room': () => void;
  'drawing-start': (data: { element: DrawingElement }) => void;
  'drawing-update': (data: { element: DrawingElement }) => void;
  'drawing-end': (data: { element: DrawingElement }) => void;
  'text-added': (data: { element: DrawingElement }) => void;
  'clear-canvas': () => void;
  'cursor-move': (data: { position: Point }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  roomId?: string;
  userId?: string;
}

export interface JoinRoomResponse {
  success: boolean;
  error?: string;
  room?: Room;
  user?: User;
  elements?: DrawingElement[];
}