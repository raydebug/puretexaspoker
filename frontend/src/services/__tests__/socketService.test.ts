import { io, Socket } from 'socket.io-client';
import { socketService } from '../socketService';
import { cookieService } from '../cookieService';

jest.mock('socket.io-client');
jest.mock('../cookieService');

describe('SocketService - Observer Management', () => {
  let mockSocket: Partial<Socket>;
  let mockEmit: jest.Mock;
  let mockOn: jest.Mock;
  let mockListeners: { [event: string]: Function[] };

  beforeEach(() => {
    mockListeners = {};
    mockEmit = jest.fn();
    mockOn = jest.fn((event, callback) => {
      if (!mockListeners[event]) {
        mockListeners[event] = [];
      }
      mockListeners[event].push(callback);
    });

    mockSocket = {
      emit: mockEmit,
      on: mockOn,
      disconnect: jest.fn(),
      connected: false,
      removeAllListeners: jest.fn()
    };

    (io as jest.Mock).mockReturnValue(mockSocket);
    
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
    socketService.connect();
    expect(io).toHaveBeenCalledWith('http://localhost:3001', {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 60000,
      transports: ['polling'],
      forceNew: true,
      autoConnect: true,
      path: '/socket.io/'
    });
  });

  describe('Observer Management', () => {
    it('should join as observer when connecting without a seat', () => {
      const nickname = 'TestObserver';
      (cookieService.getNickname as jest.Mock).mockReturnValue(nickname);
      (cookieService.getSeatNumber as jest.Mock).mockReturnValue(null);

      socketService.connect();

      expect(mockEmit).toHaveBeenCalledWith('observer:join', { nickname });
    });

    it('should handle observer joined event', () => {
      const mockCallback = jest.fn();
      const observers = ['Observer1', 'Observer2'];

      socketService.connect();
      socketService.onOnlineUsersUpdate(mockCallback);

      // Simulate observer:joined event
      mockListeners['observer:joined'][0](observers);

      expect(mockCallback).toHaveBeenCalledWith([], observers);
    });

    it('should handle observer left event', () => {
      const mockCallback = jest.fn();
      const observers = ['Observer1'];

      socketService.connect();
      socketService.onOnlineUsersUpdate(mockCallback);

      // Simulate observer:left event
      mockListeners['observer:left'][0](observers);

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
        cards: []
      };

      socketService.connect();
      socketService.onOnlineUsersUpdate(mockCallback);

      // Simulate initial observers
      mockListeners['observer:joined'][0](observers);
      expect(mockCallback).toHaveBeenCalledWith([], observers);

      // Simulate player joining - note that Player1 is still kept in observers initially
      mockListeners['playerJoined'][0](player);
      expect(mockCallback).toHaveBeenCalledWith([player], observers);
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
        cards: []
      };

      socketService.connect();
      socketService.onOnlineUsersUpdate(mockCallback);

      // Set initial game state with one player
      const gameState = {
        id: '1',
        players: [player],
        communityCards: [],
        pot: 0,
        currentPlayerId: null,
        phase: 'preflop' as const,
        minBet: 10,
        currentBet: 0
      };

      // Simulate game state with player
      mockListeners['gameState'][0](gameState);
      expect(mockCallback).toHaveBeenCalledWith([player], []);

      // Simulate player leaving
      mockListeners['playerLeft'][0](player.id);
      expect(mockCallback).toHaveBeenCalledWith([], ['Player1']);
    });
  });
}); 