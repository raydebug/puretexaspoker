import { Server } from 'socket.io';
import { WebSocketService } from '../services/websocketService';
import { Player } from '../types/card';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;
  let mockIo: Server;
  let mockSocket: any;

  beforeEach(() => {
    // Mock socket.io server
    mockIo = {
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    } as any;

    // Mock socket
    mockSocket = {
      id: 'test-socket-id',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      on: jest.fn()
    };

    // Setup socket.io connection handler
    (mockIo.on as jest.Mock).mockImplementation((event: string, callback: (socket: any) => void) => {
      if (event === 'connection') {
        callback(mockSocket);
      }
    });

    webSocketService = new WebSocketService(mockIo);
  });

  describe('connection handling', () => {
    it('should handle client connection', () => {
      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should handle client disconnect', () => {
      const disconnectCallback = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'disconnect'
      )[1];
      disconnectCallback();
      expect(mockSocket.leave).toHaveBeenCalled();
    });
  });

  describe('game actions', () => {
    const mockGameId = 'test-game';
    const mockPlayer: Player = {
      id: 'test-player',
      name: 'Test Player',
      chips: 1000,
      hand: [],
      isActive: true,
      isDealer: false,
      currentBet: 0,
      position: 0
    };

    it('should handle join game', () => {
      const joinGameCallback = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'joinGame'
      )[1];
      joinGameCallback(mockGameId, mockPlayer);
      expect(mockSocket.join).toHaveBeenCalledWith(mockGameId);
      expect(mockIo.to).toHaveBeenCalledWith(mockGameId);
      expect(mockIo.emit).toHaveBeenCalledWith('gameStateUpdate', expect.any(Object));
    });

    it('should handle leave game', () => {
      const leaveGameCallback = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'leaveGame'
      )[1];
      leaveGameCallback(mockGameId, mockPlayer.id);
      expect(mockSocket.leave).toHaveBeenCalledWith(mockGameId);
      expect(mockIo.to).toHaveBeenCalledWith(mockGameId);
      expect(mockIo.emit).toHaveBeenCalledWith('playerLeft', mockPlayer.id);
    });

    it('should handle place bet', () => {
      const placeBetCallback = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'placeBet'
      )[1];
      placeBetCallback(mockGameId, mockPlayer.id, 100);
      expect(mockIo.to).toHaveBeenCalledWith(mockGameId);
      expect(mockIo.emit).toHaveBeenCalledWith('gameStateUpdate', expect.any(Object));
    });

    it('should handle fold', () => {
      const foldCallback = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'fold'
      )[1];
      foldCallback(mockGameId, mockPlayer.id);
      expect(mockIo.to).toHaveBeenCalledWith(mockGameId);
      expect(mockIo.emit).toHaveBeenCalledWith('gameStateUpdate', expect.any(Object));
    });

    it('should handle check', () => {
      const checkCallback = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'check'
      )[1];
      checkCallback(mockGameId, mockPlayer.id);
      expect(mockIo.to).toHaveBeenCalledWith(mockGameId);
      expect(mockIo.emit).toHaveBeenCalledWith('gameStateUpdate', expect.any(Object));
    });
  });

  describe('error handling', () => {
    it('should emit error on failed action', () => {
      const mockError = new Error('Test error');
      mockSocket.emit.mockImplementation(() => {
        throw mockError;
      });

      const joinGameCallback = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'joinGame'
      )[1];
      joinGameCallback('test-game', { id: 'test-player' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to join game'
      });
    });
  });
}); 