import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import type { Room, User, DrawingElement, CreateRoomData } from '../types/whiteboard.js';

export class DatabaseManager {
  private db: sqlite3.Database | null = null;

  async initialize() {
    return new Promise<void>((resolve, reject) => {
      // Use a persistent database file instead of in-memory
      const dbPath = process.env.NODE_ENV === 'production' 
        ? '/tmp/whiteboard.db'  // Render provides /tmp directory
        : './whiteboard.db';    // Local development
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('Connected to SQLite database at:', dbPath);
        this.createTables().then(resolve).catch(reject);
      });
    });
  }
  private async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db)); 
    await run(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        isPrivate INTEGER NOT NULL DEFAULT 0,
        password TEXT,
        permissions TEXT NOT NULL DEFAULT 'edit',
        createdAt INTEGER NOT NULL
      )
    `);
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        socketId TEXT,
        createdAt INTEGER NOT NULL
      )
    `);

 
    await run(`
      CREATE TABLE IF NOT EXISTS room_users (
        roomId TEXT NOT NULL,
        userId TEXT NOT NULL,
        joinedAt INTEGER NOT NULL,
        PRIMARY KEY (roomId, userId),
        FOREIGN KEY (roomId) REFERENCES rooms(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);
    await run(`
      CREATE TABLE IF NOT EXISTS whiteboard_elements (
        id TEXT PRIMARY KEY,
        roomId TEXT NOT NULL,
        elementData TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (roomId) REFERENCES rooms(id)
      )
    `);

    console.log('Database tables created');
  }

  async createRoom(data: CreateRoomData): Promise<Room> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await run(
      `INSERT INTO rooms (id, name, isPrivate, password, permissions, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [roomId, data.name, data.isPrivate ? 1 : 0, data.password, data.permissions, Date.now()]
    );

    return {
      id: roomId,
      name: data.name,
      isPrivate: data.isPrivate,
      password: data.password,
      permissions: data.permissions,
      createdAt: Date.now(),
      users: []
    };
  }

  async getRoom(roomId: string): Promise<Room | null> {
    if (!this.db) throw new Error('Database not initialized');

    const get = promisify(this.db.get.bind(this.db));
    const all = promisify(this.db.all.bind(this.db));

    const room = await get(
      'SELECT * FROM rooms WHERE id = ?',
      [roomId]
    ) as any;

    if (!room) return null;
    const users = await all(`
      SELECT u.* FROM users u
      JOIN room_users ru ON u.id = ru.userId
      WHERE ru.roomId = ?
    `, [roomId]) as any[];

    return {
      id: room.id,
      name: room.name,
      isPrivate: Boolean(room.isPrivate),
      password: room.password,
      permissions: room.permissions,
      createdAt: room.createdAt,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        color: u.color,
        socketId: u.socketId
      }))
    };
  }

  async createUser(socketId: string, name: string): Promise<User> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    await run(
      `INSERT INTO users (id, name, color, socketId, createdAt) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, name, color, socketId, Date.now()]
    );

    return {
      id: userId,
      name,
      color,
      socketId
    };
  }

  async getUser(userId: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    const get = promisify(this.db.get.bind(this.db));
    const user = await get('SELECT * FROM users WHERE id = ?', [userId]) as any;

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      color: user.color,
      socketId: user.socketId
    };
  }

  async updateUserSocketId(userId: string, socketId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    await run('UPDATE users SET socketId = ? WHERE id = ?', [socketId, userId]);
  }

  async addUserToRoom(roomId: string, userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    await run(
      `INSERT OR REPLACE INTO room_users (roomId, userId, joinedAt) 
       VALUES (?, ?, ?)`,
      [roomId, userId, Date.now()]
    );
  }

  async removeUserFromRoom(roomId: string, userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    await run('DELETE FROM room_users WHERE roomId = ? AND userId = ?', [roomId, userId]);
  }

  async getRoomUsers(roomId: string): Promise<User[]> {
    if (!this.db) throw new Error('Database not initialized');

    const all = promisify(this.db.all.bind(this.db));
    const users = await all(`
      SELECT u.* FROM users u
      JOIN room_users ru ON u.id = ru.userId
      WHERE ru.roomId = ?
    `, [roomId]) as any[];

    return users.map(u => ({
      id: u.id,
      name: u.name,
      color: u.color,
      socketId: u.socketId
    }));
  }

  async saveElement(roomId: string, element: DrawingElement): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    await run(
      `INSERT OR REPLACE INTO whiteboard_elements (id, roomId, elementData, timestamp) 
       VALUES (?, ?, ?, ?)`,
      [element.id, roomId, JSON.stringify(element), element.timestamp]
    );
  }

  async getRoomElements(roomId: string): Promise<DrawingElement[]> {
    if (!this.db) throw new Error('Database not initialized');

    const all = promisify(this.db.all.bind(this.db));
    const elements = await all(
      'SELECT elementData FROM whiteboard_elements WHERE roomId = ? ORDER BY timestamp',
      [roomId]
    ) as any[];

    return elements.map(e => JSON.parse(e.elementData));
  }

  async clearRoomElements(roomId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    await run('DELETE FROM whiteboard_elements WHERE roomId = ?', [roomId]);
  }

  async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('Database connection closed');
        resolve();
      });
    });
  }
}
