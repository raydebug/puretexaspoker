import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { registerConsolidatedHandlers } from './socketHandlers/consolidatedHandler';
import { errorHandler } from './middleware/errorHandler';
import errorRoutes from './routes/errorRoutes';
import cardOrderRoutes from './routes/cardOrders';
import testRoutes from './routes/testRoutes';

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

// Serve static files from public directory for testing tools
app.use(express.static('public'));

// Routes
app.use('/api/errors', errorRoutes);
app.use('/api/card-orders', cardOrderRoutes);
app.use('/api', testRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Poker Game API' });
});

// Test route for connection check
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Use consolidated WebSocket handler (single entry point, gameManager as source of truth)
registerConsolidatedHandlers(io);

// Standardized error handling middleware
app.use(errorHandler);

export { app, httpServer, io };
