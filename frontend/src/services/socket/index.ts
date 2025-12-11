import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Lobby events
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('error', (error: Error) => {
  console.error('Socket error:', error);
});

// Table events
socket.on('tableJoined', (data: { tableId: number; role: 'player' | 'observer' }) => {
  console.log('Joined table:', data);
  // TODO: Handle navigation to table page
  window.location.href = `/table/${data.tableId}`;
});

socket.on('tableError', (error: string) => {
  console.error('Table error:', error);
  // TODO: Show error message to user
});

export default socket; 