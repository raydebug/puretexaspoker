import { io, Socket } from 'socket.io-client';
import { GameState, Player } from '../types/game';
import { TableData } from '../types/table';
import { cookieService } from './cookieService';
import { errorTrackingService } from './errorTrackingService';
import { navigationService } from './navigationService';
import { EventEmitter } from 'events';

const SOCKET_URL = 'http://localhost:3001';

export type SeatState = { [seatNumber: number]: string | null };

type SeatUpdateCallback = (seats: SeatState) => void;
type SeatErrorCallback = (error: string) => void;
export type OnlineUsersCallback = (onlineUsers: number) => void;
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

interface ExtendedSocket extends Socket {
  addListener: (event: string, listener: (...args: any[]) => void) => this;
  setMaxListeners: (n: number) => this;
  getMaxListeners: () => number;
  rawListeners: (event: string) => Function[];
}

export class SocketService {
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
  private isJoiningTable = false;
  private players: any[] = [];
  private currentUserId: string | null = null;
  private currentUserTable: number | null = null;
  private currentUserSeat: number | null = null;
  private isPlayer: boolean = false;
  private isObserver: boolean = false;
  private onlineUsersCallback: OnlineUsersCallback | null = null;
  private isConnected = false;

  // Event listeners
  private errorListeners: ErrorCallback[] = [];
  private chatMessageListeners: ChatMessageCallback[] = [];
  private systemMessageListeners: ((message: string) => void)[] = [];
  private gameStateListeners: ((state: GameState) => void)[] = [];
  private seatUpdateListeners: SeatUpdateCallback[] = [];
  private seatErrorListeners: ((error: string) => void)[] = [];
  private tablesUpdateListeners: ((tables: TableData[]) => void)[] = [];

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

  private handleConnectionError(error: any) {
    console.error('Connection error:', error);
    this.emitError({
      message: `Failed to connect: ${error.message}`,
      context: 'socket:connect_error'
    });
    this.isConnected = false;
  }

  connect() {
    if (this.isConnected || this.isConnecting) {
      console.log('Socket already connected or connecting');
      return;
    }

    if (this.connectionLock) {
      console.log('Connection locked, waiting for previous attempt to complete');
      return;
    }

    this.connectionLock = true;
    this.isConnecting = true;
    this.lastConnectionAttempt = Date.now();

    try {
      if (!this.socket) {
        const socket = io(SOCKET_URL, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: this.maxConnectionAttempts,
          reconnectionDelay: this.reconnectionBackoff,
        });
        this.socket = socket as unknown as ExtendedSocket;
        this.setupListeners();
      }

      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }

      this.onSuccessfulConnection();
    } catch (error) {
      console.error('Error connecting to socket:', error);
      this.handleConnectionError(error);
    } finally {
      this.connectionLock = false;
      this.isConnecting = false;
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
      console.log(`📍 FRONTEND: Initial location: table=${this.currentUserTable}, seat=${this.currentUserSeat}`);
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
      console.log('🎯 FRONTEND: Received location:updated event:', data);
      console.log('🎯 FRONTEND: Current observers before update:', this.observers);
      this.handleLocationUpdate(data);
      console.log('🎯 FRONTEND: Current observers after update:', this.observers);
      console.log('🎯 FRONTEND: Broadcasting observer update to UI components');
    });

    socket.on('location:usersAtTable', (data: { tableId: number; totalUsers: number }) => {
      console.log('DEBUG: Frontend received location:usersAtTable event:', data);
      // Update the total users count in the UI
      this.emitOnlineUsersUpdate();
    });

    socket.on('seatTaken', (data: { seatNumber: number; playerId: string; gameState: any }) => {
      console.log('DEBUG: Frontend received seatTaken event:', data);
      
      // Update location if this is for the current user
      if (this.socket?.id === data.playerId) {
        // Set player state first
        const playerWhoTookSeat = data.gameState?.players?.find((p: any) => p && p.id === data.playerId);
        if (playerWhoTookSeat) {
          this.currentPlayer = playerWhoTookSeat;
          console.log(`🎯 FRONTEND: Set current player state for seat ${data.seatNumber}:`, playerWhoTookSeat);
        }

        // Then update location
        if (this.currentUserTable !== null) {
          this.currentUserSeat = data.seatNumber;
          console.log(`🎯 FRONTEND: Took seat ${data.seatNumber}, location updated to: table=${this.currentUserTable}, seat=${this.currentUserSeat}`);
          this.logCurrentUserStatus();
        }
      }
      
      // Update game state immediately
      if (data.gameState) {
        this.gameState = data.gameState;
        this.emitGameStateUpdate(data.gameState);
      }
      
      // Remove from observers list after player state is set
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

    // Handle new takeSeat error format 
    socket.on('seatError', (error: string) => {
      console.log('DEBUG: Frontend received seatError event:', error);
      this.emitSeatError(error);
      this.emitError({ message: error, context: 'seat:error' });
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
        this.currentUserTable = data.tableId;
        this.currentUserSeat = null;
        console.log(`🎯 FRONTEND: Joined as observer, location updated to: table=${this.currentUserTable}, seat=${this.currentUserSeat}`);
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
      this.handleDisconnect();
    });

    socket.on('onlineUsers', (count: number) => {
      if (this.onlineUsersCallback) {
        this.onlineUsersCallback(count);
      }
    });
  }

  private onSuccessfulConnection() {
    console.log('DEBUG: Connected to server successfully with ID:', this.socket?.id);
    this.connectionAttempts = 0;
    this.isConnecting = false;
    this.connectionLock = false;
    this.isConnected = true;
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
        this.isConnected = false;
      }
    }, 30000);

    // Set up event listeners for observer management
    if (this.socket) {
      // NOTE: observer:joined and observer:left handlers are already set up in setupListeners()
      // We don't need duplicate handlers here
      
      this.socket.on('playerJoined', (player: Player) => {
        if (!this.gameState) {
          this.gameState = null; // Initialize as null, will be set by game state events
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
          this.emitOnlineUsersUpdate();
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
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = undefined;
      }
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
    this.onlineUsersCallback = callback;
  }

  private emitOnlineUsersUpdate() {
    const players = this.gameState?.players || [];
    const totalUsers = players.length + this.observers.length;
    this.onlineUsersCallback?.(totalUsers);
  }

  /**
   * Handle location update events to manage observers and players lists
   * Public method for testing purposes
   */
  public handleLocationUpdate(data: { playerId: string; nickname: string; location?: string; table?: number | null; seat?: number | null }) {
    const { playerId, nickname } = data;
    
    // Use new table/seat format directly
    let table: number | null;
    let seat: number | null;
    
    if (data.table !== undefined && data.seat !== undefined) {
      // New format - use table/seat directly
      table = data.table;
      seat = data.seat;
    } else if (data.location) {
      // Old format - convert location string to table/seat for backward compatibility
      if (data.location === 'lobby') {
        table = null;
        seat = null;
      } else if (data.location.startsWith('table-') && !data.location.includes('-seat-')) {
        const tableMatch = data.location.match(/^table-(\d+)$/);
        table = tableMatch ? parseInt(tableMatch[1]) : null;
        seat = null;
      } else if (data.location.includes('-seat-')) {
        const seatMatch = data.location.match(/^table-(\d+)-seat-(\d+)$/);
        table = seatMatch ? parseInt(seatMatch[1]) : null;
        seat = seatMatch ? parseInt(seatMatch[2]) : null;
      } else {
        console.warn('Invalid location string:', data.location);
        return;
      }
    } else {
      console.warn('Invalid location update data:', data);
      return;
    }
    
    // Check if this update is for the current user
    const isCurrentUser = this.socket?.id === playerId;
    
    if (isCurrentUser) {
      this.currentUserTable = table;
      this.currentUserSeat = seat;
      console.log(`🎯 FRONTEND: Current user location updated to: table=${table}, seat=${seat}`);
      console.log(`🎯 FRONTEND: Current user (${nickname}) is now at: ${this.parseTableSeatForDisplay(table, seat)}`);
      
      // Automatic navigation based on location
      this.handleLocationBasedNavigation(table, seat);
    }
    
    // Determine user's new state based on table/seat
    if (table === null) {
      // User moved to lobby - remove from observers and players
      this.observers = this.observers.filter(observer => observer !== nickname);
      this.emitOnlineUsersUpdate();
      
    } else if (seat === null) {
      // User is observing a table (table=X, seat=null)
      console.log(`🎯 FRONTEND: User ${nickname} is observing table ${table}`);
      console.log(`🎯 FRONTEND: Current observers before adding:`, this.observers);
      if (!this.observers.includes(nickname)) {
        this.observers.push(nickname);
        console.log(`✅ FRONTEND: Added ${nickname} to observers list`);
      } else {
        console.log(`ℹ️ FRONTEND: ${nickname} already in observers list`);
      }
      console.log(`🎯 FRONTEND: Current observers after processing:`, this.observers);
      this.emitOnlineUsersUpdate();
      
    } else {
      // User took a seat (table=X, seat=Y)
      // Remove from observers if they were observing
      this.observers = this.observers.filter(observer => observer !== nickname);
      this.emitOnlineUsersUpdate();
    }
    
    console.log(`DEBUG: Frontend processed location update for ${nickname}: table=${table}, seat=${seat}`);
    console.log(`DEBUG: Frontend observers after update:`, this.observers);
    
    // Log current user status every location update
    this.logCurrentUserStatus();
  }

  /**
   * Handle automatic navigation based on table/seat changes
   */
  private handleLocationBasedNavigation(table: number | null, seat: number | null) {
    // Only navigate if in browser environment
    if (typeof window === 'undefined') return;
    
    if (table === null) {
      // If user is in lobby but not on lobby page, redirect
      if (!navigationService.isOnLobby()) {
        console.log('🚀 FRONTEND: User is in lobby but not on lobby page, redirecting...');
        console.log(`🚀 FRONTEND: Current path: ${navigationService.getCurrentPath()}`);
        navigationService.navigateToLobby(true);
      }
    } else {
      // If user is at a table, they should be on the corresponding game page
        const currentGameId = navigationService.getCurrentGameId();
        
        // If not on the correct game page, navigate there
      if (!navigationService.isOnGamePage() || currentGameId !== table.toString()) {
        console.log(`🚀 FRONTEND: User is at table ${table} (seat=${seat}), navigating to game page`);
          console.log(`🚀 FRONTEND: Current path: ${navigationService.getCurrentPath()}`);
        navigationService.navigateToGame(table.toString(), true);
      }
    }
  }

  /**
   * Parse table/seat for human-readable display
   */
  private parseTableSeatForDisplay(table: number | null, seat: number | null): string {
    if (table === null) {
      return 'Lobby (browsing tables)';
        }
    
    if (seat === null) {
      return `Table ${table} (observing)`;
    }
    
    return `Table ${table}, Seat ${seat}`;
  }

  /**
   * Log current user status for debugging
   */
  private logCurrentUserStatus() {
    console.log(`🎯 FRONTEND: Current user status:`, {
      table: this.currentUserTable,
      seat: this.currentUserSeat,
      isPlayer: this.isPlayer,
      isObserver: this.isObserver,
      location: this.parseTableSeatForDisplay(this.currentUserTable, this.currentUserSeat)
    });
  }

  /**
   * Process retry queue for failed operations
   */
  private processRetryQueue() {
    if (!this.socket || !this.socket.connected) return;
    
    const itemsToRetry = [...this.retryQueue];
    this.retryQueue = [];
    
    itemsToRetry.forEach(item => {
      if (item.attempts < 3) {
        this.socket?.emit(item.event, item.data);
        item.attempts++;
        if (item.attempts < 3) {
          this.retryQueue.push(item);
        }
      }
    });
  }

  /**
   * Emit game state update to listeners
   */
  private emitGameStateUpdate(gameState: GameState) {
    this.gameStateListeners.forEach(callback => callback(gameState));
  }

  /**
   * Emit seat update to listeners
   */
  private emitSeatUpdate(seats: SeatState) {
    this.seatUpdateListeners.forEach(callback => callback(seats));
  }

  /**
   * Emit seat error to listeners
   */
  private emitSeatError(error: string) {
    this.seatErrorListeners.forEach(callback => callback(error));
  }

  /**
   * Emit chat message to listeners
   */
  private emitChatMessage(message: ChatMessage) {
    this.chatMessageListeners.forEach(callback => callback(message));
  }

  /**
   * Emit system message to listeners
   */
  private emitSystemMessage(message: string) {
    this.systemMessageListeners.forEach(callback => callback(message));
  }

  /**
   * Emit tables update to listeners
   */
  private emitTablesUpdate(tables: TableData[]) {
    this.tablesUpdateListeners.forEach(callback => callback(tables));
  }

  /**
   * Handle socket errors
   */
  private handleSocketError(error: any, context: string = 'socket') {
    console.error(`Socket error in ${context}:`, error);
    this.emitError({
      message: error.message || 'Socket connection error',
      context
    });
  }

  /**
   * Handle disconnect events
   */
  private handleDisconnect() {
    this.isConnected = false;
    console.log('Socket disconnected');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Request lobby tables from server
   */
  private requestLobbyTables() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('lobby:getTables');
    }
  }

  /**
   * Get initial game state for a table
   */
  private getInitialGameState(tableId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('game:getState', { tableId });
    }
  }

  /**
   * Subscribe to tables updates
   */
  onTablesUpdate(callback: TablesUpdateCallback) {
    this.tablesUpdateListeners.push(callback);
    return () => {
      this.tablesUpdateListeners = this.tablesUpdateListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Unsubscribe from tables updates
   */
  offTablesUpdate() {
    this.tablesUpdateListeners = [];
  }

  /**
   * Update user location immediately
   */
  updateUserLocationImmediate(tableId: number, nickname: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('location:update', { 
        table: tableId, 
        seat: null, // Observer mode
        nickname 
      });
    }
  }

  /**
   * Join a table as observer or player
   */
  joinTable(tableId: number, buyIn?: number) {
    if (!this.socket) {
      throw new Error('Socket not initialized. Please connect first.');
    }
    
    if (!this.socket.connected) {
      throw new Error('Socket not connected. Please wait for connection or try again.');
    }
    
    const nickname = localStorage.getItem('nickname');
    if (!nickname) {
      throw new Error('No nickname set. Please set a nickname first.');
    }
    
    console.log(`🎯 SOCKET: Joining table ${tableId} as ${buyIn ? 'player' : 'observer'} with nickname: ${nickname}`);
    
    if (buyIn) {
      // Join as player with buy-in
      this.socket.emit('table:join', { tableId, nickname, buyIn });
    } else {
      // Join as observer
      this.socket.emit('table:observe', { tableId, nickname });
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();