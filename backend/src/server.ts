import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import testRoutes from './routes/test';
import authRoutes from './routes/auth';
import playerRoutes from './routes/players';
import tableRoutes from './routes/tables';
import chatRoutes from './routes/chat';
import gameRoutes from './routes/games';
import { registerSeatHandlers } from './socketHandlers/seatHandler';
import { registerGameHandlers } from './socketHandlers/gameHandler';
import { setupLobbyHandlers } from './events/lobbyHandlers';
import { prisma } from './db';
import { tableManager } from './services/TableManager';

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
          smallBlind: 5,
          bigBlind: 10,
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

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/test', testRoutes);
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

// Socket handlers
registerSeatHandlers(io);
registerGameHandlers(io);

// Register lobby handlers for each connection
io.on('connection', (socket) => {
  console.log('Client connected to game handler:', socket.id);
  setupLobbyHandlers(io, socket);
  
  socket.on('disconnect', () => {
    console.log('Game client disconnected:', socket.id);
  });
});

// Initialize default tables and start server
createDefaultTables().then(() => {
  httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch(error => {
  console.error('Failed to initialize server:', error);
  process.exit(1);
});
