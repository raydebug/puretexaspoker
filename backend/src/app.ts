import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { registerSeatHandlers } from './socketHandlers/seatHandler';
import { setupLobbyHandlers } from './events/lobbyHandlers';
import errorRoutes from './routes/errorRoutes';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 30000,
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  maxHttpBufferSize: 1e8,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/errors', errorRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Poker Game API' });
});

// Test route for connection check
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Socket connections
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Common socket setup
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });
  
  // Register event handlers
  // registerSeatHandlers(io); // DISABLED: Legacy global seat handler conflicts with room-based system
  setupLobbyHandlers(io, socket);

  // Add a ping handler
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ message: 'An unexpected error occurred' });
});

export { app, httpServer, io };
