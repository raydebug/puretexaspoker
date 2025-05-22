import { io, Socket } from 'socket.io-client';
import { GameState, Player, Avatar as AvatarType } from '../types/shared';
import { cookieService } from './cookieService';
import { errorTrackingService } from './errorTrackingService';
import { TableData } from '../types/table';
import { EventEmitter } from 'events';

export type SeatState = { [seatNumber: number]: string | null };

type SeatUpdateCallback = (seats: SeatState) => void;
type SeatErrorCallback = (error: string) => void;
type OnlineUsersCallback = (players: Player[], observers: string[]) => void;
type ErrorCallback = (error: { message: string; context?: string }) => void;
type ChatMessageCallback = (message: ChatMessage) => void;
type SystemMessageCallback = (message: string) => void;
type TablesUpdateCallback = (tables: TableData[]) => void;

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  isPrivate?: boolean;
  recipient?: string;
}

// Extend Socket type to include EventEmitter methods
type ExtendedSocket = Socket & EventEmitter;

class SocketService {
  private socket: ExtendedSocket | null = null;
  private gameState: GameState | null = null;
  private currentPlayer: Player | null = null;
  private observers: string[] = [];
  private seatUpdateListeners: SeatUpdateCallback[] = [];
  private seatErrorListeners: SeatErrorCallback[] = [];
  private onlineUsersListeners: OnlineUsersCallback[] = [];
  private errorListeners: ErrorCallback[] = [];
  private chatMessageListeners: ChatMessageCallback[] = [];
  private systemMessageListeners: SystemMessageCallback[] = [];
  private tablesUpdateListeners: TablesUpdateCallback[] = [];
  private lobbyTables: TableData[] = [];
  private isConnecting: boolean = false;
  private lastConnectionAttempt: number = 0;
  private connectionLock: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 3;
  private reconnectionBackoff: number = 2000; // Start with 2 seconds
  private heartbeatInterval: NodeJS.Timeout | undefined;

  connect() {
    try {
      const now = Date.now();
      
      // Rate limiting - prevent multiple connection attempts in quick succession
      if (now - this.lastConnectionAttempt < 5000) {
        console.log('Rate limiting connection attempts, last attempt was less than 5 seconds ago');
        return this.socket;
      }
      this.lastConnectionAttempt = now;
      
      // Lock-based protection against multiple concurrent connection attempts
      if (this.connectionLock) {
        console.log('Connection attempt in progress, waiting for lock');
        return this.socket;
      }
      
      // If already connected, don't create a new one
      if (this.socket?.connected) {
        console.log('Socket already connected, reusing existing connection');
        return this.socket;
      }
      
      // Track connection attempts
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.error(`Reached maximum connection attempts (${this.maxConnectionAttempts}), stopping reconnection`);
        this.emitError({ 
          message: `Failed to connect after ${this.maxConnectionAttempts} attempts`, 
          context: 'socket:max_attempts' 
        });
        // Reset counter after a longer period
        setTimeout(() => {
          this.connectionAttempts = 0;
        }, 30000);
        return this.socket;
      }
      
      this.connectionLock = true;
      this.isConnecting = true;
      this.connectionAttempts++;
      
      // If socket exists but is disconnected, close it properly first
      if (this.socket) {
        console.log('Cleaning up existing socket before reconnecting');
        this.removeAllSocketListeners();
        this.socket.close();
        this.socket = null;
      }
      
      console.log(`Creating new socket connection to server (attempt ${this.connectionAttempts})`);
      
      // Create socket with more stable configuration
      const socket = io('http://localhost:3001', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        forceNew: true,
        autoConnect: false,
        path: '/socket.io'
      });

      // Cast socket to ExtendedSocket type and set up event emitter
      this.socket = socket as unknown as ExtendedSocket;
      EventEmitter.defaultMaxListeners = 20;
      
      // Set up listeners BEFORE connecting
      this.setupListeners();
      
      // Connect after all listeners are set up
      console.log('Connecting to socket server...');
      this.socket.connect();
      
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          console.error('Connection timeout - could not connect to server');
          this.isConnecting = false;
          this.connectionLock = false;
          this.socket.disconnect();
          this.socket = null;
          this.emitError({ 
            message: 'Connection timeout. Server may be down.', 
            context: 'socket:timeout' 
          });
        }
      }, 10000);
      
      // Clear timeout on successful connection or error
      this.socket.on('connect', () => {
        clearTimeout(connectionTimeout);
        this.onSuccessfulConnection();
      });
      
      this.socket.on('connect_error', (error) => {
        clearTimeout(connectionTimeout);
        console.error('Connection error:', error.message);
        this.isConnecting = false;
        this.connectionLock = false;
        this.emitError({ 
          message: `Failed to connect: ${error.message}`, 
          context: 'socket:connect_error' 
        });
        
        // Exponential backoff for reconnection
        const backoffTime = this.reconnectionBackoff * Math.pow(2, this.connectionAttempts - 1);
        console.log(`Will retry connection in ${backoffTime/1000} seconds`);
        
        // Try to reconnect after backoff
        setTimeout(() => {
          this.connectionLock = false;
          this.connect();
        }, backoffTime);
      });
      
      return this.socket;
    } catch (error) {
      this.isConnecting = false;
      this.connectionLock = false;
      errorTrackingService.trackError(error as Error, 'socket:connect');
      throw error;
    }
  }

  private onSuccessfulConnection() {
    console.log('Connected to server successfully with ID:', this.socket?.id);
    this.isConnecting = false;
    this.connectionLock = false;
    this.connectionAttempts = 0; // Reset counter on successful connection
    this.reconnectionBackoff = 2000; // Reset backoff on successful connection
    
    // Don't automatically upgrade transport - this causes issues
    // Let the connection remain stable with whatever transport worked
    
    // Attempt to restore session after successful connection
    const savedNickname = cookieService.getNickname();
    const savedSeatNumber = cookieService.getSeatNumber();
    
    if (savedNickname) {
      if (savedSeatNumber !== null) {
        // Delay restoring seat to ensure stable connection
        setTimeout(() => {
          if (this.socket?.connected) {
            this.requestSeat(savedNickname, savedSeatNumber);
          }
        }, 1000);
      } else {
        // Join as observer if no seat is saved, with slight delay
        setTimeout(() => {
          if (this.socket?.connected) {
            this.joinAsObserver(savedNickname);
          }
        }, 1000);
      }
    }
  }

  disconnect() {
    if (this.socket) {
      // Save current state before disconnecting
      if (this.currentPlayer) {
        cookieService.setNickname(this.currentPlayer.name);
        const currentSeat = this.getCurrentSeat();
        if (currentSeat !== null) {
          cookieService.setSeatNumber(currentSeat);
        }
      }
      
      console.log('Disconnecting socket...');
      
      this.connectionLock = true; // Prevent reconnection during disconnection
      
      // First disable auto-reconnection
      this.socket.io.opts.reconnection = false;
      
      // Remove all socket event listeners
      this.removeAllSocketListeners();
      
      // Then properly close and disconnect the socket
      this.socket.disconnect();
      this.socket.close();
      this.socket = null;
      this.isConnecting = false;
      this.connectionLock = false;
      
      // Clear any cached data
      this.gameState = null;
      this.currentPlayer = null;
      this.observers = [];
      
      console.log('Socket disconnected successfully');
    }
  }

  getCurrentSeat(): number | null {
    if (!this.gameState || !this.currentPlayer) return null;
    const player = this.gameState.players.find(p => p.id === this.currentPlayer?.id);
    return player?.seatNumber ?? null;
  }

  // --- Error handling ---
  onError(callback: ErrorCallback) {
    this.errorListeners.push(callback);
    return () => {
      this.errorListeners = this.errorListeners.filter(cb => cb !== callback);
    };
  }

  private emitError(error: { message: string; context?: string }) {
    errorTrackingService.trackError(error.message, error.context || 'unknown', {
      currentPlayer: this.currentPlayer?.name,
      gameState: this.gameState?.id
    });
    this.errorListeners.forEach(cb => cb(error));
  }

  // --- Online users management ---
  joinAsObserver(nickname: string) {
    try {
      if (!nickname) {
        throw new Error('Nickname is required');
      }
      if (this.socket && this.socket.connected) {
        this.socket.emit('observer:join', { nickname });
      } else {
        console.warn('Cannot join as observer: socket not connected');
        this.connect(); // Ensure socket is connected before continuing
      }
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'joinAsObserver', { nickname });
    }
  }

  onOnlineUsersUpdate(callback: OnlineUsersCallback) {
    this.onlineUsersListeners.push(callback);
    return () => {
      this.onlineUsersListeners = this.onlineUsersListeners.filter(cb => cb !== callback);
    };
  }

  private emitOnlineUsersUpdate() {
    try {
      const players = this.gameState?.players || [];
      this.onlineUsersListeners.forEach(cb => cb(players, this.observers));
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'emitOnlineUsersUpdate', {
        players: this.gameState?.players.length,
        observers: this.observers.length
      });
    }
  }

  // --- Seat management ---
  requestSeat(nickname: string, seatNumber: number) {
    try {
      if (!nickname || seatNumber === undefined) {
        throw new Error('Invalid seat request parameters');
      }
      
      if (!this.socket?.connected) {
        console.warn('Socket not connected when requesting seat, connecting first');
        this.connect();
        
        // Add a listener for when connection is established
        this.socket?.once('connect', () => {
          this.socket?.emit('seat:request', { nickname, seatNumber });
        });
        return;
      }
      
      this.socket.emit('seat:request', { nickname, seatNumber });
      
      // Add player to observers initially
      if (!this.observers.includes(nickname)) {
        this.observers.push(nickname);
        this.emitOnlineUsersUpdate();
      }
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'requestSeat', {
        nickname,
        seatNumber,
        currentObservers: this.observers
      });
    }
  }

  onSeatUpdate(callback: SeatUpdateCallback) {
    this.seatUpdateListeners.push(callback);
    return () => {
      this.seatUpdateListeners = this.seatUpdateListeners.filter(cb => cb !== callback);
    };
  }

  onSeatError(callback: SeatErrorCallback) {
    this.seatErrorListeners.push(callback);
    return () => {
      this.seatErrorListeners = this.seatErrorListeners.filter(cb => cb !== callback);
    };
  }

  private emitSeatUpdate(seats: SeatState) {
    this.seatUpdateListeners.forEach(cb => cb(seats));
  }

  private emitSeatError(error: string) {
    this.seatErrorListeners.forEach(cb => cb(error));
  }

  // --- Game actions ---
  joinGame(nickname: string, seatNumber: number) {
    // Deprecated for seat management, use requestSeat instead
    this.requestSeat(nickname, seatNumber);
  }

  placeBet(gameId: string, playerId: string, amount: number) {
    if (this.socket?.connected) {
      this.socket.emit('placeBet', { gameId, playerId, amount });
    } else {
      console.warn('Cannot place bet: socket not connected');
    }
  }

  check(gameId: string, playerId: string) {
    if (this.socket?.connected) {
      this.socket.emit('check', { gameId, playerId });
    } else {
      console.warn('Cannot check: socket not connected');
    }
  }

  fold(gameId: string, playerId: string) {
    if (this.socket?.connected) {
      this.socket.emit('fold', { gameId, playerId });
    } else {
      console.warn('Cannot fold: socket not connected');
    }
  }

  // --- Seat action methods ---
  updatePlayerStatus(gameId: string, playerId: string, isAway: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('player:status', { gameId, playerId, isAway });
    } else {
      console.warn('Cannot update status: socket not connected');
    }
  }

  standUp(gameId: string, playerId: string) {
    if (this.socket?.connected) {
      this.socket.emit('player:standUp', { gameId, playerId });
    } else {
      console.warn('Cannot stand up: socket not connected');
    }
  }

  leaveTable(gameId: string, playerId: string) {
    if (this.socket?.connected) {
      this.socket.emit('player:leaveTable', { gameId, playerId });
      cookieService.clearGameData();
    } else {
      console.warn('Cannot leave table: socket not connected');
    }
  }

  // --- Chat methods ---
  sendChatMessage(gameId: string, message: ChatMessage) {
    if (this.socket?.connected) {
      this.socket.emit('chat:message', { gameId, message });
    } else {
      console.warn('Cannot send chat message: socket not connected');
    }
  }

  onChatMessage(callback: ChatMessageCallback) {
    this.chatMessageListeners.push(callback);
    return () => {
      this.chatMessageListeners = this.chatMessageListeners.filter(cb => cb !== callback);
    };
  }

  offChatMessage() {
    this.chatMessageListeners = [];
  }

  onSystemMessage(callback: SystemMessageCallback) {
    this.systemMessageListeners.push(callback);
    return () => {
      this.systemMessageListeners = this.systemMessageListeners.filter(cb => cb !== callback);
    };
  }

  offSystemMessage() {
    this.systemMessageListeners = [];
  }

  private emitChatMessage(message: ChatMessage) {
    this.chatMessageListeners.forEach(cb => cb(message));
  }

  private emitSystemMessage(message: string) {
    this.systemMessageListeners.forEach(cb => cb(message));
  }

  // --- Lobby methods ---
  requestLobbyTables() {
    if (!this.socket || !this.socket.connected) {
      console.log('Socket not connected, connecting before requesting tables');
      this.connect();
      
      // Request tables once connected
      this.socket?.once('connect', () => {
        this.socket?.emit('getLobbyTables');
      });
      return;
    }
    
    this.socket.emit('getLobbyTables');
  }

  onTablesUpdate(callback: TablesUpdateCallback) {
    this.tablesUpdateListeners.push(callback);
    return () => {
      this.tablesUpdateListeners = this.tablesUpdateListeners.filter(cb => cb !== callback);
    };
  }

  offTablesUpdate() {
    this.tablesUpdateListeners = [];
  }

  private emitTablesUpdate(tables: TableData[]) {
    this.lobbyTables = tables;
    this.tablesUpdateListeners.forEach(cb => cb(tables));
  }

  getLobbyTables(): TableData[] {
    return this.lobbyTables;
  }

  // Updated to match the expected signature for lobby
  joinTable(tableId: number, buyIn: number) {
    if (this.socket?.connected) {
      console.log(`Joining table ${tableId} with buy-in ${buyIn}`);
      this.socket.emit('joinTable', { tableId, buyIn });
    } else {
      console.warn('Socket not connected when trying to join table, connecting first');
      
      // Clear any existing connection attempts and reset state
      if (this.socket) {
        this.removeAllSocketListeners();
        this.socket.off('connect');
      }
      
      // Force reset connection state to ensure we can connect
      this.isConnecting = false;
      this.connectionLock = false;
      this.lastConnectionAttempt = 0;
      
      // Create a fresh connection
      const socket = this.connect();
      
      if (socket) {
        // Register the connect handler with our unique name
        socket.once('connect', () => {
          console.log(`Socket connected (${socket.id}), waiting to join table ${tableId}`);
          
          // Wait for connection to stabilize before joining
          setTimeout(() => {
            // Check again if the socket is still connected
            if (socket.connected) {
              console.log(`Now joining table ${tableId} with buy-in ${buyIn}`);
              socket.emit('joinTable', { tableId, buyIn });
            } else {
              console.error('Connection was lost after initial connect');
              this.emitError({ 
                message: 'Failed to join table: connection was lost', 
                context: 'table:join_failed' 
              });
            }
          }, 2000); // Wait 2 seconds for connection to stabilize
        });
      } else {
        this.emitError({ 
          message: 'Failed to create socket connection for joining table', 
          context: 'table:connection_failed' 
        });
      }
    }
  }

  private setupListeners(): void {
    if (!this.socket) return;
    
    console.log('Setting up socket event listeners');
    
    // First remove any existing handlers to prevent duplicates
    this.removeAllSocketListeners();

    // --- Basic connection status ---
    this.socket.on('connect', () => {
      this.onSuccessfulConnection();
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log(`Disconnected from server: ${reason}`);
      this.isConnecting = false;
      
      // If the server forcibly closed the connection, don't auto-reconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('Server closed connection, not attempting to reconnect');
        this.connectionLock = false;
      } else if (reason !== 'io client disconnect') {
        // Only attempt to reconnect for server-side disconnects
        console.log('Disconnected due to error, attempting reconnection in 3 seconds');
        setTimeout(() => {
          this.connectionLock = false;
          this.connect();
        }, 3000);
      }
    });
    
    // --- Error listener ---
    this.socket.on('error', (error: { message: string; context?: string }) => {
      console.error('Socket error:', error.message);
      errorTrackingService.trackError(error.message, error.context || 'socket:error');
      this.emitError(error);
    });

    // --- Online users listeners ---
    this.socket.on('observer:joined', (observers: string[]) => {
      try {
        this.observers = observers;
        this.emitOnlineUsersUpdate();
      } catch (error) {
        errorTrackingService.trackError(error as Error, 'observer:joined', { observers });
      }
    });

    this.socket.on('observer:left', (observers: string[]) => {
      try {
        this.observers = observers;
        this.emitOnlineUsersUpdate();
      } catch (error) {
        errorTrackingService.trackError(error as Error, 'observer:left', { observers });
      }
    });

    // --- Seat management listeners ---
    this.socket.on('seat:update', (seats: SeatState) => {
      try {
        this.emitSeatUpdate(seats);
      } catch (error) {
        errorTrackingService.trackError(error as Error, 'seat:update', { seats });
      }
    });

    this.socket.on('seat:accepted', (player: Player) => {
      try {
        // Update current player
        this.currentPlayer = player;
        
        // Update game state players list, ensuring no duplicates
        if (this.gameState) {
          // Remove any existing entries for this player first
          this.gameState.players = this.gameState.players.filter(p => p.id !== player.id);
          // Add the player with their new seat
          this.gameState.players.push(player);
        } else {
          this.gameState = {
            id: 'game1',
            players: [player],
            pot: 0,
            communityCards: [],
            currentPlayerId: null,
            currentPlayerPosition: 0,
            dealerPosition: 0,
            status: 'waiting',
            currentBet: 0,
            minBet: 10,
            smallBlind: 5,
            bigBlind: 10,
            phase: 'waiting'
          };
        }
        
        // Remove from observers after updating game state
        this.observers = this.observers.filter(obs => obs !== player.name);
        
        // Emit updates
        this.emitOnlineUsersUpdate();
      } catch (error) {
        errorTrackingService.trackError(error as Error, 'seat:accepted', { player: player.name });
      }
    });

    this.socket.on('seat:error', (payload: { message: string }) => {
      try {
        this.emitSeatError(payload.message);
      } catch (error) {
        errorTrackingService.trackError(error as Error, 'seat:error', { message: payload.message });
      }
    });

    // --- Game state listeners ---
    this.socket.on('gameState', (state: GameState) => {
      try {
        // Ensure no duplicate players in the game state
        state.players = state.players.filter((player, index, self) =>
          index === self.findIndex(p => p.id === player.id)
        );
        
        this.gameState = state;
        if (this.currentPlayer) {
          const updatedPlayer = state.players.find(p => p.id === this.currentPlayer?.id);
          if (updatedPlayer) {
            this.currentPlayer = updatedPlayer;
          }
        }
        this.emitOnlineUsersUpdate();
      } catch (error) {
        errorTrackingService.trackError(error as Error, 'gameState', {
          gameId: this.gameState?.id,
          playerCount: this.gameState?.players.length
        });
      }
    });

    this.socket.on('playerJoined', (player: Player) => {
      if (this.gameState) {
        this.gameState.players.push(player);
        // Remove from observers if player was an observer before
        this.observers = this.observers.filter(obs => obs !== player.name);
        this.emitOnlineUsersUpdate();
      }
    });

    this.socket.on('playerLeft', (playerId: string) => {
      if (this.gameState) {
        const player = this.gameState.players.find(p => p.id === playerId);
        if (player) {
          // Add to observers when player leaves
          this.observers.push(player.name);
        }
        this.gameState.players = this.gameState.players.filter(p => p.id !== playerId);
        this.emitOnlineUsersUpdate();
      }
    });

    // --- Player status listeners ---
    this.socket.on('player:statusUpdated', (player: Player) => {
      if (this.gameState) {
        this.gameState.players = this.gameState.players.map(p =>
          p.id === player.id ? player : p
        );
        if (this.currentPlayer?.id === player.id) {
          this.currentPlayer = player;
        }
      }
    });

    this.socket.on('player:stoodUp', (playerId: string) => {
      if (this.gameState) {
        const player = this.gameState.players.find(p => p.id === playerId);
        if (player) {
          this.observers.push(player.name);
          this.gameState.players = this.gameState.players.filter(p => p.id !== playerId);
        }
        if (this.currentPlayer?.id === playerId) {
          this.currentPlayer = null;
        }
      }
    });

    // --- Chat listeners ---
    this.socket.on('chat:message', (message: ChatMessage) => {
      try {
        this.emitChatMessage(message);
      } catch (error) {
        errorTrackingService.trackError(error as Error, 'chat:message', { 
          sender: message.sender,
          isPrivate: message.isPrivate
        });
      }
    });

    this.socket.on('chat:system', (message: string) => {
      try {
        this.emitSystemMessage(message);
      } catch (error) {
        errorTrackingService.trackError(error as Error, 'chat:system', { message });
      }
    });

    // --- Lobby listeners ---
    this.socket.on('tablesUpdate', (tables: TableData[]) => {
      try {
        this.emitTablesUpdate(tables);
      } catch (error) {
        errorTrackingService.trackError(error as Error, 'tablesUpdate', { tableCount: tables.length });
      }
    });

    this.socket.on('tableJoined', (data: { tableId: number, role: 'player' | 'observer', buyIn: number }) => {
      try {
        // When we join a table, create a player for the current user
        const nickname = localStorage.getItem('nickname') || `Player${Math.floor(Math.random() * 1000)}`;
        
        // Create a simple player object for the game
        const player: Player = {
          id: this.socket?.id || 'unknown',
          name: nickname,
          seatNumber: data.buyIn,
          position: data.buyIn,
          chips: 1000,
          currentBet: 0,
          isDealer: false,
          isAway: false,
          isActive: true,
          avatar: createObserverAvatar(nickname),
          cards: []
        };
        
        // Set current player
        this.currentPlayer = player;
        
        // Create a default game state if none exists
        if (!this.gameState) {
          this.gameState = {
            id: data.tableId.toString(),
            players: [player],
            pot: 0,
            communityCards: [],
            currentPlayerId: null,
            currentPlayerPosition: 0,
            dealerPosition: 0,
            status: 'waiting',
            currentBet: 0,
            minBet: 10,
            smallBlind: 5,
            bigBlind: 10,
            phase: 'waiting'
          };
        }
        
        // Add player to game state
        this.emitOnlineUsersUpdate();
      } catch (error) {
        errorTrackingService.trackError(error as Error, 'tableJoined', data);
      }
    });

    this.socket.on('tableError', (error: string) => {
      this.emitError({ message: error, context: 'table:join' });
    });
    
    // Add heartbeat check to keep connection alive
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      } else {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = undefined;
      }
    }, 25000);
    
    // Store interval to be cleared when needed
    this.socket.io.on('close', () => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = undefined;
      }
    });
  }

  private removeAllSocketListeners() {
    if (!this.socket) return;
    
    // Remove all event listeners
    this.socket.removeAllListeners();
    
    // Remove all socket.io listeners
    this.socket.io.removeAllListeners();
    
    // Clear any intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    // Clear all callback arrays
    this.seatUpdateListeners = [];
    this.seatErrorListeners = [];
    this.onlineUsersListeners = [];
    this.errorListeners = [];
    this.chatMessageListeners = [];
    this.systemMessageListeners = [];
    this.tablesUpdateListeners = [];

    // Remove specific event listeners that might be causing leaks
    this.socket.off('disconnect');
    this.socket.off('observer:join');
    this.socket.off('seat:request');
    this.socket.off('connect');
    this.socket.off('connect_error');
    this.socket.off('error');
    this.socket.off('observer:joined');
    this.socket.off('observer:left');
    this.socket.off('seat:update');
    this.socket.off('seat:accepted');
    this.socket.off('seat:error');
    this.socket.off('gameState');
    this.socket.off('playerJoined');
    this.socket.off('playerLeft');
    this.socket.off('player:statusUpdated');
    this.socket.off('player:stoodUp');
    this.socket.off('chat:message');
    this.socket.off('chat:system');
    this.socket.off('tablesUpdate');
    this.socket.off('tableJoined');
    this.socket.off('tableError');
  }

  getGameState(): GameState | null {
    return this.gameState;
  }

  getCurrentPlayer(): Player | null {
    return this.currentPlayer;
  }

  setCurrentPlayer(player: Player) {
    this.currentPlayer = player;
  }
}

const createObserverAvatar = (nickname: string): AvatarType => ({
  type: 'initials',
  initials: nickname.substring(0, 2).toUpperCase(),
  color: '#1abc9c'
});

export const socketService = new SocketService(); 