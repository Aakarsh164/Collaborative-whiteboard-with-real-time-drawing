export interface Point {
  x: number;
  y: number;
}

export interface DrawingPath {
  id: string;
  tool: Tool;
  points: Point[];
  color: string;
  strokeWidth: number;
  timestamp: number;
}

export interface Shape {
  id: string;
  type: 'rectangle' | 'circle';
  startPoint: Point;
  endPoint: Point;
  color: string;
  strokeWidth: number;
  filled: boolean;
  timestamp: number;
}

export interface TextElement {
  id: string;
  position: Point;
  text: string;
  color: string;
  fontSize: number;
  timestamp: number;
}

export type DrawingElement = DrawingPath | Shape | TextElement;

export type Tool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text' | 'select';

export interface Room {
  id: string;
  name: string;
  isPrivate: boolean;
  password?: string;
  permissions: 'edit' | 'view';
  createdAt: number;
  users: User[];
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: Point;
  socketId?: string;
}

export interface CreateRoomData {
  name: string;
  isPrivate: boolean;
  password?: string;
  permissions: 'edit' | 'view';
}