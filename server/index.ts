import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { DatabaseManager } from './database/DatabaseManager.js';
import { RoomManager } from './managers/RoomManager.js';
import { AuthManager } from './managers/AuthManager.js';
import { WhiteboardManager } from './managers/WhiteboardManager.js';
import type { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InterServerEvents, 
  SocketData 
} from './types/socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  cors: {
    origin: [
      'https://collaborative-whiteboard-with-real-three.vercel.app',
      'https://collaborative-whiteboard-with-real-rho.vercel.app',
      'https://collaborative-whiteboard-with-real-time-6jj8.onrender.com',
      'https://collaborative-whiteboard-with-real-time-8zp4.onrender.com',
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
app.use(cors({
  origin: [
    'https://collaborative-whiteboard-with-real-three.vercel.app',
    'https://collaborative-whiteboard-with-real-rho.vercel.app',
    'https://collaborative-whiteboard-with-real-time-6jj8.onrender.com',
    'https://collaborative-whiteboard-with-real-time-8zp4.onrender.com',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${req.headers.origin || 'no origin'}`);
  next();
});
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

if (process.env.NODE_ENV === 'production') {
  // On Render, the dist folder is in the project root
  const staticPath = path.join(__dirname, '../../dist');
  console.log('Serving static files from:', staticPath);
  app.use(express.static(staticPath));
}
const dbManager = new DatabaseManager();
const authManager = new AuthManager();
const roomManager = new RoomManager(dbManager);
const whiteboardManager = new WhiteboardManager(dbManager);
await dbManager.initialize();
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', async (data, callback) => {
    try {
      const { roomId, password, userName } = data;
      
      const room = await roomManager.getRoom(roomId);
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      if (room.isPrivate && room.password !== password) {
        callback({ success: false, error: 'Invalid password' });
        return;
      }
      const user = await authManager.createOrGetUser(socket.id, userName);
      socket.join(roomId);
      await roomManager.addUserToRoom(roomId, user);
      socket.data.roomId = roomId;
      socket.data.userId = user.id;
      const elements = await whiteboardManager.getRoomElements(roomId);

      callback({ 
        success: true, 
        room,
        user,
        elements 
      });

      socket.to(roomId).emit('user-joined', user);

      const roomUsers = await roomManager.getRoomUsers(roomId);
      io.to(roomId).emit('room-users-updated', roomUsers);

    } catch (error) {
      console.error('Error joining room:', error);
      callback({ success: false, error: 'Failed to join room' });
    }
  });

  socket.on('leave-room', async () => {
    const { roomId, userId } = socket.data;
    if (roomId && userId) {
      await handleUserLeave(socket, roomId, userId);
    }
  });

  socket.on('drawing-start', async (data) => {
    const { roomId, userId } = socket.data;
    if (!roomId || !userId) return;
    await whiteboardManager.addElement(roomId, data.element);
    socket.to(roomId).emit('drawing-start', { element: data.element, userId });
  });

  socket.on('drawing-update', async (data) => {
    const { roomId, userId } = socket.data;
    if (!roomId || !userId) return;
    await whiteboardManager.updateElement(roomId, data.element);
    socket.to(roomId).emit('drawing-update', { element: data.element, userId });
  });

  socket.on('drawing-end', async (data) => {
    const { roomId, userId } = socket.data;
    if (!roomId || !userId) return;
    await whiteboardManager.updateElement(roomId, data.element);
    socket.to(roomId).emit('drawing-end', { element: data.element, userId });
  });

  socket.on('text-added', async (data) => {
    const { roomId, userId } = socket.data;
    if (!roomId || !userId) return;
    await whiteboardManager.addElement(roomId, data.element);
    socket.to(roomId).emit('text-added', { element: data.element, userId });
  });
  socket.on('clear-canvas', async () => {
    const { roomId } = socket.data;
    if (!roomId) return;
    await whiteboardManager.clearRoom(roomId);
    socket.to(roomId).emit('canvas-cleared');
  });
  socket.on('cursor-move', (data) => {
    const { roomId, userId } = socket.data;
    if (!roomId || !userId) return;
    socket.to(roomId).emit('cursor-moved', {
      userId,
      position: data.position
    });
  });
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.id}`);
    const { roomId, userId } = socket.data;
    if (roomId && userId) {
      await handleUserLeave(socket, roomId, userId);
    }
  });
});
async function handleUserLeave(socket: any, roomId: string, userId: string) {
  try {
    await roomManager.removeUserFromRoom(roomId, userId);
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', userId);
    const roomUsers = await roomManager.getRoomUsers(roomId);
    socket.to(roomId).emit('room-users-updated', roomUsers);
  } catch (error) {
    console.error('Error handling user leave:', error);
  }
}

app.post('/api/rooms', async (req, res) => {
  try {
    console.log('Creating room with data:', req.body);
    const { name, isPrivate, password, permissions } = req.body;
    
    if (!name) {
      console.error('Room name is required');
      return res.status(400).json({ success: false, error: 'Room name is required' });
    }
    
    const room = await roomManager.createRoom({
      name,
      isPrivate: isPrivate || false,
      password: isPrivate ? password : undefined,
      permissions: permissions || 'edit'
    });
    
    console.log('Room created successfully:', room);
    res.json({ success: true, room });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, error: 'Failed to create room: ' + error.message });
  }
});

app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await roomManager.getRoom(roomId);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }
    res.json({ success: true, room });
  } catch (error) {
    console.error('Error getting room:', error);
    res.status(500).json({ success: false, error: 'Failed to get room' });
  }
});
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../../dist/index.html');
    console.log('Serving index.html from:', indexPath);
    res.sendFile(indexPath);
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
