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
  private maxConnectionAttempts = 3;
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

  // Event listeners
  private errorListeners: ((error: { message: string; context: string }) => void)[] = [];
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
      this.gameState = gameState;
      this.emitGameStateUpdate(gameState);
    });

    socket.on('playerJoined', (data: { player: Player }) => {
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
      console.log('Table joined successfully:', data);
      if (data.gameId) {
        // Store the game ID for this session
        this.currentGameId = data.gameId;
      }
    });

    socket.on('tableError', (error: string) => {
      console.error('Table join error:', error);
      this.emitError({ message: error, context: 'table:join_error' });
    });

    // Handle game creation and joining
    socket.on('gameCreated', (data: { gameId: string; tableId: number }) => {
      console.log('Game created:', data);
      this.currentGameId = data.gameId;
    });

    socket.on('gameJoined', (data: { gameId: string; playerId: string; gameState: GameState }) => {
      console.log('Game joined:', data);
      this.currentGameId = data.gameId;
      this.gameState = data.gameState;
      
      // Set the current player
      const currentPlayer = data.gameState.players.find(p => p.id === data.playerId);
      if (currentPlayer) {
        this.currentPlayer = currentPlayer;
      }
      
      // Emit the updated game state
      this.emitGameStateUpdate(data.gameState);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnecting = false;
      this.connectionLock = false;
      this.emitError({ 
        message: 'Failed to connect to server', 
        context: 'connection:connect_error' 
      });
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emitError({ 
        message: typeof error === 'string' ? error : error.message || 'Unknown socket error', 
        context: 'socket:error' 
      });
    });

    socket.on('disconnect', (reason) => {
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

  fold(gameId: string, playerId: string) {
    if (this.socket?.connected) {
      this.socket.emit('fold', { gameId, playerId });
    } else {
      console.warn('Cannot fold: socket not connected');
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
    this.chatMessageListeners.forEach(callback => callback(message));
  }

  private emitSystemMessage(message: string) {
    this.systemMessageListeners.forEach(callback => callback(message));
  }

  // --- Lobby methods ---
  requestLobbyTables() {
    console.log('DEBUG: requestLobbyTables called, socket connected:', this.socket?.connected);
    if (!this.socket || !this.socket.connected) {
      console.log('Socket not connected, connecting before requesting tables');
      this.connect();
      
      // Request tables once connected with a timeout
      this.socket?.once('connect', () => {
        console.log('DEBUG: Socket connected, emitting getLobbyTables');
        this.socket?.emit('getLobbyTables');
        
        // Add a backup request after a delay in case the first one fails
        setTimeout(() => {
          if (this.socket?.connected && this.lobbyTables.length === 0) {
            console.log('DEBUG: Backup getLobbyTables request');
            this.socket?.emit('getLobbyTables');
          }
        }, 2000);
      });
      return;
    }
    
    console.log('DEBUG: Emitting getLobbyTables immediately');
    this.socket.emit('getLobbyTables');
    
    // Add a backup request after a delay in case the first one fails
    setTimeout(() => {
      if (this.socket?.connected && this.lobbyTables.length === 0) {
        console.log('DEBUG: Backup getLobbyTables request (immediate case)');
        this.socket?.emit('getLobbyTables');
      }
    }, 2000);
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

  // For testing purposes only
  getConnectionAttempts(): number {
    return this.connectionAttempts;
  }

  // For testing purposes only
  isLocked(): boolean {
    return this.connectionLock;
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
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createObserverAvatar = (nickname: string): AvatarType => ({
  type: 'initials',
  initials: nickname.substring(0, 2).toUpperCase(),
  color: '#1abc9c'
});

export const socketService = new SocketService(); 