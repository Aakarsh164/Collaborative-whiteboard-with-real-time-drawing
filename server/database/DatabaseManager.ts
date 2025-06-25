import { Pool, PoolClient } from 'pg';
import type { Room, User, DrawingElement, CreateRoomData } from '../types/whiteboard.js';

export class DatabaseManager {
  private pool: Pool | null = null;
  private db: any = null; // SQLite database for fallback

  async initialize() {
    // Use PostgreSQL if DATABASE_URL is available (Render), otherwise fallback to SQLite
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      console.log('Connected to PostgreSQL database');
      await this.createTables();
    } else {
      console.log('No DATABASE_URL found, using in-memory SQLite for development');
      // Fallback to SQLite for local development
      const sqlite3 = await import('sqlite3');
      const { promisify } = await import('util');
      
      this.db = new sqlite3.Database(':memory:', (err: any) => {
        if (err) {
          console.error('SQLite connection error:', err);
          return;
        }
        console.log('Connected to SQLite database (development)');
        this.createTables().catch(console.error);
      });
    }
  }

  private async createTables() {
    if (this.pool) {
      // PostgreSQL tables
      const client = await this.pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            isPrivate BOOLEAN NOT NULL DEFAULT FALSE,
            password TEXT,
            permissions TEXT NOT NULL DEFAULT 'edit',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            socket_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS room_users (
            room_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (room_id, user_id),
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS whiteboard_elements (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            element_data JSONB NOT NULL,
            timestamp BIGINT NOT NULL,
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
          )
        `);

        console.log('PostgreSQL tables created');
      } finally {
        client.release();
      }
    } else if (this.db) {
      // SQLite tables (fallback)
      const { promisify } = await import('util');
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
      
      console.log('SQLite tables created');
    }
  }

  async createRoom(data: CreateRoomData): Promise<Room> {
    if (!this.pool && !this.db) throw new Error('Database not initialized');

    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        await client.query(
          `INSERT INTO rooms (id, name, isPrivate, password, permissions) 
           VALUES ($1, $2, $3, $4, $5)`,
          [roomId, data.name, data.isPrivate, data.password, data.permissions]
        );
      } finally {
        client.release();
      }
    } else {
      // SQLite
      const { promisify } = await import('util');
      const run = promisify(this.db.run.bind(this.db));
      await run(
        `INSERT INTO rooms (id, name, isPrivate, password, permissions, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [roomId, data.name, data.isPrivate ? 1 : 0, data.password, data.permissions, Date.now()]
      );
    }

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
    if (!this.pool && !this.db) throw new Error('Database not initialized');

    if (this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        const roomResult = await client.query(
          'SELECT * FROM rooms WHERE id = $1',
          [roomId]
        );

        if (roomResult.rows.length === 0) return null;

        const room = roomResult.rows[0];
        const usersResult = await client.query(`
          SELECT u.* FROM users u
          JOIN room_users ru ON u.id = ru.user_id
          WHERE ru.room_id = $1
        `, [roomId]);

        return {
          id: room.id,
          name: room.name,
          isPrivate: room.isprivate,
          password: room.password,
          permissions: room.permissions,
          createdAt: new Date(room.created_at).getTime(),
          users: usersResult.rows.map(u => ({
            id: u.id,
            name: u.name,
            color: u.color,
            socketId: u.socket_id
          }))
        };
      } finally {
        client.release();
      }
    } else {
      // SQLite
      const { promisify } = await import('util');
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
  }

  async createUser(socketId: string, name: string): Promise<User> {
    if (!this.pool && !this.db) throw new Error('Database not initialized');

    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    if (this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        await client.query(
          `INSERT INTO users (id, name, color, socket_id) 
           VALUES ($1, $2, $3, $4)`,
          [userId, name, color, socketId]
        );
      } finally {
        client.release();
      }
    } else {
      // SQLite
      const { promisify } = await import('util');
      const run = promisify(this.db.run.bind(this.db));
      await run(
        `INSERT INTO users (id, name, color, socketId, createdAt) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, name, color, socketId, Date.now()]
      );
    }

    return {
      id: userId,
      name,
      color,
      socketId
    };
  }

  async getUser(userId: string): Promise<User | null> {
    if (!this.pool && !this.db) throw new Error('Database not initialized');

    if (this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM users WHERE id = $1',
          [userId]
        );

        if (result.rows.length === 0) return null;

        const user = result.rows[0];
        return {
          id: user.id,
          name: user.name,
          color: user.color,
          socketId: user.socket_id
        };
      } finally {
        client.release();
      }
    } else {
      // SQLite
      const { promisify } = await import('util');
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
  }

  async updateUserSocketId(userId: string, socketId: string): Promise<void> {
    if (!this.pool && !this.db) throw new Error('Database not initialized');

    if (this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        await client.query(
          'UPDATE users SET socket_id = $1 WHERE id = $2',
          [socketId, userId]
        );
      } finally {
        client.release();
      }
    } else {
      // SQLite
      const { promisify } = await import('util');
      const run = promisify(this.db.run.bind(this.db));
      await run('UPDATE users SET socketId = ? WHERE id = ?', [socketId, userId]);
    }
  }

  async addUserToRoom(roomId: string, userId: string): Promise<void> {
    if (!this.pool && !this.db) throw new Error('Database not initialized');

    if (this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        await client.query(
          `INSERT INTO room_users (room_id, user_id) 
           VALUES ($1, $2) 
           ON CONFLICT (room_id, user_id) DO UPDATE SET joined_at = CURRENT_TIMESTAMP`,
          [roomId, userId]
        );
      } finally {
        client.release();
      }
    } else {
      // SQLite
      const { promisify } = await import('util');
      const run = promisify(this.db.run.bind(this.db));
      await run(
        `INSERT OR REPLACE INTO room_users (roomId, userId, joinedAt) 
         VALUES (?, ?, ?)`,
        [roomId, userId, Date.now()]
      );
    }
  }

  async removeUserFromRoom(roomId: string, userId: string): Promise<void> {
    if (!this.pool && !this.db) throw new Error('Database not initialized');

    if (this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        await client.query(
          'DELETE FROM room_users WHERE room_id = $1 AND user_id = $2',
          [roomId, userId]
        );
      } finally {
        client.release();
      }
    } else {
      // SQLite
      const { promisify } = await import('util');
      const run = promisify(this.db.run.bind(this.db));
      await run('DELETE FROM room_users WHERE roomId = ? AND userId = ?', [roomId, userId]);
    }
  }

  async getRoomUsers(roomId: string): Promise<User[]> {
    if (!this.pool && !this.db) throw new Error('Database not initialized');

    if (this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        const result = await client.query(`
          SELECT u.* FROM users u
          JOIN room_users ru ON u.id = ru.user_id
          WHERE ru.room_id = $1
        `, [roomId]);

        return result.rows.map(u => ({
          id: u.id,
          name: u.name,
          color: u.color,
          socketId: u.socket_id
        }));
      } finally {
        client.release();
      }
    } else {
      // SQLite
      const { promisify } = await import('util');
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
  }

  async saveElement(roomId: string, element: DrawingElement): Promise<void> {
    if (!this.pool && !this.db) throw new Error('Database not initialized');

    if (this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        await client.query(
          `INSERT INTO whiteboard_elements (id, room_id, element_data, timestamp) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (id) DO UPDATE SET element_data = $3, timestamp = $4`,
          [element.id, roomId, JSON.stringify(element), element.timestamp]
        );
      } finally {
        client.release();
      }
    } else {
      // SQLite
      const { promisify } = await import('util');
      const run = promisify(this.db.run.bind(this.db));
      await run(
        `INSERT OR REPLACE INTO whiteboard_elements (id, roomId, elementData, timestamp) 
         VALUES (?, ?, ?, ?)`,
        [element.id, roomId, JSON.stringify(element), element.timestamp]
      );
    }
  }

  async getRoomElements(roomId: string): Promise<DrawingElement[]> {
    if (!this.pool && !this.db) throw new Error('Database not initialized');

    if (this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        const result = await client.query(
          'SELECT element_data FROM whiteboard_elements WHERE room_id = $1 ORDER BY timestamp',
          [roomId]
        );

        return result.rows.map(e => JSON.parse(e.element_data));
      } finally {
        client.release();
      }
    } else {
      // SQLite
      const { promisify } = await import('util');
      const all = promisify(this.db.all.bind(this.db));
      const elements = await all(
        'SELECT elementData FROM whiteboard_elements WHERE roomId = ? ORDER BY timestamp',
        [roomId]
      ) as any[];

      return elements.map(e => JSON.parse(e.elementData));
    }
  }

  async clearRoomElements(roomId: string): Promise<void> {
    if (!this.pool && !this.db) throw new Error('Database not initialized');

    if (this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        await client.query('DELETE FROM whiteboard_elements WHERE room_id = $1', [roomId]);
      } finally {
        client.release();
      }
    } else {
      // SQLite
      const { promisify } = await import('util');
      const run = promisify(this.db.run.bind(this.db));
      await run('DELETE FROM whiteboard_elements WHERE roomId = ?', [roomId]);
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    } else if (this.db) {
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
}
