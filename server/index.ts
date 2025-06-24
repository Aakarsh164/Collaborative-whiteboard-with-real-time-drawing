import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseManager } from './database/DatabaseManager.js';
import { RoomManager } from './managers/RoomManager.js';
import { WhiteboardManager } from './managers/WhiteboardManager.js';
import { AuthManager } from './managers/AuthManager.js';
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
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://collaborative-whiteboard-with-real-three.vercel.app']
      : ['http://localhost:5173'],
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://collaborative-whiteboard-with-real-three.vercel.app', 'http://localhost:5173']
    : ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${req.headers.origin || 'no origin'}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve static files from the React app build
if (process.env.NODE_ENV === 'production') {
  // On Render, the dist folder is in the project root
  const staticPath = path.join(__dirname, '../../dist');
  console.log('Serving static files from:', staticPath);
  app.use(express.static(staticPath));
}

// Initialize managers
const dbManager = new DatabaseManager();
const authManager = new AuthManager();
const roomManager = new RoomManager(dbManager);
const whiteboardManager = new WhiteboardManager(dbManager);

// Initialize database
await dbManager.initialize();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join room
  socket.on('join-room', async (data, callback) => {
    try {
      const { roomId, password, userName } = data;
      
      // Validate room access
      const room = await roomManager.getRoom(roomId);
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      if (room.isPrivate && room.password !== password) {
        callback({ success: false, error: 'Invalid password' });
        return;
      }

      // Create or get user
      const user = await authManager.createOrGetUser(socket.id, userName);
      
      // Join room
      socket.join(roomId);
      await roomManager.addUserToRoom(roomId, user);

      // Store room and user info in socket data
      socket.data.roomId = roomId;
      socket.data.userId = user.id;

      // Get current whiteboard state
      const elements = await whiteboardManager.getRoomElements(roomId);

      // Notify user of successful join
      callback({ 
        success: true, 
        room,
        user,
        elements 
      });

      // Notify other users in room
      socket.to(roomId).emit('user-joined', user);

      // Send updated user list to all users in room
      const roomUsers = await roomManager.getRoomUsers(roomId);
      io.to(roomId).emit('room-users-updated', roomUsers);

    } catch (error) {
      console.error('Error joining room:', error);
      callback({ success: false, error: 'Failed to join room' });
    }
  });

  // Leave room
  socket.on('leave-room', async () => {
    const { roomId, userId } = socket.data;
    if (roomId && userId) {
      await handleUserLeave(socket, roomId, userId);
    }
  });

  // Drawing events
  socket.on('drawing-start', async (data) => {
    const { roomId, userId } = socket.data;
    if (!roomId || !userId) return;

    // Save to database
    await whiteboardManager.addElement(roomId, data.element);
    
    // Broadcast to other users
    socket.to(roomId).emit('drawing-start', { element: data.element, userId });
  });

  socket.on('drawing-update', async (data) => {
    const { roomId, userId } = socket.data;
    if (!roomId || !userId) return;

    // Update in database
    await whiteboardManager.updateElement(roomId, data.element);
    
    // Broadcast to other users
    socket.to(roomId).emit('drawing-update', { element: data.element, userId });
  });

  socket.on('drawing-end', async (data) => {
    const { roomId, userId } = socket.data;
    if (!roomId || !userId) return;

    // Final update in database
    await whiteboardManager.updateElement(roomId, data.element);
    
    // Broadcast to other users
    socket.to(roomId).emit('drawing-end', { element: data.element, userId });
  });

  // Text addition
  socket.on('text-added', async (data) => {
    const { roomId, userId } = socket.data;
    if (!roomId || !userId) return;

    // Save to database
    await whiteboardManager.addElement(roomId, data.element);
    
    // Broadcast to other users
    socket.to(roomId).emit('text-added', { element: data.element, userId });
  });

  // Clear canvas
  socket.on('clear-canvas', async () => {
    const { roomId } = socket.data;
    if (!roomId) return;

    // Clear from database
    await whiteboardManager.clearRoom(roomId);
    
    // Broadcast to other users
    socket.to(roomId).emit('canvas-cleared');
  });

  // Cursor movement
  socket.on('cursor-move', (data) => {
    const { roomId, userId } = socket.data;
    if (!roomId || !userId) return;

    // Broadcast cursor position to other users
    socket.to(roomId).emit('cursor-moved', {
      userId,
      position: data.position
    });
  });

  // Disconnect handling
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.id}`);
    const { roomId, userId } = socket.data;
    if (roomId && userId) {
      await handleUserLeave(socket, roomId, userId);
    }
  });
});

// Helper function to handle user leaving
async function handleUserLeave(socket: any, roomId: string, userId: string) {
  try {
    // Remove user from room
    await roomManager.removeUserFromRoom(roomId, userId);
    
    // Leave socket room
    socket.leave(roomId);
    
    // Notify other users
    socket.to(roomId).emit('user-left', userId);
    
    // Send updated user list
    const roomUsers = await roomManager.getRoomUsers(roomId);
    socket.to(roomId).emit('room-users-updated', roomUsers);
    
  } catch (error) {
    console.error('Error handling user leave:', error);
  }
}

// REST API endpoints
app.post('/api/rooms', async (req, res) => {
  try {
    const { name, isPrivate, password, permissions } = req.body;
    const room = await roomManager.createRoom({
      name,
      isPrivate: isPrivate || false,
      password: isPrivate ? password : undefined,
      permissions: permissions || 'edit'
    });
    res.json({ success: true, room });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, error: 'Failed to create room' });
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

// Catch all handler: send back React's index.html file for any non-API routes
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