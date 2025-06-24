import type { DatabaseManager } from '../database/DatabaseManager.js';
import type { DrawingElement } from '../types/whiteboard.js';

export class WhiteboardManager {
  constructor(private db: DatabaseManager) {}

  async addElement(roomId: string, element: DrawingElement): Promise<void> {
    await this.db.saveElement(roomId, element);
  }

  async updateElement(roomId: string, element: DrawingElement): Promise<void> {
    await this.db.saveElement(roomId, element);
  }

  async getRoomElements(roomId: string): Promise<DrawingElement[]> {
    return await this.db.getRoomElements(roomId);
  }

  async clearRoom(roomId: string): Promise<void> {
    await this.db.clearRoomElements(roomId);
  }
}