import express from 'express';
import cors from 'cors';
import testRoutes from './routes/test';
import playerRoutes from './routes/players';
import tableRoutes from './routes/tables';
import chatRoutes from './routes/chat';
import gameRoutes from './routes/games';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/test', testRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/games', gameRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
