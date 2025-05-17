import { GameService } from '../services/gameService';
import { Player, GameState } from '../types/card';
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('GameService', () => {
  let gameService: GameService;
  let mockPlayers: Player[];

  beforeEach(() => {
    gameService = new GameService();
    mockPlayers = [
      { id: '1', name: 'Player 1', chips: 1000, hand: [], isActive: true, isDealer: false, currentBet: 0, position: 0 },
      { id: '2', name: 'Player 2', chips: 1000, hand: [], isActive: true, isDealer: false, currentBet: 0, position: 1 },
      { id: '3', name: 'Player 3', chips: 1000, hand: [], isActive: true, isDealer: false, currentBet: 0, position: 2 }
    ];
  });

  describe('game initialization', () => {
    it('should start a new game with valid number of players', () => {
      gameService.startNewGame(mockPlayers);
      const gameState = gameService.getGameState();
      expect(gameState.players.length).toBe(3);
      expect(gameState.status).toBe('playing');
      expect(gameState.phase).toBe('preflop');
    });

    it('should throw error with less than 2 players', () => {
      expect(() => gameService.startNewGame([mockPlayers[0]])).toThrow('Game must have between 2 and 9 players');
    });

    it('should throw error with more than 9 players', () => {
      const tooManyPlayers = Array(10).fill(null).map((_, i) => ({
        ...mockPlayers[0],
        id: String(i + 1),
        name: `Player ${i + 1}`
      }));
      expect(() => gameService.startNewGame(tooManyPlayers)).toThrow('Game must have between 2 and 9 players');
    });

    it('should deal 2 cards to each player', () => {
      gameService.startNewGame(mockPlayers);
      const gameState = gameService.getGameState();
      gameState.players.forEach(player => {
        expect(player.hand.length).toBe(2);
      });
    });
  });

  describe('blinds', () => {
    it('should collect small and big blinds correctly', () => {
      gameService.startNewGame(mockPlayers);
      const gameState = gameService.getGameState();
      // Small blind (position 1)
      expect(gameState.players[1].chips).toBe(995); // 1000 - 5
      expect(gameState.players[1].currentBet).toBe(5);
      // Big blind (position 2)
      expect(gameState.players[2].chips).toBe(990); // 1000 - 10
      expect(gameState.players[2].currentBet).toBe(10);
      expect(gameState.pot).toBe(15); // 5 + 10
      expect(gameState.currentBet).toBe(10);
    });
  });

  describe('betting', () => {
    it('should allow valid bet', () => {
      gameService.startNewGame(mockPlayers);
      gameService.placeBet('1', 20);
      const gameState = gameService.getGameState();
      const player = gameState.players.find(p => p.id === '1');
      expect(player?.chips).toBe(980); // 1000 - 20
      expect(player?.currentBet).toBe(20);
      expect(gameState.pot).toBe(35); // 15 (blinds) + 20
    });

    it('should throw error for insufficient chips', () => {
      gameService.startNewGame(mockPlayers);
      expect(() => gameService.placeBet('1', 2000)).toThrow('Insufficient chips');
    });

    it('should throw error for bet less than current bet', () => {
      gameService.startNewGame(mockPlayers);
      expect(() => gameService.placeBet('1', 5)).toThrow('Bet must be at least the current bet');
    });
  });

  describe('community cards', () => {
    it('should deal flop correctly', () => {
      gameService.startNewGame(mockPlayers);
      gameService.dealCommunityCards();
      const gameState = gameService.getGameState();
      expect(gameState.communityCards.length).toBe(3);
      expect(gameState.phase).toBe('flop');
    });

    it('should deal turn correctly', () => {
      gameService.startNewGame(mockPlayers);
      gameService.dealCommunityCards(); // Flop
      gameService.dealCommunityCards(); // Turn
      const gameState = gameService.getGameState();
      expect(gameState.communityCards.length).toBe(4);
      expect(gameState.phase).toBe('turn');
    });

    it('should deal river correctly', () => {
      gameService.startNewGame(mockPlayers);
      gameService.dealCommunityCards(); // Flop
      gameService.dealCommunityCards(); // Turn
      gameService.dealCommunityCards(); // River
      const gameState = gameService.getGameState();
      expect(gameState.communityCards.length).toBe(5);
      expect(gameState.phase).toBe('river');
    });

    it('should move to showdown after river', () => {
      gameService.startNewGame(mockPlayers);
      gameService.dealCommunityCards(); // Flop
      gameService.dealCommunityCards(); // Turn
      gameService.dealCommunityCards(); // River
      gameService.dealCommunityCards(); // Showdown
      const gameState = gameService.getGameState();
      expect(gameState.phase).toBe('showdown');
    });
  });

  describe('game state', () => {
    it('should return a copy of game state', () => {
      gameService.startNewGame(mockPlayers);
      const gameState = gameService.getGameState();
      const stateCopy = gameService.getGameState();
      expect(stateCopy).toEqual(gameState);
      expect(stateCopy).not.toBe(gameState); // Should be a new object
    });
  });

  describe('player turns', () => {
    it('should move to next player after valid action', () => {
      gameService.startNewGame(mockPlayers);
      gameService.placeBet('1', 20);
      const gameState = gameService.getGameState();
      expect(gameState.currentPlayerPosition).toBe(1);
    });

    it('should skip folded players', () => {
      gameService.startNewGame(mockPlayers);
      gameService.fold('1');
      gameService.placeBet('2', 20);
      const gameState = gameService.getGameState();
      expect(gameState.currentPlayerPosition).toBe(2);
    });

    it('should end round when all players have acted', () => {
      gameService.startNewGame(mockPlayers);
      gameService.placeBet('1', 20);
      gameService.placeBet('2', 20);
      gameService.placeBet('3', 20);
      const gameState = gameService.getGameState();
      expect(gameState.phase).toBe('flop');
    });
  });

  describe('player actions', () => {
    it('should handle player fold', () => {
      gameService.startNewGame(mockPlayers);
      gameService.fold('1');
      const gameState = gameService.getGameState();
      const player = gameState.players.find(p => p.id === '1');
      expect(player?.isActive).toBe(false);
    });

    it('should handle player check', () => {
      gameService.startNewGame(mockPlayers);
      gameService.check('1');
      const gameState = gameService.getGameState();
      expect(gameState.currentPlayerPosition).toBe(1);
    });

    it('should throw error when checking with existing bet', () => {
      gameService.startNewGame(mockPlayers);
      expect(() => gameService.check('2')).toThrow('Cannot check when there is a bet');
    });
  });

  describe('pot distribution', () => {
    it('should distribute pot to winner', () => {
      gameService.startNewGame(mockPlayers);
      gameService.placeBet('1', 20);
      gameService.placeBet('2', 20);
      gameService.fold('3');
      gameService.dealCommunityCards(); // Flop
      gameService.dealCommunityCards(); // Turn
      gameService.dealCommunityCards(); // River
      gameService.dealCommunityCards(); // Showdown
      
      const gameState = gameService.getGameState();
      const winner = gameState.players.find(p => p.id === '1');
      expect(winner?.chips).toBe(1000 + 35); // Initial chips + pot
    });

    it('should split pot between equal hands', () => {
      gameService.startNewGame(mockPlayers);
      gameService.placeBet('1', 20);
      gameService.placeBet('2', 20);
      gameService.placeBet('3', 20);
      gameService.dealCommunityCards(); // Flop
      gameService.dealCommunityCards(); // Turn
      gameService.dealCommunityCards(); // River
      gameService.dealCommunityCards(); // Showdown
      
      const gameState = gameService.getGameState();
      const pot = gameState.pot;
      const splitAmount = Math.floor(pot / 2);
      
      const player1 = gameState.players.find(p => p.id === '1');
      const player2 = gameState.players.find(p => p.id === '2');
      expect(player1?.chips).toBe(1000 - 20 + splitAmount);
      expect(player2?.chips).toBe(1000 - 20 + splitAmount);
    });
  });
}); 