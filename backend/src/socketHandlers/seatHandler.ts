import { Server, Socket } from 'socket.io';
import { Player, GameState, Avatar } from '../types/shared';

interface SeatState {
  [seatNumber: number]: string | null; // nickname or null
}

const NUM_SEATS = 5;
let seats: SeatState = {};
let observers: string[] = [];
let players: Player[] = [];
let gameState: GameState = {
  id: 'game1',
  players: [],
  pot: 0,
  communityCards: [],
  currentPlayerId: null,
  currentPlayerPosition: 0,
  dealerPosition: 0,
  smallBlindPosition: 1,
  bigBlindPosition: 2,
  status: 'waiting',
  currentBet: 0,
  minBet: 10,
  smallBlind: 5,
  bigBlind: 10,
  phase: 'waiting',
  handEvaluation: undefined,
  winner: undefined,
  isHandComplete: false
};

for (let i = 0; i < NUM_SEATS; i++) seats[i] = null;

// Error tracking function
const trackError = (socket: Socket, error: Error, context: string) => {
  console.error(`[${new Date().toISOString()}] Socket Error in ${context}:`, {
    socketId: socket.id,
    error: error.message,
    stack: error.stack,
    context
  });
  // Here you can add integration with error tracking services like Sentry
};

// Helper function to broadcast game state
const broadcastGameState = (io: Server) => {
  gameState.players = players; // Ensure players array is synced
  io.emit('gameState', gameState);
};

// Helper function to generate a default avatar
const generateDefaultAvatar = (nickname: string): Avatar => {
  const getColorIndex = (name: string): number => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % AVATAR_COLORS.length;
  };
  const AVATAR_COLORS = [
    '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#16a085',
    '#27ae60', '#2980b9', '#8e44ad', '#f1c40f', '#e67e22',
    '#e74c3c', '#f39c12', '#d35400', '#c0392b', '#7f8c8d'
  ];
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  return {
    type: 'initials',
    initials: getInitials(nickname),
    color: AVATAR_COLORS[getColorIndex(nickname)]
  };
};

export function registerSeatHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    let playerSeat: number | null = null;

    socket.on('observer:join', ({ nickname }) => {
      try {
        if (!nickname) {
          throw new Error('Nickname is required');
        }
        if (!observers.includes(nickname)) {
          observers.push(nickname);
          io.emit('observer:joined', observers);
        }
      } catch (error) {
        trackError(socket, error as Error, 'observer:join');
        socket.emit('error', { message: 'Failed to join as observer' });
      }
    });

    socket.on('seat:request', ({ nickname, seatNumber }) => {
      try {
        // Validate input
        if (!nickname || seatNumber === undefined || seatNumber < 0 || seatNumber >= NUM_SEATS) {
          throw new Error('Invalid seat request parameters');
        }

        // Check if seat is available
        if (seats[seatNumber] === null) {
          // Create player object first
          const player: Player = {
            id: socket.id,
            name: nickname,
            seatNumber: seatNumber,
            position: seatNumber,
            chips: 1000,
            currentBet: 0,
            isDealer: false,
            isAway: false,
            isActive: true,
            cards: [],
            avatar: {
              type: 'initials',
              initials: nickname.substring(0, 2).toUpperCase(),
              color: '#1abc9c'
            }
          };

          // Remove from previous seat if any
          if (playerSeat !== null) {
            seats[playerSeat] = null;
            players = players.filter(p => p.id !== socket.id);
          }

          // Update seat state
          seats[seatNumber] = nickname;
          playerSeat = seatNumber;

          // Update players array
          const playerIndex = players.findIndex(p => p.id === socket.id);
          if (playerIndex === -1) {
            players.push(player);
          } else {
            players[playerIndex] = player;
          }

          // Update game state
          gameState.players = players;

          // Remove from observers only after successful seat assignment
          observers = observers.filter(obs => obs !== nickname);

          // Emit all updates in sequence
          socket.emit('seat:accepted', player);
          io.emit('seat:update', seats);
          io.emit('observer:joined', observers);
          broadcastGameState(io);
        } else {
          socket.emit('seat:error', { message: 'Seat is already taken.' });
        }
      } catch (error) {
        trackError(socket, error as Error, 'seat:request');
        socket.emit('error', { message: 'Failed to process seat request' });
      }
    });

    socket.on('disconnect', () => {
      try {
        if (playerSeat !== null) {
          const nickname = seats[playerSeat];
          seats[playerSeat] = null;
          players = players.filter(p => p.id !== socket.id);

          // Add to observers if disconnected
          if (nickname && !observers.includes(nickname)) {
            observers.push(nickname);
          }

          // Emit updates in sequence
          io.emit('seat:update', seats);
          io.emit('observer:joined', observers);
          broadcastGameState(io);
        }
      } catch (error) {
        trackError(socket, error as Error, 'disconnect');
        // No need to emit error on disconnect
      }
    });

    // Send current state to new connection
    try {
      socket.emit('seat:update', seats);
      socket.emit('observer:joined', observers);
      socket.emit('gameState', gameState);
    } catch (error) {
      trackError(socket, error as Error, 'initial state');
      socket.emit('error', { message: 'Failed to send initial state' });
    }
  });
} 