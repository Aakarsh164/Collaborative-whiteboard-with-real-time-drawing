import type { DatabaseManager } from '../database/DatabaseManager.js';
import type { User } from '../types/whiteboard.js';

export class AuthManager {
  constructor() {}

  async createOrGetUser(socketId: string, name: string): Promise<User> {
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    return {
      id: userId,
      name,
      color,
      socketId
    };
  }

  async getUserBySocketId(socketId: string): Promise<User | null> {
    return null;
  }
}
