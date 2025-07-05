import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import testRoutes from './routes/test';
import testApiRoutes from './routes/testRoutes';
import authRoutes from './routes/auth';
import playerRoutes from './routes/players';
import tableRoutes from './routes/tables';
import chatRoutes from './routes/chat';
import gameRoutes from './routes/games';
import { registerConsolidatedHandlers } from './socketHandlers/consolidatedHandler';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './db';
import { tableManager } from './services/TableManager';
import { locationManager } from './services/LocationManager';
import { cleanupTestData } from './services/testService';
import { setup5PlayerTestCardOrder } from './routes/test';

// Use imported cleanupTestData from testService

// Create default tables for testing
async function createDefaultTables() {
  try {
    // Check if any tables exist
    const existingTables = await prisma.table.findMany();
    
    if (existingTables.length === 0) {
      console.log('Creating default tables for testing...');
      
      const defaultTables = [
        {
          name: 'Beginner Table 1',
          maxPlayers: 6,
          smallBlind: 1,
          bigBlind: 2,
          minBuyIn: 100,
          maxBuyIn: 1000
        },
        {
          name: 'Beginner Table 2',
          maxPlayers: 9,
          smallBlind: 10,
          bigBlind: 20,
          minBuyIn: 200,
          maxBuyIn: 2000
        },
        {
          name: 'High Stakes Table',
          maxPlayers: 6,
          smallBlind: 50,
          bigBlind: 100,
          minBuyIn: 1000,
          maxBuyIn: 10000
        }
      ];
      
      for (const tableData of defaultTables) {
        await prisma.table.create({ data: tableData });
      }
      
      console.log('Default tables created successfully!');
    }
  } catch (error) {
    console.error('Error creating default tables:', error);
  }
}

const app = express();
const port = process.env.PORT || 3001;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Make Socket.IO instance available globally for test APIs
(global as any).socketIO = io;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/test', testRoutes);
app.use('/api', testApiRoutes); // Test APIs with test_ prefix
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/games', gameRoutes);

// Add API routes
app.get('/api/lobby-tables', (req, res) => {
  try {
    const tables = tableManager.getAllTables();
    console.log('API: Returning', tables.length, 'tables from TableManager');
    res.json(tables);
  } catch (error) {
    console.error('Error getting tables:', error);
    res.status(500).json({ error: 'Failed to get tables' });
  }
});

// Use consolidated WebSocket handler (single entry point, gameManager as source of truth)
registerConsolidatedHandlers(io);

// Standardized error handling middleware
app.use(errorHandler);

// Initialize server with cleanup, tables, and location manager
async function initializeServer() {
  try {
    // Step 1: Clean up stale test data
    await cleanupTestData();
    
    // Step 2: Create default tables if needed
    await createDefaultTables();
    
    // Step 3: Initialize location manager
    await locationManager.initialize();
    
    // Step 4: Set up 5-player test card order
    setup5PlayerTestCardOrder();
    
    // Step 5: Start server
    httpServer.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log('Using consolidated WebSocket handler system');
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Start the server
initializeServer();
