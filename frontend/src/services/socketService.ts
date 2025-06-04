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
  private isConnecting = false;
  private connectionLock = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 10;
  private reconnectionBackoff = 2000;
  private lastConnectionAttempt = 0;
  private isTestMode = false;
  private eventEmitter = new EventEmitter();
  private heartbeatInterval: NodeJS.Timeout | undefined;
  private gameState: GameState | null = null;
  private currentPlayer: Player | null = null;
  private observers: string[] = [];
  private lobbyTables: TableData[] = [];
  private currentGameId: string | null = null;
  private retryQueue: Array<{ event: string; data: any; attempts: number }> = [];
  private isJoiningTable = false; // Add flag to prevent multiple join attempts

  // Event listeners
  private errorListeners: ((error: { message: string; context: string; severity?: string; retryable?: boolean }) => void)[] = [];
  private chatMessageListeners: ((message: ChatMessage) => void)[] = [];
  private systemMessageListeners: ((message: string) => void)[] = [];
  private gameStateListeners: ((state: GameState) => void)[] = [];
  private seatUpdateListeners: ((seats: SeatState) => void)[] = [];
  private seatErrorListeners: ((error: string) => void)[] = [];
  private tablesUpdateListeners: ((tables: TableData[]) => void)[] = [];
  private onlineUsersListeners: ((players: Player[], observers: string[]) => void)[] = [];

  constructor() {
    // Auto-detect test environment
    if (typeof window !== 'undefined' && (window as any).Cypress) {
      this.setTestMode(true);
      console.log('DEBUG: Cypress detected, enabling test mode');
    }
  }

  // Add test mode setter
  setTestMode(enabled: boolean) {
    this.isTestMode = enabled;
    if (enabled) {
      this.lastConnectionAttempt = 0;
      this.connectionLock = false;
      this.connectionAttempts = 0;
      this.reconnectionBackoff = 0; // Set to 0 in test mode
      this.maxConnectionAttempts = 10; // Allow more attempts in test mode
    } else {
      // In normal mode, allow more attempts to be user-friendly
      this.maxConnectionAttempts = 10;
    }
  }

  // Add getSocket method
  getSocket(): ExtendedSocket | null {
    return this.socket;
  }

  // Add onGameState method
  onGameState(callback: (state: GameState) => void): () => void {
    if (this.socket) {
      this.socket.on('gameState', callback);
      return () => this.socket?.off('gameState', callback);
    }
    return () => {};
  }

  // Add setPlayerAway method
  setPlayerAway(isAway: boolean) {
    if (this.socket?.connected && this.gameState && this.currentPlayer) {
      this.socket.emit('player:status', {
        gameId: this.gameState.id,
        playerId: this.currentPlayer.id,
        isAway
      });
    }
  }

  connect() {
    try {
      console.log('DEBUG: connect() method called');
      const now = Date.now();
      
      // Reset connection attempts if enough time has passed (5 minutes)
      if (now - this.lastConnectionAttempt > 300000) {
        console.log('DEBUG: Resetting connection attempts due to time elapsed');
        this.connectionAttempts = 0;
      }
      
      // If we've already reached max attempts, don't try to connect
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.error(`Already reached maximum connection attempts (${this.maxConnectionAttempts}), not attempting to connect`);
        const error = { 
          message: `Failed to connect after ${this.maxConnectionAttempts} attempts`, 
          context: 'socket:max_attempts' 
        };
        
        // First emit through the socket
        if (this.socket) {
          this.socket.emit('error', error);
        }
        
        // Then emit through our error emitter
        this.emitError(error);
        
        // Finally, clean up the socket to prevent further connection attempts
        if (this.socket) {
          this.removeAllSocketListeners();
          this.socket.disconnect();
          this.socket = null;
        }
        
        // Prevent any further connection attempts
        this.isConnecting = true;
        this.connectionLock = true;
        return this.socket;
      }
      
      // Track connection attempts before making the attempt
      this.connectionAttempts++;
      console.log(`Connection attempt ${this.connectionAttempts} of ${this.maxConnectionAttempts}`);
      
      // If we've just reached max attempts, don't proceed
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.error(`Maximum connection attempts (${this.maxConnectionAttempts}) reached, stopping reconnection`);
        const error = { 
          message: `Failed to connect after ${this.maxConnectionAttempts} attempts`, 
          context: 'socket:max_attempts' 
        };
        
        // First emit through the socket
        if (this.socket) {
          this.socket.emit('error', error);
        }
        
        // Then emit through our error emitter
        this.emitError(error);
        
        // Finally, clean up the socket to prevent further connection attempts
        if (this.socket) {
          this.removeAllSocketListeners();
          this.socket.disconnect();
          this.socket = null;
        }
        
        // Prevent any further connection attempts
        this.isConnecting = true;
        this.connectionLock = true;
        return this.socket;
      }
      
      // Rate limiting - prevent multiple connection attempts in quick succession
      if (!this.isTestMode && now - this.lastConnectionAttempt < 5000) {
        console.log('Rate limiting connection attempts, last attempt was less than 5 seconds ago');
        return this.socket;
      }
      this.lastConnectionAttempt = now;
      
      // Lock-based protection against multiple concurrent connection attempts
      if (!this.isTestMode && this.connectionLock) {
        console.log('Connection attempt in progress, waiting for lock');
        return this.socket;
      }
      
      // If already connected, don't create a new one
      if (this.socket?.connected) {
        console.log('Socket already connected, reusing existing connection');
        return this.socket;
      }
      
      this.connectionLock = true;
      this.isConnecting = true;
      
      // If socket exists but is disconnected, clean it up properly first
      if (this.socket) {
        console.log('Cleaning up existing socket before reconnecting');
        this.removeAllSocketListeners();
        this.socket.disconnect();
        this.socket = null;
      }
      
      // Create socket with more stable configuration
      const socket = io('http://localhost:3001', {
        transports: ['websocket'],
        reconnection: true, // Enable auto-reconnection
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        forceNew: true,
        autoConnect: false,
        path: '/socket.io'
      });

      // Cast socket to ExtendedSocket type and set up event emitter
      this.socket = socket as unknown as ExtendedSocket;
      
      // Set up listeners BEFORE connecting
      this.setupListeners();
      
      // Connect after all listeners are set up
      console.log('Connecting to socket server...');
      this.socket.connect();
      
      return this.socket;
    } catch (error) {
      this.isConnecting = false;
      this.connectionLock = false;
      const errorObj = {
        message: `Failed to connect: ${(error as Error).message}`,
        context: 'socket:connect_error'
      };
      this.emitError(errorObj);
      if (this.socket) {
        this.socket.emit('error', errorObj);
      }
      errorTrackingService.trackError(error as Error, 'socket:connect');
      throw error;
    }
  }

  private setupListeners() {
    if (!this.socket) return;

    const socket = this.socket;

    // Handle successful connection
    socket.on('connect', () => {
      this.onSuccessfulConnection();
      
      // Process any queued retries
      this.processRetryQueue();
    });

    socket.on('observer:joined', (data: { observer: string }) => {
      if (!this.observers.includes(data.observer)) {
        this.observers.push(data.observer);
        this.emitOnlineUsersUpdate();
      }
    });

    socket.on('observer:left', (data: { observer: string }) => {
      this.observers = this.observers.filter(observer => observer !== data.observer);
      this.emitOnlineUsersUpdate();
    });

    socket.on('seat:update', (seats: SeatState) => {
      this.emitSeatUpdate(seats);
    });

    socket.on('seat:accepted', (data: { seatNumber: number; playerId: string; player: Player }) => {
      // Update the game state with the new player
      if (this.gameState) {
        // Find if player already exists or add new player
        const existingPlayerIndex = this.gameState.players.findIndex(p => p.id === data.player.id);
        if (existingPlayerIndex !== -1) {
          this.gameState.players[existingPlayerIndex] = data.player;
        } else {
          this.gameState.players.push(data.player);
        }
        this.emitGameStateUpdate(this.gameState);
      }
      this.emitSeatUpdate({ [data.seatNumber]: data.playerId });
    });

    socket.on('seat:error', (error: string) => {
      this.emitSeatError(error);
    });

    socket.on('gameState', (gameState: GameState) => {
      console.log('DEBUG: Frontend received gameState event:', gameState);
      this.gameState = gameState;
      this.emitGameStateUpdate(gameState);
    });

    socket.on('playerJoined', (data: { player: Player }) => {
      console.log('DEBUG: Frontend received playerJoined event:', data);
      if (this.gameState) {
        // Check if player already exists in the game state
        const existingPlayerIndex = this.gameState.players.findIndex(p => p.id === data.player.id);
        if (existingPlayerIndex === -1) {
          this.gameState.players.push(data.player);
          this.emitGameStateUpdate(this.gameState);
        }
      }
    });

    socket.on('playerLeft', (data: { playerId: string }) => {
      console.log('DEBUG: Frontend received playerLeft event:', data);
      if (this.gameState) {
        this.gameState.players = this.gameState.players.filter(p => p.id !== data.playerId);
        this.emitGameStateUpdate(this.gameState);
      }
    });

    socket.on('player:statusUpdated', (data: { playerId: string; isAway: boolean }) => {
      if (this.gameState) {
        const player = this.gameState.players.find(p => p.id === data.playerId);
        if (player) {
          player.isAway = data.isAway;
          this.emitGameStateUpdate(this.gameState);
        }
      }
    });

    socket.on('player:stoodUp', (data: { playerId: string }) => {
      if (this.gameState) {
        this.gameState.players = this.gameState.players.filter(p => p.id !== data.playerId);
        this.emitGameStateUpdate(this.gameState);
      }
    });

    socket.on('chat:message', (message: ChatMessage) => {
      this.emitChatMessage(message);
    });

    socket.on('chat:system', (message: string) => {
      this.emitSystemMessage(message);
    });

    socket.on('tablesUpdate', (tables: TableData[]) => {
      console.log('DEBUG: Received tablesUpdate event with', tables.length, 'tables');
      console.log('DEBUG: Tables data:', tables);
      this.emitTablesUpdate(tables);
    });

    // Handle table joining results
    socket.on('tableJoined', (data: { tableId: number; role: 'player' | 'observer'; buyIn: number; gameId?: string }) => {
      console.log('DEBUG: Frontend received tableJoined event:', data);
      console.log('DEBUG: Frontend socket still connected:', socket.connected);
      console.log('DEBUG: Frontend socket ID:', socket.id);
      if (data.gameId) {
        // Store the game ID for this session
        this.currentGameId = data.gameId;
        console.log('DEBUG: Frontend stored gameId:', this.currentGameId);
      }
    });

    // Handle game creation and joining
    socket.on('gameCreated', (data: { gameId: string; tableId: number }) => {
      console.log('DEBUG: Frontend received gameCreated event:', data);
      console.log('DEBUG: Frontend socket still connected:', socket.connected);
      this.currentGameId = data.gameId;
    });

    socket.on('gameJoined', (data: { gameId: string; playerId: string; gameState: GameState }) => {
      console.log('DEBUG: Frontend received gameJoined event:', data);
      console.log('DEBUG: Frontend gameState received:', data.gameState);
      console.log('DEBUG: Frontend playerId received:', data.playerId);
      console.log('DEBUG: Frontend socket still connected:', socket.connected);
      console.log('DEBUG: Frontend socket ID:', socket.id);
      
      this.currentGameId = data.gameId;
      this.gameState = data.gameState;
      
      // Set the current player
      const currentPlayer = data.gameState.players.find(p => p.id === data.playerId);
      if (currentPlayer) {
        console.log('DEBUG: Frontend found and setting currentPlayer:', currentPlayer);
        this.currentPlayer = currentPlayer;
      } else {
        console.error('DEBUG: Frontend could not find player in gameState.players:', data.gameState.players);
        console.error('DEBUG: Frontend looking for playerId:', data.playerId);
      }
      
      // Emit the updated game state
      this.emitGameStateUpdate(data.gameState);
      console.log('DEBUG: Frontend emitted gameStateUpdate');
    });

    socket.on('tableError', (error: string) => {
      console.log('DEBUG: Frontend received tableError event:', error);
      console.log('DEBUG: Frontend socket still connected:', socket.connected);
      this.emitError({ message: error, context: 'table:error' });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnecting = false;
      this.connectionLock = false;
      this.handleSocketError({ 
        message: 'Failed to connect to server', 
        event: 'connection',
        severity: 'critical',
        retryable: true
      });
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      
      // Handle structured error responses from server
      if (typeof error === 'object' && error.message) {
        this.handleSocketError(error);
      } else {
        this.handleSocketError({ 
          message: typeof error === 'string' ? error : error.message || 'Unknown socket error',
          severity: 'error',
          retryable: false
        });
      }
    });

    // Handle structured game errors
    socket.on('gameError', (error: { message: string; context: string; severity: string }) => {
      this.handleSocketError({
        message: error.message,
        event: error.context,
        severity: error.severity,
        retryable: false
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('DEBUG: Frontend socket disconnect event:', reason);
      console.log('DEBUG: Frontend socket ID at disconnect:', socket.id);
      console.log('DEBUG: Frontend currentPlayer at disconnect:', this.currentPlayer);
      console.log('DEBUG: Frontend gameState at disconnect:', this.gameState);
      this.handleDisconnect(reason);
    });
  }

  private onSuccessfulConnection() {
    console.log('DEBUG: Connected to server successfully with ID:', this.socket?.id);
    this.isConnecting = false;
    this.connectionLock = false;
    
    // Only reset connection attempts if we haven't reached max attempts
    if (this.connectionAttempts < this.maxConnectionAttempts) {
      this.connectionAttempts = 0;
      console.log('Connection successful, resetting connection attempts counter');
    }
    
    this.emit('connected');

    // Get user info from cookies
    const nickname = cookieService.getNickname();
    const seatNumber = cookieService.getSeatNumber();

    if (nickname) {
      if (seatNumber === null) {
        // If no seat number, join as observer
        this.joinAsObserver(nickname);
      } else {
        // If has seat number, join game
        this.joinGame(nickname, seatNumber);
      }
    }

    // Set up heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, 30000);

    // Set up event listeners for observer management
    if (this.socket) {
      this.socket.on('observer:joined', (observers: string[]) => {
        this.observers = observers;
        this.emitOnlineUsersUpdate();
      });

      this.socket.on('observer:left', (observers: string[]) => {
        this.observers = observers;
        this.emitOnlineUsersUpdate();
      });

      this.socket.on('playerJoined', (player: Player) => {
        if (!this.gameState) {
          this.gameState = this.getInitialGameState();
        }

        if (this.gameState) {
          const existingPlayerIndex = this.gameState.players.findIndex(p => p.id === player.id);
          if (existingPlayerIndex !== -1) {
            this.gameState.players[existingPlayerIndex] = player;
          } else {
            this.gameState.players = [...this.gameState.players, player];
          }
        }
        
        // Remove player from observers list
        this.observers = this.observers.filter(observer => observer !== player.name);
        
        // Emit update with the new state - send the updated player and filtered observers
        this.onlineUsersListeners.forEach(callback => {
          callback([player], this.observers);
        });
      });

      this.socket.on('playerLeft', (playerId: string) => {
        if (this.gameState) {
          const player = this.gameState.players.find(p => p.id === playerId);
          if (player) {
            // Add to observers if not already there
            if (!this.observers.includes(player.name)) {
              this.observers = [...this.observers, player.name];
            }
            
            // Remove from players list
            this.gameState.players = this.gameState.players.filter(p => p.id !== playerId);
            
            // Emit update with the new state - send empty players array and only the player's name in observers
            this.onlineUsersListeners.forEach(callback => {
              callback([], [player.name]);
            });
          }
        }
      });
    }
  }

  disconnect() {
    try {
      if (this.socket) {
        // Remove all listeners first
        this.removeAllSocketListeners();
        // Then properly disconnect the socket
        this.socket.disconnect();
        this.socket = null;
        this.isConnecting = false;
        this.connectionLock = false;
        this.connectionAttempts = 0;
        this.reconnectionBackoff = 2000;
        
        // Clear heartbeat interval if it exists
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = undefined;
        }
      }
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'socket:disconnect');
      throw error;
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

  private emitError(error: { message: string; context: string }) {
    this.errorListeners.forEach(callback => callback(error));
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
    const players = this.gameState?.players || [];
    this.onlineUsersListeners.forEach(callback => {
        callback(players, this.observers);
    });
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
    this.seatUpdateListeners.forEach(callback => callback(seats));
  }

  private emitSeatError(error: string) {
    this.seatErrorListeners.forEach(callback => callback(error));
  }

  // --- Game actions ---
  joinGame(nicknameOrPlayer: string | Player, seatNumber?: number) {
    try {
      // Handle both old signature (nickname, seatNumber) and new signature (player)
      if (typeof nicknameOrPlayer === 'string') {
        // Old signature: joinGame(nickname, seatNumber)
        const nickname = nicknameOrPlayer;
        if (!nickname || seatNumber === undefined) {
          throw new Error('Nickname and seat number are required');
        }
        
        if (!this.socket?.connected) {
          console.warn('Socket not connected when joining game, connecting first');
          this.connect();
          
          this.socket?.once('connect', () => {
            this.socket?.emit('joinGame', { nickname, seatNumber });
          });
          return;
        }
        
        this.socket.emit('joinGame', { nickname, seatNumber });
      } else {
        // New signature: joinGame(player)
        const player = nicknameOrPlayer;
        if (!player?.id || !player?.name) {
          throw new Error('Player ID and name are required');
        }
        
        if (!player.chips || player.chips < 0) {
          throw new Error('Invalid chip amount');
        }

        if (!this.socket?.connected) {
          console.warn('Socket not connected when joining game, connecting first');
          this.connect();
          
          this.socket?.once('connect', () => {
            this.socket?.emit('joinGame', player);
          });
          return;
        }
        
        this.socket.emit('joinGame', player);
      }
    } catch (error) {
      this.handleSocketError({
        message: (error as Error).message,
        event: 'joinGame',
        severity: 'error',
        retryable: false
      });
    }
  }

  placeBet(gameIdOrPlayerId: string, playerIdOrAmount: string | number, amount?: number) {
    try {
      let finalPlayerId: string;
      let finalAmount: number;
      
      if (typeof playerIdOrAmount === 'string' && amount !== undefined) {
        // Old signature: placeBet(gameId, playerId, amount)
        finalPlayerId = playerIdOrAmount;
        finalAmount = amount;
      } else if (typeof playerIdOrAmount === 'number') {
        // New signature: placeBet(playerId, amount)
        finalPlayerId = gameIdOrPlayerId;
        finalAmount = playerIdOrAmount;
      } else {
        throw new Error('Invalid placeBet parameters');
      }
      
      if (!finalPlayerId) {
        throw new Error('Player ID is required');
      }
      
      if (typeof finalAmount !== 'number' || finalAmount <= 0) {
        throw new Error('Bet amount must be a positive number');
      }

      if (!this.socket?.connected) {
        throw new Error('Not connected to server');
      }
      
      // Use the format expected by the server
      if (typeof playerIdOrAmount === 'string' && amount !== undefined) {
        this.socket.emit('placeBet', { gameId: gameIdOrPlayerId, playerId: finalPlayerId, amount: finalAmount });
      } else {
        this.socket.emit('placeBet', { playerId: finalPlayerId, amount: finalAmount });
      }
    } catch (error) {
      this.handleSocketError({
        message: (error as Error).message,
        event: 'placeBet',
        severity: 'error',
        retryable: false
      });
    }
  }

  call(gameId: string, playerId: string, amount: number) {
    if (this.socket?.connected) {
      this.socket.emit('call', { gameId, playerId, amount });
    } else {
      console.warn('Cannot call: socket not connected');
    }
  }

  raise(gameId: string, playerId: string, amount: number) {
    if (this.socket?.connected) {
      this.socket.emit('raise', { gameId, playerId, amount });
    } else {
      console.warn('Cannot raise: socket not connected');
    }
  }

  allIn(gameId: string, playerId: string) {
    if (this.socket?.connected) {
      this.socket.emit('allIn', { gameId, playerId });
    } else {
      console.warn('Cannot go all-in: socket not connected');
    }
  }

  check(gameId: string, playerId: string) {
    if (this.socket?.connected) {
      this.socket.emit('check', { gameId, playerId });
    } else {
      console.warn('Cannot check: socket not connected');
    }
  }

  fold(gameIdOrPlayerId: string, playerId?: string) {
    try {
      let finalPlayerId: string;
      
      if (playerId !== undefined) {
        // Old signature: fold(gameId, playerId)
        finalPlayerId = playerId;
      } else {
        // New signature: fold(playerId)
        finalPlayerId = gameIdOrPlayerId;
      }
      
      if (!finalPlayerId) {
        throw new Error('Player ID is required');
      }

      if (!this.socket?.connected) {
        throw new Error('Not connected to server');
      }
      
      // Use the format expected by the server
      if (playerId !== undefined) {
        this.socket.emit('fold', { gameId: gameIdOrPlayerId, playerId: finalPlayerId });
      } else {
        this.socket.emit('fold', finalPlayerId);
      }
    } catch (error) {
      this.handleSocketError({
        message: (error as Error).message,
        event: 'fold',
        severity: 'error',
        retryable: false
      });
    }
  }

  // New hand management methods
  startNewHand(gameId: string) {
    if (this.socket?.connected) {
      this.socket.emit('game:startNewHand', { gameId });
    } else {
      console.warn('Cannot start new hand: socket not connected');
    }
  }

  getPhaseInfo(gameId: string) {
    if (this.socket?.connected) {
      this.socket.emit('game:getPhaseInfo', { gameId });
    } else {
      console.warn('Cannot get phase info: socket not connected');
    }
  }

  dealCommunityCards(gameId: string) {
    if (this.socket?.connected) {
      this.socket.emit('game:dealCommunityCards', { gameId });
    } else {
      console.warn('Cannot deal community cards: socket not connected');
    }
  }

  forceCompletePhase(gameId: string) {
    if (this.socket?.connected) {
      this.socket.emit('game:forceCompletePhase', { gameId });
    } else {
      console.warn('Cannot force complete phase: socket not connected');
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
    try {
      if (!gameId) {
        throw new Error('Game ID is required');
      }
      
      if (!message?.id || !message?.sender || !message?.text) {
        throw new Error('Invalid message format');
      }
      
      if (message.text.length > 500) {
        throw new Error('Message too long (max 500 characters)');
      }

      if (!this.socket?.connected) {
        throw new Error('Not connected to server');
      }
      
      this.socket.emit('chat:message', { gameId, message });
    } catch (error) {
      this.handleSocketError({
        message: (error as Error).message,
        event: 'chat:message',
        severity: 'warning',
        retryable: false
      });
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
    this.chatMessageListeners.forEach(callback => callback(message));
  }

  private emitSystemMessage(message: string) {
    this.systemMessageListeners.forEach(callback => callback(message));
  }

  // --- Lobby methods ---
  requestLobbyTables() {
    console.log('DEBUG: requestLobbyTables called, socket connected:', this.socket?.connected);
    
    // First, try HTTP fallback immediately if socket is not connected or has failed
    if (!this.socket || !this.socket.connected || this.connectionAttempts >= this.maxConnectionAttempts) {
      console.log('DEBUG: Socket not available, trying HTTP fallback for tables');
      this.tryHttpFallbackForTables();
      return;
    }
    
    console.log('DEBUG: Emitting getLobbyTables immediately');
    this.socket.emit('getLobbyTables');
    
    // Add HTTP fallback after a delay in case socket request fails
    setTimeout(async () => {
      if (this.lobbyTables.length === 0) {
        console.log('DEBUG: Socket getLobbyTables failed, trying HTTP fallback');
        this.tryHttpFallbackForTables();
      }
    }, 5000); // Wait 5 seconds for socket response before falling back
  }

  private async tryHttpFallbackForTables() {
    try {
      console.log('DEBUG: Attempting HTTP fallback for lobby tables');
      const response = await fetch('http://localhost:3001/api/lobby-tables');
      if (response.ok) {
        const tablesData = await response.json();
        console.log('DEBUG: HTTP fallback successful, got', tablesData.length, 'tables');
        this.emitTablesUpdate(tablesData);
      } else {
        throw new Error(`HTTP request failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('DEBUG: HTTP fallback failed:', error);
      this.emitError({ 
        message: 'Unable to load tables. Please refresh the page.', 
        context: 'tables:http_fallback_failed' 
      });
    }
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
    console.log('DEBUG: emitTablesUpdate called with', tables.length, 'tables');
    console.log('DEBUG: Current tablesUpdateListeners count:', this.tablesUpdateListeners.length);
    this.lobbyTables = tables;
    this.tablesUpdateListeners.forEach(callback => callback(tables));
  }

  getLobbyTables(): TableData[] {
    return this.lobbyTables;
  }

  // Updated to match the expected signature for lobby
  joinTable(tableId: number, buyIn: number) {
    console.log(`DEBUG: joinTable called with tableId=${tableId}, buyIn=${buyIn}`);
    console.log(`DEBUG: Socket connected: ${this.socket?.connected}`);
    console.log(`DEBUG: Connection attempts: ${this.connectionAttempts}/${this.maxConnectionAttempts}`);
    console.log(`DEBUG: Socket ID: ${this.socket?.id}`);
    console.log(`DEBUG: isJoiningTable flag: ${this.isJoiningTable}`);
    
    // Prevent multiple simultaneous join attempts
    if (this.isJoiningTable) {
      console.log('DEBUG: Already joining table, ignoring duplicate request');
      return;
    }
    
    this.isJoiningTable = true;
    console.log('DEBUG: Set isJoiningTable = true');
    
    // First, try to leave any existing table
    this.leaveCurrentTable();
    
    if (this.socket?.connected) {
      console.log(`Joining table ${tableId} with buy-in ${buyIn}`);
      
      // Get nickname from localStorage
      const nickname = localStorage.getItem('nickname') || `Player${Math.floor(Math.random() * 1000)}`;
      console.log(`DEBUG: Using nickname: ${nickname}`);
      
      // Add disconnect listener to track if socket disconnects during this process
      const disconnectHandler = (reason: string) => {
        console.error(`DEBUG: Socket disconnected during joinTable process! Reason: ${reason}`);
        console.error(`DEBUG: Socket ID at disconnect: ${this.socket?.id}`);
        console.error(`DEBUG: currentPlayer at disconnect: ${this.currentPlayer}`);
        console.error(`DEBUG: gameState at disconnect: ${this.gameState}`);
        this.isJoiningTable = false; // Reset flag on disconnect
      };
      this.socket.once('disconnect', disconnectHandler);
      
      // Emit join table event
      console.log(`DEBUG: About to emit joinTable event for table ${tableId}`);
      this.socket.emit('joinTable', { tableId, buyIn, nickname });
      console.log(`DEBUG: joinTable event emitted successfully`);
      
      // Set up listeners for table join responses
      this.socket.once('tableJoined', (data) => {
        console.log('DEBUG: tableJoined event received:', data);
        // Don't reset flag yet, wait for gameJoined
        this.socket?.off('disconnect', disconnectHandler);
      });
      
      this.socket.once('gameJoined', (data) => {
        console.log('DEBUG: gameJoined event received in joinTable listener:', data);
        // Reset flag since we successfully joined
        this.isJoiningTable = false;
        console.log('DEBUG: Set isJoiningTable = false after successful gameJoined');
        this.socket?.off('disconnect', disconnectHandler);
      });
      
      this.socket.once('tableError', (error) => {
        console.error('DEBUG: tableError event received:', error);
        this.emitError({ message: error, context: 'table:join_error' });
        // Reset flag on error
        this.isJoiningTable = false;
        console.log('DEBUG: Set isJoiningTable = false after tableError');
        this.socket?.off('disconnect', disconnectHandler);
      });
      
      // Add timeout to reset flag if no response
      setTimeout(() => {
        if (this.isJoiningTable) {
          console.log('DEBUG: joinTable timeout - resetting isJoiningTable flag');
          this.isJoiningTable = false;
          this.socket?.off('disconnect', disconnectHandler);
        }
      }, 30000); // 30 second timeout
      
    } else {
      console.warn('Socket not connected when trying to join table, connecting first');
      
      // Reset flag if connection fails
      this.isJoiningTable = false;
      
      // If we've reached max connection attempts, don't try to connect again
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.error('Max connection attempts reached, cannot join table');
        this.emitError({ 
          message: 'Unable to connect to server. Please refresh the page and try again.', 
          context: 'table:max_attempts_reached' 
        });
        return;
      }
      
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
              
              // Get nickname from localStorage
              const nickname = localStorage.getItem('nickname') || `Player${Math.floor(Math.random() * 1000)}`;
              console.log(`DEBUG: Using nickname: ${nickname}`);
              
              // Add disconnect listener
              const disconnectHandler = (reason: string) => {
                console.error(`DEBUG: Socket disconnected during delayed joinTable! Reason: ${reason}`);
                this.isJoiningTable = false;
              };
              socket.once('disconnect', disconnectHandler);
              
              socket.emit('joinTable', { tableId, buyIn, nickname });
              
              // Set up listeners for table join responses
              socket.once('tableJoined', (data) => {
                console.log('DEBUG: tableJoined event received:', data);
                socket.off('disconnect', disconnectHandler);
              });
              
              socket.once('gameJoined', (data) => {
                console.log('DEBUG: gameJoined event received:', data);
                this.isJoiningTable = false;
                socket.off('disconnect', disconnectHandler);
              });
              
              socket.once('tableError', (error) => {
                console.error('DEBUG: tableError event received:', error);
                this.emitError({ message: error, context: 'table:join_error' });
                this.isJoiningTable = false;
                socket.off('disconnect', disconnectHandler);
              });
              
            } else {
              console.error('Connection was lost after initial connect');
              this.isJoiningTable = false;
              this.emitError({ 
                message: 'Failed to join table: connection was lost', 
                context: 'table:join_failed' 
              });
            }
          }, 2000); // Wait 2 seconds for connection to stabilize
        });
        
        // Add error handler for connection failures
        socket.once('connect_error', (error) => {
          console.error('Connection failed during table join:', error);
          this.isJoiningTable = false;
          this.emitError({ 
            message: 'Failed to connect to server for table join', 
            context: 'table:connection_error' 
          });
        });
        
      } else {
        this.isJoiningTable = false;
        this.emitError({ 
          message: 'Failed to create socket connection for joining table', 
          context: 'table:connection_failed' 
        });
      }
    }
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

  // Create a function to get initial game state
  private getInitialGameState(id: string = '1', players: Player[] = []): GameState {
    console.log(`DEBUG: getInitialGameState called with id=${id}, players=${players.length}`);
    console.log(`DEBUG: getInitialGameState call stack:`, new Error().stack);
    
    const initialState: GameState = {
      id,
      players,
      communityCards: [],
      pot: 0,
      currentPlayerId: null,
      currentPlayerPosition: 0,
      dealerPosition: 0,
      smallBlindPosition: 1,
      bigBlindPosition: 2,
      status: 'waiting',
      phase: 'preflop',
      minBet: 0,
      currentBet: 0,
      smallBlind: 5,
      bigBlind: 10,
      handEvaluation: undefined,
      winner: undefined,
      isHandComplete: false
    };
    
    console.log(`DEBUG: getInitialGameState returning:`, initialState);
    return initialState;
  }

  // For testing purposes only
  getConnectionAttempts(): number {
    return this.connectionAttempts;
  }

  // For testing purposes only
  isLocked(): boolean {
    return this.connectionLock;
  }

  // Add method to reset connection state
  resetConnectionState() {
    console.log('DEBUG: Manually resetting connection state');
    this.connectionAttempts = 0;
    this.connectionLock = false;
    this.isConnecting = false;
    this.lastConnectionAttempt = 0;
  }

  private handleDisconnect(reason: string) {
    this.isConnecting = false;
    this.connectionLock = false;
    
    // Only attempt reconnection for transport-related disconnects
    if (reason === 'transport close' || reason === 'transport error') {
      console.log(`Disconnected due to ${reason}, attempting reconnection...`);
      
      // Don't attempt reconnection if we've reached max attempts
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.error(`Already reached maximum connection attempts (${this.maxConnectionAttempts}), not attempting to reconnect`);
        const error = {
          message: `Failed to connect after ${this.maxConnectionAttempts} attempts`,
          context: 'socket:max_attempts'
        };
        
        // First emit through the socket
        if (this.socket) {
          this.socket.emit('error', error);
        }
        
        // Then emit through our error emitter
        this.emitError(error);
        
        // Finally, clean up the socket to prevent further connection attempts
        if (this.socket) {
          this.removeAllSocketListeners();
          this.socket.disconnect();
          this.socket = null;
        }
        return;
      }
      
      // Calculate backoff time based on test mode and attempts
      const backoffTime = this.isTestMode ? 0 : this.reconnectionBackoff * Math.pow(2, this.connectionAttempts);
      console.log(`Will retry connection in ${backoffTime/1000} seconds`);
      
      setTimeout(() => {
        if (!this.socket?.connected) {
          this.connect();
        }
      }, backoffTime);
    } else {
      console.log(`Disconnected due to ${reason}, no reconnection needed`);
    }
  }

  private emit(event: string, data?: any) {
    this.eventEmitter.emit(event, data);
  }

  on(event: string, callback: (data?: any) => void) {
    this.eventEmitter.on(event, callback);
  }

  off(event: string, callback: (data?: any) => void) {
    this.eventEmitter.off(event, callback);
  }

  private emitGameStateUpdate(state: GameState) {
    this.gameStateListeners.forEach(callback => callback(state));
  }

  // Enhanced error handling with retry logic
  private handleSocketError = (error: { message: string; event?: string; severity?: string; retryable?: boolean }) => {
    const errorObj = {
      message: error.message,
      context: error.event || 'socket:unknown',
      severity: error.severity || 'error',
      retryable: error.retryable || false
    };

    this.emitError(errorObj);
    
    // If error is retryable, add to retry queue
    if (error.retryable && error.event && this.retryQueue.length < 10) {
      // Find the last attempted event data from socket emit calls
      this.retryQueue.push({
        event: error.event,
        data: null, // This would need to be stored from the original call
        attempts: 0
      });
    }
  };

  private processRetryQueue = () => {
    if (!this.socket?.connected) return;

    this.retryQueue = this.retryQueue.filter(item => {
      if (item.attempts >= 3) {
        console.warn(`Max retry attempts reached for ${item.event}`);
        return false;
      }

      // Retry after exponential backoff
      const delay = Math.pow(2, item.attempts) * 1000;
      setTimeout(() => {
        if (this.socket?.connected) {
          this.socket.emit(item.event, item.data);
          item.attempts++;
        }
      }, delay);

      return true;
    });
  };

  // Add method to leave current table
  leaveCurrentTable() {
    if (this.socket?.connected && this.currentGameId) {
      console.log(`DEBUG: Leaving current table/game: ${this.currentGameId}`);
      this.socket.emit('leaveTable', { tableId: this.currentGameId });
      
      // Clear current state
      this.currentGameId = null;
      this.gameState = null;
      this.currentPlayer = null;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createObserverAvatar = (nickname: string): AvatarType => ({
  type: 'initials',
  initials: nickname.substring(0, 2).toUpperCase(),
  color: '#1abc9c'
});

export const socketService = new SocketService(); 