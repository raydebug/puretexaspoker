import { io as mockIo, Socket } from 'socket.io-client';
import { socketService, SeatState } from './socketService';

jest.mock('socket.io-client');

describe('socketService', () => {
  let mockSocket: Partial<Socket>;
  let mockEmit: jest.Mock;
  let mockOn: jest.Mock;
  let mockOff: jest.Mock;
  let mockDisconnect: jest.Mock;
  let mockRemoveAllListeners: jest.Mock;
  let mockConnect: jest.Mock;
  let mockListeners: { [key: string]: Function[] } = {};

  beforeEach(() => {
    // Reset listeners
    mockListeners = {};

    // Create mock functions
    mockEmit = jest.fn();
    mockOn = jest.fn((event: string, callback: Function) => {
      if (!mockListeners[event]) {
        mockListeners[event] = [];
      }
      mockListeners[event].push(callback);
    });
    mockOff = jest.fn((event: string, callback: Function) => {
      if (mockListeners[event]) {
        mockListeners[event] = mockListeners[event].filter(cb => cb !== callback);
      }
    });
    mockDisconnect = jest.fn();
    mockRemoveAllListeners = jest.fn();
    mockConnect = jest.fn(() => {
      // Simulate successful connection
      if (mockListeners['connect']) {
        mockListeners['connect'].forEach(cb => cb());
      }
    });

    // Create a more complete mock socket with minimal required properties
    mockSocket = {
      emit: mockEmit,
      on: mockOn,
      off: mockOff,
      disconnect: mockDisconnect,
      removeAllListeners: mockRemoveAllListeners,
      connect: mockConnect,
      connected: true,
      id: 'test-socket-id',
      // Mock the io property with all required methods
      io: {
        opts: { reconnection: true },
        removeAllListeners: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        engine: {
          on: jest.fn(),
          off: jest.fn()
        }
      } as any // Use type assertion for the mock
    };

    // Mock io function to return our mock socket
    (mockIo as jest.Mock).mockReturnValue(mockSocket);

    // Enable test mode to bypass rate limiting
    socketService.setTestMode(true);

    // Ensure clean state
    socketService.disconnect();
  });

  it('should configure Socket.IO with correct options', () => {
    socketService.connect();
    expect(mockIo).toHaveBeenCalledWith('http://localhost:3001', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      forceNew: true,
      autoConnect: false,
      path: '/socket.io'
    });
    expect(mockConnect).toHaveBeenCalled();
  });

  it('should emit seat:request when requestSeat is called', () => {
    socketService.connect();
    socketService.requestSeat('TestUser', 2);
    expect(mockEmit).toHaveBeenCalledWith('seat:request', { nickname: 'TestUser', seatNumber: 2 });
  });

  it('should call seat:update listeners', () => {
    socketService.connect();
    const cb = jest.fn();
    socketService.onSeatUpdate(cb);
    
    // Simulate seat:update event
    const seats: SeatState = { 0: 'A', 1: null, 2: null, 3: null, 4: null };
    if (mockListeners['seat:update']) {
      mockListeners['seat:update'].forEach(callback => callback(seats));
    }
    expect(cb).toHaveBeenCalledWith(seats);
  });

  it('should call seat:error listeners', () => {
    socketService.connect();
    const cb = jest.fn();
    socketService.onSeatError(cb);
    
    // Simulate seat:error event with correct payload format
    const errorPayload = { message: 'Seat is already taken.' };
    if (mockListeners['seat:error']) {
      mockListeners['seat:error'].forEach(callback => callback(errorPayload));
    }
    expect(cb).toHaveBeenCalledWith(errorPayload.message);
  });

  it('should support multiple listeners for seat:update', () => {
    socketService.connect();
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    socketService.onSeatUpdate(cb1);
    socketService.onSeatUpdate(cb2);
    
    // Simulate seat:update event
    const seats: SeatState = { 0: null, 1: 'B', 2: null, 3: null, 4: null };
    if (mockListeners['seat:update']) {
      mockListeners['seat:update'].forEach(callback => callback(seats));
    }
    expect(cb1).toHaveBeenCalledWith(seats);
    expect(cb2).toHaveBeenCalledWith(seats);
  });

  describe('Observer Management', () => {
    it('should join as observer when connecting without a seat', () => {
      socketService.connect();
      socketService.joinAsObserver('TestObserver');
      expect(mockEmit).toHaveBeenCalledWith('observer:join', { nickname: 'TestObserver' });
    });

    it('should handle observer joined event', () => {
      socketService.connect();
      const cb = jest.fn();
      socketService.onOnlineUsersUpdate(cb);

      // Simulate observer:joined event
      const observers = ['Observer1', 'Observer2'];
      if (mockListeners['observer:joined']) {
        mockListeners['observer:joined'].forEach(callback => callback(observers));
      }
      expect(cb).toHaveBeenCalledWith([], observers);
    });

    it('should handle observer left event', () => {
      socketService.connect();
      const cb = jest.fn();
      socketService.onOnlineUsersUpdate(cb);

      // Simulate observer:left event
      const observers = ['Observer1'];
      if (mockListeners['observer:left']) {
        mockListeners['observer:left'].forEach(callback => callback(observers));
      }
      expect(cb).toHaveBeenCalledWith([], observers);
    });
  });

  // Clean up after all tests
  afterAll(() => {
    jest.clearAllMocks();
    socketService.disconnect();
    socketService.setTestMode(false);
  });
}); 