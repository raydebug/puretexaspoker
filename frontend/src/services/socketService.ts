import { io, Socket } from 'socket.io-client';
import { GameState, Player } from '../types/game';
import { cookieService } from './cookieService';
import { errorTrackingService } from './errorTrackingService';
import { TableData } from '../types/table';

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

class SocketService {
  private socket: Socket | null = null;
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

  connect() {
    try {
      // If we already have a socket that's connected, don't create a new one
      if (this.socket?.connected) {
        console.log('Socket already connected, reusing existing connection');
        return this.socket;
      }
      
      // If we already have a socket that's connecting, don't create a new one
      if (this.socket && !this.socket.connected) {
        console.log('Socket already exists but not connected, waiting for connection');
        return this.socket;
      }
      
      // Clean up any existing connection first
      if (this.socket) {
        this.disconnect();
      }
      
      console.log('Creating new socket connection to server');
      this.socket = io('http://localhost:3001', {
        reconnection: true, 
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['polling', 'websocket'],
        forceNew: true,
        // Don't auto-connect, we'll do it manually
        autoConnect: false
      });
      
      this.setupListeners();
      
      // Set a reasonable connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          console.error('Connection timeout - could not connect to server');
          this.emitError({ message: 'Connection timeout. Server may be down.', context: 'connection' });
        }
      }, 10000);
      
      // Clear timeout on connect
      this.socket.on('connect', () => {
        console.log('Connected to server successfully');
        clearTimeout(connectionTimeout);
        
        // Attempt to restore session after successful connection
        const savedNickname = cookieService.getNickname();
        const savedSeatNumber = cookieService.getSeatNumber();
        
        if (savedNickname) {
          if (savedSeatNumber !== null) {
            this.requestSeat(savedNickname, savedSeatNumber);
          } else {
            // Join as observer if no seat is saved
            this.joinAsObserver(savedNickname);
          }
        }
      });
      
      // Add concise error handling
      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error.message);
        clearTimeout(connectionTimeout);
      });
      
      // Connect manually after all listeners are set up
      this.socket.connect();
      
      return this.socket;
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'socket:connect');
      throw error;
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
      
      // First disable reconnection to prevent auto-reconnect cycles
      this.socket.io.opts.reconnection = false;
      
      // Remove all event listeners first to prevent duplicate handlers
      this.socket.off('connect');
      this.socket.off('disconnect');
      this.socket.off('connect_error');
      this.socket.off('reconnect_attempt');
      this.socket.off('reconnect');
      this.socket.off('reconnect_error');
      this.socket.off('reconnect_failed');
      this.socket.off('error');
      this.socket.off('gameState');
      this.socket.off('playerJoined');
      this.socket.off('playerLeft');
      this.socket.off('observer:joined');
      this.socket.off('observer:left');
      this.socket.off('seat:update');
      this.socket.off('seat:accepted');
      this.socket.off('seat:error');
      this.socket.off('player:statusUpdated');
      this.socket.off('player:stoodUp');
      this.socket.off('chat:message');
      this.socket.off('chat:system');
      this.socket.off('tablesUpdate');
      this.socket.off('tableJoined');
      this.socket.off('tableError');
      
      // Then properly disconnect the socket
      this.socket.disconnect();
      this.socket = null;
      
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
      if (this.socket) {
        this.socket.emit('observer:join', { nickname });
      }
    } catch (error) {
      errorTrackingService.trackError(error as Error, 'joinAsObserver', { nickname });
    }
  }

  onOnlineUsersUpdate(callback: OnlineUsersCallback) {
    this.onlineUsersListeners.push(callback);
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
      if (this.socket) {
        this.socket.emit('seat:request', { nickname, seatNumber });
        // Add player to observers initially
        if (!this.observers.includes(nickname)) {
          this.observers.push(nickname);
          this.emitOnlineUsersUpdate();
        }
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
  }

  onSeatError(callback: SeatErrorCallback) {
    this.seatErrorListeners.push(callback);
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
    if (this.socket) {
      this.socket.emit('placeBet', { gameId, playerId, amount });
    }
  }

  check(gameId: string, playerId: string) {
    if (this.socket) {
      this.socket.emit('check', { gameId, playerId });
    }
  }

  fold(gameId: string, playerId: string) {
    if (this.socket) {
      this.socket.emit('fold', { gameId, playerId });
    }
  }

  // --- Seat action methods ---
  updatePlayerStatus(gameId: string, playerId: string, isAway: boolean) {
    if (this.socket) {
      this.socket.emit('player:status', { gameId, playerId, isAway });
    }
  }

  standUp(gameId: string, playerId: string) {
    if (this.socket) {
      this.socket.emit('player:standUp', { gameId, playerId });
    }
  }

  leaveTable(gameId: string, playerId: string) {
    if (this.socket) {
      this.socket.emit('player:leaveTable', { gameId, playerId });
      cookieService.clearGameData();
    }
  }

  // --- Chat methods ---
  sendChatMessage(gameId: string, message: ChatMessage) {
    if (this.socket) {
      this.socket.emit('chat:message', { gameId, message });
    }
  }

  onChatMessage(callback: ChatMessageCallback) {
    this.chatMessageListeners.push(callback);
  }

  offChatMessage() {
    this.chatMessageListeners = [];
  }

  onSystemMessage(callback: SystemMessageCallback) {
    this.systemMessageListeners.push(callback);
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
    if (this.socket) {
      this.socket.emit('getLobbyTables');
    }
  }

  onTablesUpdate(callback: TablesUpdateCallback) {
    this.tablesUpdateListeners.push(callback);
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
    if (this.socket) {
      this.socket.emit('joinTable', { tableId, buyIn });
    }
  }

  private setupListeners() {
    if (!this.socket) return;
    
    console.log('Setting up socket event listeners');
    
    // First remove any existing handlers to prevent duplicates
    this.removeAllSocketListeners();

    this.socket.on('disconnect', (reason) => {
      console.log(`Disconnected from server: ${reason}`);
      
      // If the disconnection was initiated by the server, don't attempt to reconnect
      if (reason === 'io server disconnect') {
        this.socket?.disconnect();
      }
    });
    
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Reconnection attempt: ${attemptNumber}`);
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      
      // Try to restore session after reconnect
      const savedNickname = cookieService.getNickname();
      if (savedNickname) {
        const savedSeatNumber = cookieService.getSeatNumber();
        if (savedSeatNumber !== null) {
          this.requestSeat(savedNickname, savedSeatNumber);
        } else {
          this.joinAsObserver(savedNickname);
        }
      }
    });
    
    // --- Error listener ---
    this.socket.on('error', (error: { message: string; context?: string }) => {
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
            phase: 'waiting',
            minBet: 10, // Default minimum bet
            currentBet: 0
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
          chips: data.buyIn,
          currentBet: 0,
          seatNumber: 0, // This will be updated when they sit down
          position: 0,  // This will be updated when they sit down
          isDealer: false,
          isAway: false,
          avatar: {
            type: 'initials',
            initials: nickname.substring(0, 2).toUpperCase(),
            color: '#1abc9c' // Default color
          },
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
            phase: 'waiting',
            minBet: 10, // Default minimum bet
            currentBet: 0
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
  }

  private removeAllSocketListeners() {
    if (!this.socket) return;
    
    // Remove all event listeners to prevent duplicates
    this.socket.off('connect');
    this.socket.off('disconnect');
    this.socket.off('connect_error');
    this.socket.off('reconnect_attempt');
    this.socket.off('reconnect');
    this.socket.off('reconnect_error');
    this.socket.off('reconnect_failed');
    this.socket.off('error');
    this.socket.off('gameState');
    this.socket.off('playerJoined');
    this.socket.off('playerLeft');
    this.socket.off('observer:joined');
    this.socket.off('observer:left');
    this.socket.off('seat:update');
    this.socket.off('seat:accepted');
    this.socket.off('seat:error');
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

export const socketService = new SocketService(); 