import { Socket } from 'socket.io-client';
import type { DefaultEventsMap } from '@socket.io/component-emitter';
import { io } from 'socket.io-client';
import { socketService } from '../socketService';
import { cookieService } from '../cookieService';
import { GameState, Player, TableData, ChatMessage, SeatState } from '../types';

jest.mock('socket.io-client');
jest.mock('../cookieService');

describe('SocketService', () => {
  let mockSocket: Partial<Socket<DefaultEventsMap, DefaultEventsMap>>;
  let mockEmit: jest.Mock;
  let mockOn: jest.Mock;
  let mockOff: jest.Mock;
  let mockIoOn: jest.Mock;
  let mockConnect: jest.Mock;
  let mockListeners: { [event: string]: Function[] };
  let mockIoListeners: { [event: string]: Function[] };

  beforeEach(() => {
    mockListeners = {};
    mockIoListeners = {};
    mockEmit = jest.fn();
    mockOn = jest.fn((event, callback) => {
      if (!mockListeners[event]) {
        mockListeners[event] = [];
      }
      mockListeners[event].push(callback);
    });
    mockOff = jest.fn((event) => {
      mockListeners[event] = [];
    });
    mockIoOn = jest.fn((event, callback) => {
      if (!mockIoListeners[event]) {
        mockIoListeners[event] = [];
      }
      mockIoListeners[event].push(callback);
    });
    mockConnect = jest.fn(() => {
      mockSocket.connected = true;
      if (mockListeners['connect']) {
        mockListeners['connect'].forEach(cb => cb());
      }
      return mockSocket as Socket<DefaultEventsMap, DefaultEventsMap>;
    });

    // Create mock socket
    mockSocket = {
      emit: mockEmit,
      on: mockOn,
      off: mockOff,
      disconnect: jest.fn(() => {
        mockSocket.connected = false;
        if (mockListeners['disconnect']) {
          mockListeners['disconnect'].forEach(cb => cb('transport close'));
        }
        return mockSocket as Socket<DefaultEventsMap, DefaultEventsMap>;
      }),
      connected: false,
      removeAllListeners: jest.fn(),
      io: {
        opts: { reconnection: true },
        removeAllListeners: jest.fn(),
        on: mockIoOn
      } as any,
      close: jest.fn(),
      connect: mockConnect as unknown as () => Socket<DefaultEventsMap, DefaultEventsMap>
    };

    // Mock io implementation
    (io as jest.Mock).mockImplementation(() => mockSocket as Socket<DefaultEventsMap, DefaultEventsMap>);
    
    // Reset the socket service state
    socketService.disconnect();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Ensure proper cleanup to prevent test from hanging
    socketService.disconnect();
    jest.clearAllTimers();
  });

  it('should configure Socket.IO with correct connection options', () => {
    // Reset mock before test
    (io as jest.Mock).mockClear();
    
    // Connect and verify
    socketService.connect();

    // Simulate successful connection
    if (mockListeners['connect']) {
      mockListeners['connect'].forEach(cb => cb());
    }

    expect(io).toHaveBeenCalledWith('http://localhost:3001', expect.objectContaining({
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      forceNew: true,
      autoConnect: false,
      path: '/socket.io'
    }));
  });

  describe('Observer Management', () => {
    beforeEach(() => {
      // Mock cookie service responses
      (cookieService.getNickname as jest.Mock).mockReturnValue('TestObserver');
      (cookieService.getSeatNumber as jest.Mock).mockReturnValue(null);
      
      // Set up mock socket with connected state
      mockSocket.connected = true;
      
      // Connect before each test
      socketService.setTestMode(true); // Enable test mode to bypass rate limiting
      socketService.connect();
      
      // Simulate successful connection
      if (mockListeners['connect']) {
        mockListeners['connect'].forEach(cb => cb());
      }
    });

    it('should join as observer when connecting without a seat', () => {
      const nickname = 'TestObserver';
      expect(mockEmit).toHaveBeenCalledWith('observer:join', { nickname });
    });

    it('should handle observer joined event', () => {
      const mockCallback = jest.fn();
      const observers = ['Observer1', 'Observer2'];

      socketService.onOnlineUsersUpdate(mockCallback);

      // Simulate observer:joined event
      if (mockListeners['observer:joined']) {
        mockListeners['observer:joined'].forEach(cb => cb(observers));
      }

      expect(mockCallback).toHaveBeenCalledWith([], observers);
    });

    it('should handle observer left event', () => {
      const mockCallback = jest.fn();
      const observers = ['Observer1'];

      socketService.onOnlineUsersUpdate(mockCallback);

      // Simulate observer:left event
      if (mockListeners['observer:left']) {
        mockListeners['observer:left'].forEach(cb => cb(observers));
      }

      expect(mockCallback).toHaveBeenCalledWith([], observers);
    });

    it('should handle transition from observer to player', () => {
      const mockCallback = jest.fn();
      const observers = ['Observer1', 'Player1'];
      const player = {
        id: '1',
        name: 'Player1',
        seatNumber: 0,
        position: 0,
        chips: 1000,
        currentBet: 0,
        isDealer: false,
        isAway: false,
        isActive: true,
        avatar: {
          type: 'initials',
          initials: 'P1',
          color: '#1abc9c'
        },
        cards: []
      };

      socketService.onOnlineUsersUpdate(mockCallback);

      // Simulate initial observers
      if (mockListeners['observer:joined']) {
        mockListeners['observer:joined'].forEach((cb: Function) => cb(observers));
      }

      // Set initial game state
      const gameState = {
        id: '1',
        players: [],
        communityCards: [],
        pot: 0,
        currentPlayerId: null,
        currentPlayerPosition: 0,
        dealerPosition: 0,
        smallBlindPosition: 1,
        bigBlindPosition: 2,
        status: 'waiting',
        phase: 'preflop',
        minBet: 10,
        currentBet: 0,
        smallBlind: 5,
        bigBlind: 10
      };

      // Update game state with player
      if (mockListeners['gameState']) {
        mockListeners['gameState'].forEach((cb: Function) => cb({
          ...gameState,
          players: [player]
        }));
      }

      // Simulate player joining
      if (mockListeners['playerJoined']) {
        mockListeners['playerJoined'].forEach((cb: Function) => cb(player));
      }

      expect(mockCallback).toHaveBeenCalledWith([player], ['Observer1']);
    });

    it('should handle transition from player to observer', () => {
      const mockCallback = jest.fn();
      const player = {
        id: '1',
        name: 'Player1',
        seatNumber: 0,
        position: 0,
        chips: 1000,
        currentBet: 0,
        isDealer: false,
        isAway: false,
        isActive: true,
        avatar: {
          type: 'initials',
          initials: 'P1',
          color: '#1abc9c'
        },
        cards: []
      };

      socketService.onOnlineUsersUpdate(mockCallback);

      // Set initial game state with one player
      const gameState = {
        id: '1',
        players: [player],
        communityCards: [],
        pot: 0,
        currentPlayerId: null,
        currentPlayerPosition: 0,
        dealerPosition: 0,
        status: 'waiting',
        phase: 'preflop' as const,
        minBet: 10,
        currentBet: 0,
        smallBlind: 5,
        bigBlind: 10
      };

      // Simulate game state with player
      if (mockListeners['gameState']) {
        mockListeners['gameState'].forEach(cb => cb(gameState));
      }

      // Simulate player leaving
      if (mockListeners['playerLeft']) {
        mockListeners['playerLeft'].forEach(cb => cb(player.id));
      }

      expect(mockCallback).toHaveBeenCalledWith([], [player.name]);
    });
  });

  describe('Game State Management', () => {
    beforeEach(() => {
      mockSocket.connected = true;
      socketService.setTestMode(true);
      socketService.connect();
      
      if (mockListeners['connect']) {
        mockListeners['connect'].forEach((cb: Function) => cb());
      }
    });

    it('should handle initial game state', () => {
      const gameState: GameState = {
        id: '1',
        players: [],
        pot: 0,
        communityCards: [],
        phase: 'preflop',
        minBet: 0,
        currentBet: 0,
        currentPlayerId: null,
        currentPlayerPosition: 0,
        dealerPosition: 0,
        status: 'waiting',
        smallBlind: 5,
        bigBlind: 10,
        smallBlindPosition: 1,
        bigBlindPosition: 2,
        isHandComplete: false,
        handEvaluation: undefined,
        winner: undefined
      };

      if (mockListeners['gameState']) {
        mockListeners['gameState'].forEach(cb => cb(gameState));
      }

      expect(socketService.getGameState()).toEqual(gameState);
    });

    it('should handle player betting', () => {
      const gameId = '1';
      const playerId = 'player1';
      const betAmount = 100;

      socketService.placeBet(gameId, playerId, betAmount);
      expect(mockEmit).toHaveBeenCalledWith('placeBet', { gameId, playerId, amount: betAmount });
    });

    it('should handle player folding', () => {
      const gameId = '1';
      const playerId = 'player1';

      socketService.fold(gameId, playerId);
      expect(mockEmit).toHaveBeenCalledWith('fold', { gameId, playerId });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSocket.connected = true;
      socketService.setTestMode(true);
      socketService.connect();
    });

    it('should handle connection errors', () => {
      const mockErrorCallback = jest.fn();
      socketService.onError(mockErrorCallback);

      // Simulate connection error
      if (mockListeners['connect_error']) {
        mockListeners['connect_error'].forEach((cb: Function) => cb(new Error('Connection failed')));
      }

      expect(mockErrorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Failed to connect'),
          context: 'socket:connect_error'
        })
      );
    });

    it('should handle socket errors', () => {
      const mockErrorCallback = jest.fn();
      socketService.onError(mockErrorCallback);

      // Simulate socket error
      if (mockListeners['error']) {
        mockListeners['error'].forEach((cb: Function) => cb({ message: 'Socket error', context: 'socket:error' }));
      }

      expect(mockErrorCallback).toHaveBeenCalledWith({
        message: 'Socket error',
        context: 'socket:error'
      });
    });
  });

  describe('Chat Functionality', () => {
    beforeEach(() => {
      mockSocket.connected = true;
      socketService.setTestMode(true);
      socketService.connect();
    });

    it('should send chat messages', () => {
      const gameId = '1';
      const message = {
        id: '123',
        sender: 'Player1',
        text: 'Hello',
        timestamp: Date.now()
      };

      socketService.sendChatMessage(gameId, message);
      expect(mockEmit).toHaveBeenCalledWith('chat:message', { gameId, message });
    });

    it('should handle received chat messages', () => {
      const mockCallback = jest.fn();
      const message = {
        id: '123',
        sender: 'Player1',
        text: 'Hello',
        timestamp: Date.now()
      };

      socketService.onChatMessage(mockCallback);

      if (mockListeners['chat:message']) {
        mockListeners['chat:message'].forEach((cb: Function) => cb(message));
      }

      expect(mockCallback).toHaveBeenCalledWith(message);
    });

    it('should handle system messages', () => {
      const mockCallback = jest.fn();
      const message = 'Player1 joined the game';

      socketService.onSystemMessage(mockCallback);

      if (mockListeners['chat:system']) {
        mockListeners['chat:system'].forEach((cb: Function) => cb(message));
      }

      expect(mockCallback).toHaveBeenCalledWith(message);
    });
  });

  describe('Table Management', () => {
    beforeEach(() => {
      mockSocket.connected = true;
      socketService.setTestMode(true);
      socketService.connect();
    });

    it('should request lobby tables', () => {
      socketService.requestLobbyTables();
      expect(mockEmit).toHaveBeenCalledWith('getLobbyTables');
    });

    it('should handle tables update', () => {
      const mockCallback = jest.fn();
      const tables = [
        { id: 1, name: 'Table 1', players: [], maxPlayers: 6, status: 'waiting' }
      ];

      socketService.onTablesUpdate(mockCallback);

      if (mockListeners['tablesUpdate']) {
        mockListeners['tablesUpdate'].forEach((cb: Function) => cb(tables));
      }

      expect(mockCallback).toHaveBeenCalledWith(tables);
      expect(socketService.getLobbyTables()).toEqual(tables);
    });

    it('should handle joining a table', () => {
      const tableId = 1;
      const buyIn = 1000;

      socketService.joinTable(tableId, buyIn);
      expect(mockEmit).toHaveBeenCalledWith('joinTable', { tableId, buyIn });
    });
  });

  describe('Player Status', () => {
    beforeEach(() => {
      mockSocket.connected = true;
      socketService.setTestMode(true);
      socketService.connect();
    });

    it('should update player away status', () => {
      const gameId = '1';
      const playerId = 'player1';
      const isAway = true;

      socketService.updatePlayerStatus(gameId, playerId, isAway);
      expect(mockEmit).toHaveBeenCalledWith('player:status', { gameId, playerId, isAway });
    });

    it('should handle player status updates', () => {
      const mockCallback = jest.fn();
      const player = {
        id: '1',
        name: 'Player1',
        seatNumber: 0,
        position: 0,
        chips: 1000,
        currentBet: 0,
        isDealer: false,
        isAway: true,
        isActive: true,
        avatar: {
          type: 'initials',
          initials: 'P1',
          color: '#1abc9c'
        },
        cards: []
      };

      // Initialize game state first
      if (mockListeners['gameState']) {
        mockListeners['gameState'].forEach((cb: Function) => cb({
          id: '1',
          players: [{ ...player, isAway: false }],
          communityCards: [],
          pot: 0,
          currentPlayerId: null,
          currentPlayerPosition: 0,
          dealerPosition: 0,
          smallBlindPosition: 1,
          bigBlindPosition: 2,
          status: 'waiting',
          phase: 'preflop',
          minBet: 10,
          currentBet: 0,
          smallBlind: 5,
          bigBlind: 10
        }));
      }

      socketService.onOnlineUsersUpdate(mockCallback);

      // Update player status
      if (mockListeners['player:statusUpdated']) {
        mockListeners['player:statusUpdated'].forEach((cb: Function) => cb(player));
      }

      const updatedPlayer = socketService.getGameState()?.players.find(p => p.id === player.id);
      expect(updatedPlayer?.isAway).toBe(true);
    });
  });

  describe('Seat Management', () => {
    beforeEach(() => {
      mockSocket.connected = true;
      socketService.setTestMode(true);
      socketService.connect();
    });

    it('should handle seat requests', () => {
      const nickname = 'Player1';
      const seatNumber = 1;

      socketService.requestSeat(nickname, seatNumber);
      expect(mockEmit).toHaveBeenCalledWith('seat:request', { nickname, seatNumber });
    });

    it('should handle seat updates', () => {
      const mockCallback = jest.fn();
      const seats = { 1: 'Player1', 2: null };

      socketService.onSeatUpdate(mockCallback);

      if (mockListeners['seat:update']) {
        mockListeners['seat:update'].forEach((cb: Function) => cb(seats));
      }

      expect(mockCallback).toHaveBeenCalledWith(seats);
    });

    it('should handle seat errors', () => {
      const mockCallback = jest.fn();
      const error = 'Seat already taken';

      socketService.onSeatError(mockCallback);

      if (mockListeners['seat:error']) {
        mockListeners['seat:error'].forEach((cb: Function) => cb({ message: error }));
      }

      expect(mockCallback).toHaveBeenCalledWith(error);
    });
  });

  describe('Reconnection Logic', () => {
    beforeEach(() => {
      socketService.setTestMode(true);
      jest.useFakeTimers();
      // Reset mock before each test
      (io as jest.Mock).mockClear();
      mockSocket.connected = false;
      (mockSocket.connect as jest.Mock).mockClear();
      mockEmit.mockClear();
      
      // Reset socket service state
      socketService.disconnect();
      socketService.setTestMode(true);
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.clearAllMocks();
      socketService.disconnect();
    });

    it('should attempt reconnection on disconnect', () => {
      // Initial connection
      socketService.connect();
      mockSocket.connected = true;
      (mockSocket.connect as jest.Mock).mockClear();

      // Simulate disconnect with a reason that should trigger reconnect
      mockSocket.connected = false;
      if (mockListeners['disconnect']) {
        mockListeners['disconnect'].forEach(cb => cb('transport close'));
      }

      // Fast forward past the reconnection delay
      jest.advanceTimersByTime(0); // In test mode, delay is 0

      // Verify reconnection attempt was made
      expect(mockSocket.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle reconnection with exponential backoff', () => {
      // Initial connection
      socketService.connect();
      mockSocket.connected = true;
      (mockSocket.connect as jest.Mock).mockClear();

      // Simulate connect_error
      mockSocket.connected = false;
      if (mockListeners['connect_error']) {
        mockListeners['connect_error'].forEach(cb => cb(new Error('Connection failed')));
      }

      // Fast forward past the first backoff (should be 0 in test mode)
      jest.advanceTimersByTime(0);

      // Verify first reconnection attempt
      expect(mockSocket.connect).toHaveBeenCalledTimes(1);

      // Simulate second connect_error
      mockSocket.connected = false;
      if (mockListeners['connect_error']) {
        mockListeners['connect_error'].forEach(cb => cb(new Error('Connection failed')));
      }

      // Fast forward past the second backoff (should be 0 in test mode)
      jest.advanceTimersByTime(0);

      // Verify second reconnection attempt
      expect(mockSocket.connect).toHaveBeenCalledTimes(2);
    });

    it('should stop reconnection attempts after max tries', () => {
      // Enable test mode to avoid backoff delays
      socketService.setTestMode(true);
      
      // Initial connection
      socketService.connect();
      
      // Mock error callback to verify error emissions
      const mockErrorCallback = jest.fn();
      socketService.onError(mockErrorCallback);
      
      // Simulate max connection attempts (3 times)
      for (let i = 0; i < 3; i++) {
        // Simulate connection error
        if (mockListeners['connect_error']) {
          mockListeners['connect_error'].forEach(cb => cb(new Error('Connection failed')));
        }
        jest.advanceTimersByTime(0); // Fast forward past backoff in test mode
      }

      // Reset mock counts to verify no more attempts
      (mockSocket.connect as jest.Mock).mockClear();
      mockEmit.mockClear();

      // Try to connect again - this should not trigger a new connection attempt
      socketService.connect();
      jest.advanceTimersByTime(0);

      // Should not have any more connection attempts
      expect(mockSocket.connect).not.toHaveBeenCalled();

      // Verify error was emitted through error callback
      expect(mockErrorCallback).toHaveBeenCalledWith({
        message: 'Failed to connect after 3 attempts',
        context: 'socket:max_attempts'
      });

      // Verify that the socket was cleaned up
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();

      // Verify that the socket service is in the correct state
      expect(socketService.getConnectionAttempts()).toBe(3);

      // Verify that the socket service is locked
      expect(socketService.isLocked()).toBe(true);
    });

    it('should reset connection attempts after successful connection', () => {
      // Initial connection
      socketService.connect();
      mockSocket.connected = true;
      (mockSocket.connect as jest.Mock).mockClear();

      // Simulate two failed attempts
      for (let i = 0; i < 2; i++) {
        mockSocket.connected = false;
        if (mockListeners['connect_error']) {
          mockListeners['connect_error'].forEach(cb => cb(new Error('Connection failed')));
        }
        jest.advanceTimersByTime(0);
      }

      // Simulate successful connection
      mockSocket.connected = true;
      if (mockListeners['connect']) {
        mockListeners['connect'].forEach(cb => cb());
      }

      // Connection attempts should be reset
      expect(socketService.getConnectionAttempts()).toBe(0);

      // Should be able to attempt connections again
      mockSocket.connected = false;
      (mockSocket.connect as jest.Mock).mockClear();
      socketService.connect();
      expect(mockSocket.connect).toHaveBeenCalledTimes(1);
    });
  });
}); 