import type { DatabaseManager } from '../database/DatabaseManager.js';
import type { Room, User, CreateRoomData } from '../types/whiteboard.js';

export class RoomManager {
  constructor(private db: DatabaseManager) {}

  async createRoom(data: CreateRoomData): Promise<Room> {
    return await this.db.createRoom(data);
  }

  async getRoom(roomId: string): Promise<Room | null> {
    return await this.db.getRoom(roomId);
  }

  async addUserToRoom(roomId: string, user: User): Promise<void> {
    await this.db.addUserToRoom(roomId, user.id);
  }

  async removeUserFromRoom(roomId: string, userId: string): Promise<void> {
    await this.db.removeUserFromRoom(roomId, userId);
  }

  async getRoomUsers(roomId: string): Promise<User[]> {
    return await this.db.getRoomUsers(roomId);
  }

  async validateRoomAccess(roomId: string, password?: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;
    
    if (room.isPrivate && room.password !== password) {
      return false;
    }
    
    return true;
  }
}