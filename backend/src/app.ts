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
  pingTimeout: 120000,
  pingInterval: 25000,
  connectTimeout: 60000,
  transports: ['polling'],
  allowUpgrades: false,
  maxHttpBufferSize: 1e8
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', errorRoutes);

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
  console.log(`New client connected: ${socket.id}`);
  
  // Register event handlers for this socket
  setupLobbyHandlers(io, socket);
  
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });

  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Register global seat handlers
registerSeatHandlers(io);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

export { app, httpServer };
