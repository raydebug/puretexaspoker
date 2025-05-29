import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import testRoutes from './routes/test';
import playerRoutes from './routes/players';
import tableRoutes from './routes/tables';
import chatRoutes from './routes/chat';
import gameRoutes from './routes/games';
import { registerSeatHandlers } from './socketHandlers/seatHandler';
import { registerGameHandlers } from './socketHandlers/gameHandler';

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
app.use('/api/players', playerRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/games', gameRoutes);

// Socket handlers
registerSeatHandlers(io);
registerGameHandlers(io);

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
