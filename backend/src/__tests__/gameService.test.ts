import { GameService } from '../services/gameService';
import { Card, Player, Avatar } from '../types/card';
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('GameService', () => {
  let gameService: GameService;

  beforeEach(() => {
    gameService = new GameService();
  });

  describe('addPlayer', () => {
    it('should add a player with correct initial values', () => {
      const player: Player = {
        id: 'player1',
        name: 'Player 1',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 0,
        seatNumber: 0,
        isAway: false,
        cards: [],
        hand: [],
        avatar: 'default' as Avatar
      };
      gameService.addPlayer(player);
      const addedPlayer = gameService.getPlayer(player.id);
      expect(addedPlayer).toBeDefined();
      expect(addedPlayer?.name).toBe('Player 1');
      expect(addedPlayer?.chips).toBe(1000);
      expect(addedPlayer?.isActive).toBe(true);
      expect(addedPlayer?.isDealer).toBe(false);
      expect(addedPlayer?.currentBet).toBe(0);
      expect(addedPlayer?.position).toBe(0);
      expect(addedPlayer?.seatNumber).toBe(0);
      expect(addedPlayer?.isAway).toBe(false);
      expect(addedPlayer?.cards).toEqual([]);
      expect(addedPlayer?.hand).toEqual([]);
      expect(addedPlayer?.avatar).toBe('default');
    });

    it('should throw error when adding more than 9 players', () => {
      const players = Array.from({ length: 9 }, (_, i) => ({
        id: `player${i + 1}`,
        name: `Player ${i + 1}`,
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: i,
        seatNumber: i,
        isAway: false,
        cards: [],
        hand: [],
        avatar: 'default' as Avatar
      }));
      players.forEach(player => gameService.addPlayer(player));
      const player10: Player = {
        id: 'player10',
        name: 'Player 10',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 9,
        seatNumber: 9,
        isAway: false,
        cards: [],
        hand: [],
        avatar: 'default' as Avatar
      };
      expect(() => gameService.addPlayer(player10)).toThrow('Table is full');
    });
  });

  describe('placeBet', () => {
    it('should place a bet correctly', () => {
      const player: Player = {
        id: 'player1',
        name: 'Player 1',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 0,
        seatNumber: 0,
        isAway: false,
        cards: [],
        hand: [],
        avatar: 'default' as Avatar
      };
      gameService.addPlayer(player);
      gameService.placeBet(player.id, 100);
      const updatedPlayer = gameService.getPlayer(player.id);
      expect(updatedPlayer?.chips).toBe(900);
      expect(updatedPlayer?.currentBet).toBe(100);
      expect(gameService.getGameState().pot).toBe(100);
      expect(gameService.getGameState().currentBet).toBe(100);
    });

    it('should throw error when bet amount is greater than player chips', () => {
      const player: Player = {
        id: 'player1',
        name: 'Player 1',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 0,
        seatNumber: 0,
        isAway: false,
        cards: [],
        hand: [],
        avatar: 'default' as Avatar
      };
      gameService.addPlayer(player);
      expect(() => gameService.placeBet(player.id, 2000)).toThrow('Not enough chips');
    });

    it('should throw error when bet amount is less than current bet', () => {
      const player1: Player = {
        id: 'player1',
        name: 'Player 1',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 0,
        seatNumber: 0,
        isAway: false,
        cards: [],
        hand: [],
        avatar: 'default' as Avatar
      };
      const player2: Player = {
        id: 'player2',
        name: 'Player 2',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 1,
        seatNumber: 1,
        isAway: false,
        cards: [],
        hand: [],
        avatar: 'default' as Avatar
      };
      gameService.addPlayer(player1);
      gameService.addPlayer(player2);
      gameService.placeBet(player1.id, 100);
      expect(() => gameService.placeBet(player2.id, 50)).toThrow('Bet amount is too small');
    });
  });

  describe('fold', () => {
    it('should mark player as inactive when folding', () => {
      const player: Player = {
        id: 'player1',
        name: 'Player 1',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 0,
        seatNumber: 0,
        isAway: false,
        cards: [],
        hand: [],
        avatar: 'default' as Avatar
      };
      gameService.addPlayer(player);
      gameService.fold(player.id);
      const updatedPlayer = gameService.getPlayer(player.id);
      expect(updatedPlayer?.isActive).toBe(false);
    });

    it('should throw error when player not found', () => {
      expect(() => gameService.fold('non-existent')).toThrow('Player not found');
    });
  });

  describe('check', () => {
    it('should allow check when no current bet', () => {
      const player: Player = {
        id: 'player1',
        name: 'Player 1',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 0,
        seatNumber: 0,
        isAway: false,
        cards: [],
        hand: [],
        avatar: 'default' as Avatar
      };
      gameService.addPlayer(player);
      expect(() => gameService.check(player.id)).not.toThrow();
    });

    it('should throw error when there is a current bet', () => {
      const player1: Player = {
        id: 'player1',
        name: 'Player 1',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 0,
        seatNumber: 0,
        isAway: false,
        cards: [],
        hand: [],
        avatar: 'default' as Avatar
      };
      const player2: Player = {
        id: 'player2',
        name: 'Player 2',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 1,
        seatNumber: 1,
        isAway: false,
        cards: [],
        hand: [],
        avatar: 'default' as Avatar
      };
      gameService.addPlayer(player1);
      gameService.addPlayer(player2);
      gameService.placeBet(player1.id, 100);
      expect(() => gameService.check(player2.id)).toThrow('Cannot check, must call or raise');
    });
  });

  describe('evaluateHands', () => {
    it('should evaluate and compare hands correctly', () => {
      const player1: Player = {
        id: 'player1',
        name: 'Player 1',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 0,
        seatNumber: 0,
        isAway: false,
        cards: [],
        hand: [
          { suit: 'hearts', value: 'A' },
          { suit: 'hearts', value: 'K' }
        ],
        avatar: 'default' as Avatar
      };
      const player2: Player = {
        id: 'player2',
        name: 'Player 2',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 1,
        seatNumber: 1,
        isAway: false,
        cards: [],
        hand: [
          { suit: 'spades', value: 'A' },
          { suit: 'hearts', value: '2' }
        ],
        avatar: 'default' as Avatar
      };
      gameService.addPlayer(player1);
      gameService.addPlayer(player2);
      const gameState = gameService.getGameState();
      gameState.communityCards = [
        { suit: 'hearts', value: 'Q' },
        { suit: 'hearts', value: 'J' },
        { suit: 'hearts', value: '10' },
        { suit: 'diamonds', value: '3' },
        { suit: 'clubs', value: '4' }
      ];
      const evaluatedHands = gameService.evaluateHands();
      const player1Hand = evaluatedHands.find(h => h.playerId === player1.id);
      const player2Hand = evaluatedHands.find(h => h.playerId === player2.id);
      expect(player1Hand?.hand.name).toBe('Royal Flush');
      expect(player2Hand?.hand.name).toBe('High Card');
    });
  });

  describe('updatePlayerStatus', () => {
    it('should update player away status', () => {
      const player: Player = {
        id: 'player1',
        name: 'Player 1',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 0,
        seatNumber: 0,
        isAway: false,
        cards: [],
        hand: [],
        avatar: 'default' as Avatar
      };
      gameService.addPlayer(player);
      gameService.updatePlayerStatus(player.id, true);
      const updatedPlayer = gameService.getPlayer(player.id);
      expect(updatedPlayer?.isAway).toBe(true);
      gameService.updatePlayerStatus(player.id, false);
      const updatedPlayer2 = gameService.getPlayer(player.id);
      expect(updatedPlayer2?.isAway).toBe(false);
    });

    it('should not throw error when player not found', () => {
      expect(() => gameService.updatePlayerStatus('non-existent', true)).not.toThrow();
    });
  });
}); 