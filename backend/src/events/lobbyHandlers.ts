import { Server, Socket } from 'socket.io';
import { tableManager, TableData } from '../services/TableManager';

interface ClientToServerEvents {
  getLobbyTables: () => void;
  joinTable: (data: { tableId: number; buyIn: number }) => void;
  leaveTable: (data: { tableId: number }) => void;
  sitDown: (data: { tableId: number; buyIn: number }) => void;
  standUp: (data: { tableId: number }) => void;
}

interface ServerToClientEvents {
  tablesUpdate: (tables: TableData[]) => void;
  tableJoined: (data: { tableId: number; role: 'player' | 'observer'; buyIn: number }) => void;
  tableError: (error: string) => void;
}

export const setupLobbyHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) => {
  // Broadcast table updates to all connected clients
  const broadcastTables = () => {
    io.emit('tablesUpdate', tableManager.getAllTables());
  };

  // Handle initial table list request
  socket.on('getLobbyTables', () => {
    socket.emit('tablesUpdate', tableManager.getAllTables());
  });

  // Handle table join request
  socket.on('joinTable', ({ tableId, buyIn }) => {
    const result = tableManager.joinTable(
      tableId,
      socket.id,
      socket.data.nickname || `Player${socket.id.slice(0, 4)}`
    );

    if (result.success) {
      socket.join(`table:${tableId}`);
      socket.data.buyIn = buyIn; // Store buyIn for later use when sitting down
      socket.emit('tableJoined', { tableId, role: 'observer', buyIn });
      broadcastTables();
    } else {
      socket.emit('tableError', result.error || 'Failed to join table');
    }
  });

  // Handle table leave request
  socket.on('leaveTable', ({ tableId }) => {
    if (tableManager.leaveTable(tableId, socket.id)) {
      socket.leave(`table:${tableId}`);
      broadcastTables();
    }
  });

  // Handle sit down request
  socket.on('sitDown', ({ tableId, buyIn }) => {
    const result = tableManager.sitDown(tableId, socket.id, buyIn);

    if (result.success) {
      socket.emit('tableJoined', { tableId, role: 'player', buyIn });
      broadcastTables();
    } else {
      socket.emit('tableError', result.error || 'Failed to sit down');
    }
  });

  // Handle stand up request
  socket.on('standUp', ({ tableId }) => {
    if (tableManager.standUp(tableId, socket.id)) {
      socket.emit('tableJoined', { tableId, role: 'observer', buyIn: 0 });
      broadcastTables();
    }
  });

  // Clean up when socket disconnects
  socket.on('disconnect', () => {
    // Find and leave all tables
    for (const table of tableManager.getAllTables()) {
      if (tableManager.leaveTable(table.id, socket.id)) {
        broadcastTables();
      }
    }
  });
}; 