import { io as mockIo, Socket } from 'socket.io-client';
import { socketService, SeatState } from './socketService';

jest.mock('socket.io-client');

describe('socketService', () => {
  let mockSocket: Partial<Socket>;

  beforeEach(() => {
    mockSocket = {
      emit: jest.fn(),
      on: jest.fn(),
      disconnect: jest.fn(),
      connected: false,
      removeAllListeners: jest.fn()
    };
    (mockIo as jest.Mock).mockReturnValue(mockSocket);
    socketService.disconnect();
  });

  it('should configure Socket.IO with correct options', () => {
    socketService.connect();
    expect(mockIo).toHaveBeenCalledWith('http://localhost:3001', {
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

  it('should emit seat:request when requestSeat is called', () => {
    socketService.connect();
    socketService.requestSeat('TestUser', 2);
    expect(mockSocket.emit).toHaveBeenCalledWith('seat:request', { nickname: 'TestUser', seatNumber: 2 });
  });

  it('should call seat:update listeners', () => {
    socketService.connect();
    const cb = jest.fn();
    socketService.onSeatUpdate(cb);
    // Simulate event
    const seats: SeatState = { 0: 'A', 1: null, 2: null, 3: null, 4: null };
    (mockSocket.on as jest.Mock).mock.calls.find(([event]) => event === 'seat:update')[1](seats);
    expect(cb).toHaveBeenCalledWith(seats);
  });

  it('should call seat:error listeners', () => {
    socketService.connect();
    const cb = jest.fn();
    socketService.onSeatError(cb);
    // Simulate event
    (mockSocket.on as jest.Mock).mock.calls.find(([event]) => event === 'seat:error')[1]({ message: 'Seat is already taken.' });
    expect(cb).toHaveBeenCalledWith('Seat is already taken.');
  });

  it('should support multiple listeners for seat:update', () => {
    socketService.connect();
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    socketService.onSeatUpdate(cb1);
    socketService.onSeatUpdate(cb2);
    const seats: SeatState = { 0: null, 1: 'B', 2: null, 3: null, 4: null };
    (mockSocket.on as jest.Mock).mock.calls.find(([event]) => event === 'seat:update')[1](seats);
    expect(cb1).toHaveBeenCalledWith(seats);
    expect(cb2).toHaveBeenCalledWith(seats);
  });

  // Adding proper cleanup to ensure tests don't hang
  afterAll(() => {
    jest.clearAllMocks();
    socketService.disconnect();
  });
}); 