import { io, Socket } from 'socket.io-client';
import { GameState, Player } from '../types/game';
import { TableData } from '../types/table';
import { cookieService } from './cookieService';
import { errorTrackingService } from './errorTrackingService';
import { navigationService } from './navigationService';
import { EventEmitter } from 'events';

export type SeatState = { [seatNumber: number]: string | null };

type SeatUpdateCallback = (seats: SeatState) => void;
type SeatErrorCallback = (error: string) => void;
type OnlineUsersCallback = (players: Player[], observers: string[]) => void;
type ErrorCallback = (error: { message: string; context?: string; suggestedNames?: string[] }) => void;
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
  private players: any[] = [];
  private currentUserId: string | null = null;
  private currentUserLocation: string = 'lobby'; // Track current user's location

  // Event listeners
  private errorListeners: ((error: { message: string; context: string; severity?: string; retryable?: boolean; suggestedNames?: string[] }) => void)[] = [];
  private chatMessageListeners: ((message: ChatMessage) => void)[] = [];
  private systemMessageListeners: ((message: string) => void)[] = [];
  private gameStateListeners: ((state: GameState) => void)[] = [];
  private seatUpdateListeners: ((seats: SeatState) => void)[] = [];
  private seatErrorListeners: ((error: string) => void)[] = [];
  private tablesUpdateListeners: ((tables: TableData[]) => void)[] = [];
  private onlineUsersListeners: ((players: Player[], observers: string[]) => void)[] = [];

  constructor() {
    // Set up event emitter with higher max listeners to avoid warnings
    this.eventEmitter.setMaxListeners(50);
    
    // Auto-detect test environment
    if (typeof window !== 'undefined' && (window as any).Cypress) {
      this.setTestMode(true);
      console.log('DEBUG: Cypress detected, enabling test mode');
    }

    // Add to window for debugging (non-production only)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).socketService = this;
      console.log('🔧 FRONTEND: SocketService available on window.socketService for debugging');
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
      
      // Log initial user status
      this.currentUserId = socket.id || null;
      console.log(`🔌 FRONTEND: Socket connected with ID: ${socket.id}`);
      console.log(`📍 FRONTEND: Initial location: ${this.currentUserLocation}`);
      this.logCurrentUserStatus();
      
      // Process any queued retries
      this.processRetryQueue();
    });

    socket.on('observer:joined', (data: { observer: string }) => {
      console.log('DEBUG: Frontend received observer:joined event:', data);
      console.log('DEBUG: Frontend current observers before:', this.observers);
      if (!this.observers.includes(data.observer)) {
        this.observers.push(data.observer);
        console.log('DEBUG: Frontend added observer, new list:', this.observers);
        this.emitOnlineUsersUpdate();
      } else {
        console.log('DEBUG: Frontend observer already in list:', data.observer);
      }
    });

    socket.on('location:updated', (data: { playerId: string; nickname: string; location?: string; table?: number | null; seat?: number | null }) => {
      console.log('DEBUG: Frontend received location:updated event:', data);
      this.handleLocationUpdate(data);
    });

    socket.on('location:usersAtTable', (data: { tableId: number; observers: string[]; players: { nickname: string; seatNumber: number }[] }) => {
      console.log('DEBUG: Frontend received location:usersAtTable event:', data);
      this.observers = data.observers;
      this.emitOnlineUsersUpdate();
    });

    socket.on('seatTaken', (data: { seatNumber: number; playerId: string; gameState: any }) => {
      console.log('DEBUG: Frontend received seatTaken event:', data);
      
      // Update location if this is for the current user
      if (this.socket?.id === data.playerId) {
        // Extract table ID from current game state or current location
        const tableIdMatch = this.currentUserLocation.match(/table-(\d+)/);
        if (tableIdMatch) {
          const tableId = tableIdMatch[1];
          this.currentUserLocation = `table-${tableId}-seat-${data.seatNumber}`;
          console.log(`🎯 FRONTEND: Took seat ${data.seatNumber}, location updated to: ${this.currentUserLocation}`);
          this.logCurrentUserStatus();
        }
      }
      
      // Update game state immediately
      if (data.gameState) {
        this.gameState = data.gameState;
        this.emitGameStateUpdate(data.gameState);
      }
      
      // The location:updated event will handle user list updates
      // Find the player who took the seat and remove them from observers
      if (data.gameState && data.gameState.players) {
        const playerWhoTookSeat = data.gameState.players.find((p: any) => p && p.id === data.playerId);
        if (playerWhoTookSeat && playerWhoTookSeat.name) {
          console.log('DEBUG: Removing player from observers after seatTaken:', playerWhoTookSeat.name);
          this.observers = this.observers.filter(observer => observer !== playerWhoTookSeat.name);
          this.emitOnlineUsersUpdate();
        }
      }
    });

    socket.on('seat:update', (seats: SeatState) => {
      this.emitSeatUpdate(seats);
    });

    socket.on('seat:accepted', (data: { seatNumber: number; playerId: string; player: Player }) => {
      try {
        // Update the game state with the new player
        if (this.gameState && data && data.player && data.player.id) {
          // Find if player already exists or add new player
          const existingPlayerIndex = this.gameState.players.findIndex(p => p && p.id === data.player.id);
          if (existingPlayerIndex !== -1) {
            this.gameState.players[existingPlayerIndex] = data.player;
          } else {
            this.gameState.players.push(data.player);
          }
          
          this.emitGameStateUpdate(this.gameState);
          this.emitOnlineUsersUpdate(); // Update the online users list
        }
        this.emitSeatUpdate({ [data.seatNumber]: data.playerId });
      } catch (error) {
        console.error('Error in seat:accepted handler:', error);
        console.error('Data received:', data);
        console.error('Current gameState:', this.gameState);
      }
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
      try {
        console.log('DEBUG: Frontend received playerJoined event:', data);
        if (this.gameState && data && data.player && data.player.id) {
          // Check if player already exists in the game state
          const existingPlayerIndex = this.gameState.players.findIndex(p => p && p.id === data.player.id);
          if (existingPlayerIndex === -1) {
            this.gameState.players.push(data.player);
            
            this.emitGameStateUpdate(this.gameState);
            this.emitOnlineUsersUpdate(); // Update the online users list
          }
        }
      } catch (error) {
        console.error('Error in playerJoined handler:', error);
        console.error('Data received:', data);
        console.error('Current gameState:', this.gameState);
      }
    });

    socket.on('playerLeft', (playerId: string) => {
      if (this.gameState && playerId) {
        const player = this.gameState.players.find(p => p && p.id === playerId);
        if (player) {
          // Add to observers if not already there
          if (!this.observers.includes(player.name)) {
            this.observers = [...this.observers, player.name];
          }
          
          // Remove from players list
          this.gameState.players = this.gameState.players.filter(p => p && p.id !== playerId);
          
          console.log('DEBUG: Player left and moved to observers:', player.name);
          console.log('DEBUG: Current observers:', this.observers);
          console.log('DEBUG: Remaining players:', this.gameState.players.length);
          
          // Emit update with proper current state
          this.emitGameStateUpdate(this.gameState);
          this.emitOnlineUsersUpdate();
        }
      }
    });

    socket.on('player:statusUpdated', (data: { playerId: string; isAway: boolean }) => {
      if (this.gameState && data && data.playerId) {
        const player = this.gameState.players.find(p => p && p.id === data.playerId);
        if (player) {
          player.isAway = data.isAway;
          this.emitGameStateUpdate(this.gameState);
        }
      }
    });

    socket.on('player:stoodUp', (data: { playerId: string }) => {
      if (this.gameState && data && data.playerId) {
        this.gameState.players = this.gameState.players.filter(p => p && p.id !== data.playerId);
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
      
      // Reset the joining flag immediately when table join is successful
      this.isJoiningTable = false;
      console.log('DEBUG: isJoiningTable flag reset to false after successful tableJoined');
      
      // Update location based on role
      if (data.role === 'observer') {
        this.currentUserLocation = `table-${data.tableId}`;
        console.log(`🎯 FRONTEND: Joined as observer, location updated to: ${this.currentUserLocation}`);
      } else if (data.role === 'player') {
        // For players, we'll get the exact seat from the seatTaken event
        console.log(`🎯 FRONTEND: Joined as player at table ${data.tableId}, waiting for seat assignment`);
      }
      
      if (data.gameId) {
        // Store the game ID for this session
        this.currentGameId = data.gameId;
        console.log('DEBUG: Frontend stored gameId:', this.currentGameId);
      }
      
      this.logCurrentUserStatus();
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
      // Check if user is joining as an observer or as a player
      const currentPlayer = data.gameState && data.gameState.players && data.playerId 
        ? data.gameState.players.find(p => p && p.id === data.playerId) 
        : null;
      if (currentPlayer) {
        console.log('DEBUG: Frontend found and setting currentPlayer:', currentPlayer);
        this.currentPlayer = currentPlayer;
      } else if (data.playerId) {
        // User joined as observer - they won't be in players array until they take a seat
        console.log('DEBUG: Frontend user joined as observer (not in players array yet)');
        console.log('DEBUG: Frontend observer ID:', data.playerId);
        console.log('DEBUG: Frontend current players in game:', data.gameState.players.length);
        this.currentPlayer = null; // Clear any previous player state
      } else {
        console.log('DEBUG: Frontend no playerId provided - viewing game as guest');
        this.currentPlayer = null;
      }
      
      // Emit the updated game state
      this.emitGameStateUpdate(data.gameState);
      console.log('DEBUG: Frontend emitted gameStateUpdate');
    });

    socket.on('tableError', (error: string) => {
      console.log('DEBUG: Frontend received tableError event:', error);
      console.log('DEBUG: Frontend socket still connected:', socket.connected);
      
      // Reset the joining flag on error
      this.isJoiningTable = false;
      console.log('DEBUG: isJoiningTable flag reset to false after tableError');
      
      this.emitError({ message: error, context: 'table:error' });
    });

    socket.on('nicknameError', (data: { message: string; suggestedNames?: string[] }) => {
      console.log('DEBUG: Frontend received nicknameError event:', data);
      this.emitError({ 
        message: data.message, 
        context: 'nickname:error',
        suggestedNames: data.suggestedNames 
      });
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

    // Handle player connection status events
    socket.on('player:disconnected', (data: { playerId: string; nickname: string; timeoutSeconds: number }) => {
      console.log('DEBUG: Frontend received player:disconnected event:', data);
      this.emitSystemMessage(`Player ${data.nickname} disconnected and will be removed from their seat if not reconnected within ${data.timeoutSeconds} seconds.`);
    });

    socket.on('player:reconnected', (data: { playerId: string; nickname: string }) => {
      console.log('DEBUG: Frontend received player:reconnected event:', data);
      this.emitSystemMessage(`Player ${data.nickname} reconnected.`);
    });

    socket.on('player:removedFromSeat', (data: { playerId: string; nickname: string; seatNumber: number; reason: string }) => {
      console.log('DEBUG: Frontend received player:removedFromSeat event:', data);
      
      if (this.gameState) {
        // Remove player from game state
        const removedPlayer = this.gameState.players.find(p => p && p.id === data.playerId);
        if (removedPlayer) {
          // Remove from players list
          this.gameState.players = this.gameState.players.filter(p => p && p.id !== data.playerId);
          
          // Add to observers if not already there
          if (!this.observers.includes(data.nickname)) {
            this.observers = [...this.observers, data.nickname];
          }
          
          // Emit updates
          this.emitGameStateUpdate(this.gameState);
          this.emitOnlineUsersUpdate();
          
          console.log(`DEBUG: Moved player ${data.nickname} from seat ${data.seatNumber} to observers due to: ${data.reason}`);
        }
      }
      
      this.emitSystemMessage(`Player ${data.nickname} was removed from seat ${data.seatNumber} (${data.reason})`);
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
    this.connectionAttempts = 0;
    this.isConnecting = false;
    this.connectionLock = false;
    console.log('Connection successful, resetting connection attempts counter');

    // Check if nickname is stored and emit a login event
    const savedNickname = cookieService.getNickname();
    const savedSeatNumber = cookieService.getSeatNumber();
    
    console.log('DEBUG: Connection established with saved nickname:', savedNickname, 'seat:', savedSeatNumber);
    
    // Request lobby tables on successful connection
    this.requestLobbyTables();

    // Start heartbeat mechanism
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping');
      } else {
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = undefined;
        }
      }
    }, 30000);

    // Set up event listeners for observer management
    if (this.socket) {
      // NOTE: observer:joined and observer:left handlers are already set up in setupListeners()
      // We don't need duplicate handlers here
      
      this.socket.on('playerJoined', (player: Player) => {
        if (!this.gameState) {
          this.gameState = this.getInitialGameState();
        }

        if (this.gameState && player && player.id) {
          const existingPlayerIndex = this.gameState.players.findIndex(p => p && p.id === player.id);
          if (existingPlayerIndex !== -1) {
            this.gameState.players[existingPlayerIndex] = player;
          } else {
            this.gameState.players = [...this.gameState.players, player];
          }
        }
        
        // Remove player from observers list when they become a player
        if (player && player.name) {
          this.observers = this.observers.filter(observer => observer !== player.name);
          
          // Emit update with the new state - send the updated player and filtered observers
          this.onlineUsersListeners.forEach(callback => {
            callback([player], this.observers);
          });
        }
      });

      this.socket.on('playerLeft', (playerId: string) => {
        if (this.gameState && playerId) {
          const player = this.gameState.players.find(p => p && p.id === playerId);
          if (player) {
            // Add to observers if not already there
            if (!this.observers.includes(player.name)) {
              this.observers = [...this.observers, player.name];
            }
            
            // Remove from players list
            this.gameState.players = this.gameState.players.filter(p => p && p.id !== playerId);
            
            console.log('DEBUG: Player left and moved to observers:', player.name);
            console.log('DEBUG: Current observers:', this.observers);
            console.log('DEBUG: Remaining players:', this.gameState.players.length);
            
            // Emit update with proper current state
            this.emitGameStateUpdate(this.gameState);
            this.emitOnlineUsersUpdate();
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
    if (!this.gameState || !this.currentPlayer || !this.currentPlayer.id) return null;
    const player = this.gameState.players.find(p => p && p.id === this.currentPlayer?.id);
    return player?.seatNumber ?? null;
  }

  // --- Error handling ---
  onError(callback: ErrorCallback) {
    this.errorListeners.push(callback);
    return () => {
      this.errorListeners = this.errorListeners.filter(cb => cb !== callback);
    };
  }

  private emitError(error: { message: string; context: string; suggestedNames?: string[] }) {
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

  /**
   * Handle location update events to manage observers and players lists
   * Public method for testing purposes
   */
  public handleLocationUpdate(data: { playerId: string; nickname: string; location?: string; table?: number | null; seat?: number | null }) {
    const { playerId, nickname } = data;
    
    // Convert new table/seat format to location string for backward compatibility
    let location: string;
    if (data.location) {
      // Old format - use the location string directly
      location = data.location;
    } else if (data.table !== undefined && data.seat !== undefined) {
      // New format - convert table/seat to location string
      if (data.table === null) {
        location = 'lobby';
      } else if (data.seat === null) {
        location = `table-${data.table}`;
      } else {
        location = `table-${data.table}-seat-${data.seat}`;
      }
    } else {
      console.warn('Invalid location update data:', data);
      return;
    }
    
    // Check if this update is for the current user
    const isCurrentUser = this.socket?.id === playerId;
    
    if (isCurrentUser) {
      this.currentUserLocation = location;
      console.log(`🎯 FRONTEND: Current user location updated to: ${location}`);
      console.log(`🎯 FRONTEND: Current user (${nickname}) is now at: ${this.parseLocationForDisplay(location)}`);
      
      // Automatic navigation based on location
      this.handleLocationBasedNavigation(location);
    }
    
    // Parse location to determine user's new state
    if (location === 'lobby') {
      // User moved to lobby - remove from observers and players
      this.observers = this.observers.filter(observer => observer !== nickname);
      this.emitOnlineUsersUpdate();
      
    } else if (location.startsWith('table-') && !location.includes('-seat-')) {
      // User is observing a table (location: "table-X")
      if (!this.observers.includes(nickname)) {
        this.observers.push(nickname);
      }
      this.emitOnlineUsersUpdate();
      
    } else if (location.includes('-seat-')) {
      // User took a seat (location: "table-X-seat-Y")
      // Remove from observers if they were observing
      this.observers = this.observers.filter(observer => observer !== nickname);
      this.emitOnlineUsersUpdate();
    }
    
    console.log(`DEBUG: Frontend processed location update for ${nickname}: ${location}`);
    console.log(`DEBUG: Frontend observers after update:`, this.observers);
    
    // Log current user status every location update
    this.logCurrentUserStatus();
  }

  /**
   * Handle automatic navigation based on location changes
   */
  private handleLocationBasedNavigation(location: string) {
    // Only navigate if in browser environment
    if (typeof window === 'undefined') return;
    
    if (location === 'lobby') {
      // If user location is lobby but not on lobby page, redirect
      if (!navigationService.isOnLobby()) {
        console.log('🚀 FRONTEND: Location is lobby but not on lobby page, redirecting...');
        console.log(`🚀 FRONTEND: Current path: ${navigationService.getCurrentPath()}`);
        navigationService.navigateToLobby(true);
      }
    } else if (location.startsWith('table-')) {
      // If user is at a table, they should be on the corresponding game page
      const tableMatch = location.match(/^table-(\d+)/);
      if (tableMatch) {
        const tableId = tableMatch[1];
        const currentGameId = navigationService.getCurrentGameId();
        
        // If not on the correct game page, navigate there
        if (!navigationService.isOnGamePage() || currentGameId !== tableId) {
          console.log(`🚀 FRONTEND: Location is ${location}, navigating to game page for table ${tableId}`);
          console.log(`🚀 FRONTEND: Current path: ${navigationService.getCurrentPath()}`);
          navigationService.navigateToGame(tableId, true);
        }
      }
    }
  }

  /**
   * Parse location string for human-readable display
   */
  private parseLocationForDisplay(location: string): string {
    if (location === 'lobby') {
      return 'Lobby (browsing tables)';
    }
    
    const tableMatch = location.match(/^table-(\d+)$/);
    if (tableMatch) {
      return `Table ${tableMatch[1]} (observing)`;
    }
    
    const seatMatch = location.match(/^table-(\d+)-seat-(\d+)$/);
    if (seatMatch) {
      return `Table ${seatMatch[1]}, Seat ${seatMatch[2]} (playing)`;
    }
    
    return location;
  }

  /**
   * Log current user's status for debugging
   */
  private logCurrentUserStatus() {
    console.log(`📍 FRONTEND: Current User Status:`);
    console.log(`   Socket ID: ${this.socket?.id || 'Not connected'}`);
    console.log(`   Location: ${this.currentUserLocation}`);
    console.log(`   Parsed: ${this.parseLocationForDisplay(this.currentUserLocation)}`);
    console.log(`   Total observers: ${this.observers.length}`);
    console.log(`   Total players: ${this.gameState?.players?.length || 0}`);
  }

  /**
   * Get current user's location (public method for debugging)
   */
  getCurrentUserLocation(): string {
    return this.currentUserLocation;
  }

  // --- Seat management ---
  requestSeat(nickname: string, seatNumber: number, buyIn?: number) {
    try {
      if (!nickname || seatNumber === undefined) {
        throw new Error('Invalid seat request parameters');
      }
      
      if (!this.socket?.connected) {
        console.warn('Socket not connected when requesting seat, connecting first');
        this.connect();
        
        // Add a listener for when connection is established
        this.socket?.once('connect', () => {
          this.socket?.emit('seat:request', { nickname, seatNumber, buyIn });
        });
        return;
      }
      
      this.socket.emit('seat:request', { nickname, seatNumber, buyIn });
      
      // Add player to observers initially
      if (!this.observers.includes(nickname)) {
        this.observers.push(nickname);
        this.emitOnlineUsersUpdate();
      }
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'requestSeat', {
        nickname,
        seatNumber,
        buyIn,
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

  // Immediately update user location in backend when join button is clicked
  updateUserLocationImmediate(tableId: number, nickname: string) {
    if (!this.socket) {
      console.error('No socket connection available for location update');
      return;
    }

    if (!this.socket.connected) {
      console.error('Socket not connected for location update');
      return;
    }

    const targetLocation = `table-${tableId}`;
    console.log(`🎯 FRONTEND: Sending immediate location update to backend - ${nickname} → ${targetLocation}`);
    
    // Emit immediate location update event to backend
    this.socket.emit('updateUserLocation', { 
      tableId, 
      nickname, 
      location: targetLocation 
    });
  }

  // Updated to match the expected signature for lobby
  joinTable(tableId: number, buyIn?: number) {
    // Store previous location for potential rollback
    const previousLocation = this.currentUserLocation;
    
    // Update location immediately when joining table (before backend processing)
    const targetLocation = `table-${tableId}`;
    this.currentUserLocation = targetLocation;
    console.log(`🎯 FRONTEND: Immediately updating location to: ${targetLocation} when joining table ${tableId}`);
    this.logCurrentUserStatus();
    
    if (!this.socket) {
      console.error('No socket connection available');
      // Revert location on connection error
      this.currentUserLocation = previousLocation;
      console.log(`🎯 FRONTEND: Reverted location to: ${previousLocation} due to connection error`);
      this.emitError({ message: 'No connection to server', context: 'connection:error' });
      return;
    }

    if (this.isJoiningTable) {
      console.warn('Already joining a table, ignoring duplicate request');
      // Revert location since join is blocked
      this.currentUserLocation = previousLocation;
      console.log(`🎯 FRONTEND: Reverted location to: ${previousLocation} due to join in progress`);
      return;
    }

    this.isJoiningTable = true;
    console.log(`DEBUG: isJoiningTable set to true for table ${tableId}`);
    
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
        this.socket?.off('disconnect', disconnectHandler);
      });
      
      this.socket.once('gameJoined', (data) => {
        console.log('DEBUG: gameJoined event received in joinTable listener:', data);
        this.isJoiningTable = false;
        this.socket?.off('disconnect', disconnectHandler);
      });
      
      this.socket.once('tableError', (error) => {
        console.error('DEBUG: tableError event received:', error);
        // Revert location on join error
        this.currentUserLocation = previousLocation;
        console.log(`🎯 FRONTEND: Reverted location to: ${previousLocation} due to table join error`);
        this.emitError({ message: error, context: 'table:join_error' });
        this.isJoiningTable = false;
        this.socket?.off('disconnect', disconnectHandler);
      });
    } else {
      console.error('Socket not connected');
      // Revert location on connection error
      this.currentUserLocation = previousLocation;
      console.log(`🎯 FRONTEND: Reverted location to: ${previousLocation} due to socket not connected`);
      this.emitError({ message: 'Not connected to server', context: 'connection:error' });
      this.isJoiningTable = false;
    }
  }

  private removeAllSocketListeners() {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    this.seatUpdateListeners = [];
    this.seatErrorListeners = [];
    this.onlineUsersListeners = [];
    this.errorListeners = [];
    this.chatMessageListeners = [];
    this.systemMessageListeners = [];
    this.tablesUpdateListeners = [];
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

  private getInitialGameState(id: string = '1', players: Player[] = []): GameState {
    return {
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
  }

  getConnectionAttempts(): number {
    return this.connectionAttempts;
  }

  isLocked(): boolean {
    return this.connectionLock;
  }

  resetConnectionState() {
    this.connectionAttempts = 0;
    this.isConnecting = false;
    this.connectionLock = false;
    this.lastConnectionAttempt = 0;
  }

  emitGameAction(action: string, amount?: number) {
    if (!this.socket?.connected) {
      console.warn('Cannot emit game action: socket not connected');
      return;
    }
    
    if (!this.currentPlayer?.id || !this.currentGameId) {
      console.warn('Cannot emit game action: no current player or game');
      return;
    }

    const actionData = {
      gameId: this.currentGameId,
      playerId: this.currentPlayer.id,
      action,
      ...(amount !== undefined && { amount })
    };

    console.log('DEBUG: Emitting game action:', actionData);
    this.socket.emit('game:action', actionData);
  }

  private handleDisconnect(reason: string) {
    console.log('DEBUG: handleDisconnect called with reason:', reason);
    
    if (reason !== 'io client disconnect' && reason !== 'transport close' && !this.isConnecting) {
      setTimeout(() => {
        if (!this.socket?.connected) {
          this.connect();
        }
      }, this.reconnectionBackoff);
      
      this.reconnectionBackoff = Math.min(this.reconnectionBackoff * 2, 30000);
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

  /**
   * Check if current user is present in players or observers list
   * If not present but on game page, redirect to lobby
   */
  private checkUserPresenceAndRedirect(state: GameState) {
    // Only perform check if we're in browser environment
    if (typeof window === 'undefined') return;
    
    const currentPath = window.location.pathname;
    
    // Only check if user is on a game page (not lobby)
    if (!currentPath.includes('/game/')) return;
    
    const savedNickname = cookieService.getNickname();
    if (!savedNickname) {
      console.log('🚀 REDIRECT: No nickname found, redirecting to lobby');
      navigationService.navigate('/', true);
      return;
    }
    
    // Extract table ID from path (e.g., /game/3 -> 3)
    const tableIdMatch = currentPath.match(/\/game\/(\d+)/);
    const currentTableId = tableIdMatch ? tableIdMatch[1] : null;
    
    // Check if user's location indicates they should be at this table
    const expectedLocation = currentTableId ? `table-${currentTableId}` : null;
    const userLocation = this.currentUserLocation;
    
    // If user's location matches expected location, they're in the right place
    if (expectedLocation && userLocation === expectedLocation) {
      console.log(`🎯 PRESENCE: User location "${userLocation}" matches expected "${expectedLocation}", allowing stay`);
      return;
    }
    
    // Check if user is in players list
    const isPlayer = state && state.players && state.players.some(player => 
      player && player.name === savedNickname
    );
    
    // Check if user is in observers list
    const isObserver = this.observers.includes(savedNickname);
    
    if (!isPlayer && !isObserver) {
      console.log(`🚀 REDIRECT: User "${savedNickname}" not found in players or observers list`);
      console.log(`🚀 REDIRECT: User location: "${userLocation}", Expected: "${expectedLocation}"`);
      console.log('🚀 REDIRECT: Current players:', state?.players?.map(p => p?.name) || []);
      console.log('🚀 REDIRECT: Current observers:', this.observers);
      
      // Use navigationService to redirect to lobby
      navigationService.navigate('/', true);
      
      // Also emit a system message to explain why they were redirected
      this.emitSystemMessage('You have been redirected to the lobby because you are not connected to this table.');
    }
  }

  private emitGameStateUpdate(state: GameState) {
    // Filter out any undefined/null players to prevent runtime errors
    if (state && state.players) {
      state.players = state.players.filter(p => p && p.id);
    }
    
    // Check if current user should be at this table - if not, redirect to lobby
    this.checkUserPresenceAndRedirect(state);
    
    this.gameStateListeners.forEach(callback => callback(state));
  }

  private handleSocketError = (error: { message: string; event?: string; severity?: string; retryable?: boolean }) => {
    const errorObj = {
      message: error.message,
      context: error.event || 'socket:unknown',
      severity: error.severity || 'error',
      retryable: error.retryable || false
    };

    this.emitError(errorObj);
    
    if (error.retryable && error.event && this.retryQueue.length < 10) {
      this.retryQueue.push({
        event: error.event,
        data: null,
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

  leaveCurrentTable() {
    if (this.socket?.connected && this.currentGameId) {
      console.log(`DEBUG: Leaving current table/game: ${this.currentGameId}`);
      this.socket.emit('leaveTable', { tableId: this.currentGameId });
      
      this.currentGameId = null;
      this.gameState = null;
      this.currentPlayer = null;
    }
  }
}

export const socketService = new SocketService();