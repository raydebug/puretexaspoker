import express, { Express } from 'express';
import cors from 'cors';
import authRoutes from '../../routes/auth';
import tableRoutes from '../../routes/tables';
import playerRoutes from '../../routes/players';
import chatRoutes from '../../routes/chat';
import errorRoutes from '../../routes/errorRoutes';
// import testRoutes from '../../routes/testRoutes'; // Temporarily disabled due to TypeScript errors

export function createTestApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/tables', tableRoutes);  
  app.use('/api/players', playerRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api', errorRoutes);
  // app.use('/api/test', testRoutes); // Temporarily disabled due to TypeScript errors

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Test app error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  });

  return app;
}