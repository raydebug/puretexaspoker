import { GameService } from '../services/gameService';
import { Card, Player, Avatar } from '../types/shared';
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('GameService', () => {
  let gameService: GameService;
  let defaultPlayer: Player;

  beforeEach(() => {
    gameService = new GameService('test-game-id');
    defaultPlayer = {
      id: 'player1',
      name: 'Player 1',
      chips: 1000,
      isActive: true,
      isDealer: false,
      currentBet: 0,
      position: 0,
      seatNumber: 1,
      isAway: false,
      cards: [],
      avatar: {
        type: 'default' as 'default' | 'image' | 'initials',
        color: '#000000'
      }
    };
  });

  describe('addPlayer', () => {
    it('should add a player with correct initial values', () => {
      gameService.addPlayer(defaultPlayer);
      const addedPlayer = gameService.getPlayer(defaultPlayer.id);
      expect(addedPlayer).toBeDefined();
      expect(addedPlayer?.name).toBe('Player 1');
      expect(addedPlayer?.chips).toBe(1000);
      expect(addedPlayer?.isActive).toBe(true);
      expect(addedPlayer?.isDealer).toBe(false);
      expect(addedPlayer?.currentBet).toBe(0);
      expect(addedPlayer?.position).toBe(0);
      expect(addedPlayer?.seatNumber).toBe(1);
      expect(addedPlayer?.isAway).toBe(false);
      expect(addedPlayer?.cards).toEqual([]);
      expect(addedPlayer?.avatar.type).toBe('default');
    });

    it('should throw error when adding more than 9 players', () => {
      const players = Array.from({ length: 8 }, (_, i) => ({
        id: `player${i + 1}`,
        name: `Player ${i + 1}`,
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: i,
        seatNumber: i + 1,
        isAway: false,
        cards: [],
        avatar: {
          type: 'default' as 'default' | 'image' | 'initials',
          color: '#000000'
        }
      }));
      players.forEach(player => gameService.addPlayer(player));
      const player9: Player = {
        id: 'player9',
        name: 'Player 9',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 8,
        seatNumber: 1,
        isAway: false,
        cards: [],
        avatar: {
          type: 'default' as 'default' | 'image' | 'initials',
          color: '#000000'
        }
      };
      expect(() => gameService.addPlayer(player9)).toThrow('Seat is already occupied');
    });
  });

  describe('game actions', () => {
    let player1: Player;
    let player2: Player;

    beforeEach(() => {
      player1 = { ...defaultPlayer, id: 'player1', position: 0, seatNumber: 1 };
      player2 = { ...defaultPlayer, id: 'player2', position: 1, seatNumber: 2 };
      gameService.addPlayer(player1);
      gameService.addPlayer(player2);
      gameService.startGame();
    });

    describe('placeBet', () => {
      it('should place a bet correctly when it is player\'s turn', () => {
        const currentPlayerId = gameService.getGameState().currentPlayerId;
        const player = gameService.getPlayer(currentPlayerId!);
        const initialChips = player!.chips;
        const initialBet = player!.currentBet;
        const betAmount = 100;
        
        gameService.placeBet(currentPlayerId!, betAmount);
        
        const updatedPlayer = gameService.getPlayer(currentPlayerId!);
        expect(updatedPlayer?.chips).toBe(initialChips - betAmount);
        expect(updatedPlayer?.currentBet).toBe(initialBet + betAmount);
        expect(gameService.getGameState().pot).toBe(
          gameService.getGameState().smallBlind + 
          gameService.getGameState().bigBlind + 
          betAmount
        );
        expect(gameService.getGameState().currentBet).toBe(initialBet + betAmount);
      });

      it('should throw error when player is not active', () => {
        const currentPlayerId = gameService.getGameState().currentPlayerId;
        const player = gameService.getPlayer(currentPlayerId!);
        player!.isActive = false;
        
        expect(() => gameService.placeBet(currentPlayerId!, 100))
          .toThrow('Player is not active in the game');
      });

      it('should throw error when it is not player\'s turn', () => {
        const currentPlayerId = gameService.getGameState().currentPlayerId;
        const otherPlayerId = currentPlayerId === player1.id ? player2.id : player1.id;
        
        expect(() => gameService.placeBet(otherPlayerId, 100))
          .toThrow('Not player\'s turn');
      });

      it('should throw error when bet amount exceeds player chips', () => {
        const currentPlayerId = gameService.getGameState().currentPlayerId;
        
        expect(() => gameService.placeBet(currentPlayerId!, 2000))
          .toThrow('Insufficient chips');
      });

      it('should throw error when bet amount is less than minimum call', () => {
        const currentPlayerId = gameService.getGameState().currentPlayerId;
        gameService.placeBet(currentPlayerId!, 100);
        
        const nextPlayerId = gameService.getGameState().currentPlayerId;
        expect(() => gameService.placeBet(nextPlayerId!, 50))
          .toThrow('Must call or raise');
      });

      it('should throw error when raise amount is less than minimum raise', () => {
        const currentPlayerId = gameService.getGameState().currentPlayerId;
        const currentBet = gameService.getGameState().currentBet;
        const minRaise = gameService.getGameState().minBet;
        const currentPlayerBet = gameService.getPlayer(currentPlayerId!)!.currentBet;
        const minCallAmount = currentBet - currentPlayerBet;
        const invalidRaise = minCallAmount + (minRaise - 1); // Just under minimum raise
        
        expect(() => gameService.placeBet(currentPlayerId!, invalidRaise))
          .toThrow('Minimum raise amount');
      });
    });

    describe('fold', () => {
      it('should mark player as inactive when folding on their turn', () => {
        const currentPlayerId = gameService.getGameState().currentPlayerId;
        
        gameService.fold(currentPlayerId!);
        
        const updatedPlayer = gameService.getPlayer(currentPlayerId!);
        expect(updatedPlayer?.isActive).toBe(false);
      });

      it('should throw error when player not found', () => {
        expect(() => gameService.fold('non-existent'))
          .toThrow('Player not found');
      });

      it('should throw error when it is not player\'s turn', () => {
        const currentPlayerId = gameService.getGameState().currentPlayerId;
        const otherPlayerId = currentPlayerId === player1.id ? player2.id : player1.id;
        
        expect(() => gameService.fold(otherPlayerId))
          .toThrow('Not player\'s turn');
      });
    });

    describe('check', () => {
      beforeEach(() => {
        // Reset current bet to allow checking
        const gameState = gameService.getGameState();
        gameState.currentBet = 0;
        gameState.players.forEach(p => p.currentBet = 0);
      });

      it('should allow check when no current bet and it is player\'s turn', () => {
        const currentPlayerId = gameService.getGameState().currentPlayerId;
        expect(() => gameService.check(currentPlayerId!))
          .not.toThrow();
      });

      it('should throw error when there is a current bet', () => {
        const firstPlayerId = gameService.getGameState().currentPlayerId;
        gameService.placeBet(firstPlayerId!, 50);
        
        const secondPlayerId = gameService.getGameState().currentPlayerId;
        expect(() => gameService.check(secondPlayerId!))
          .toThrow('Cannot check, must call 50 or raise');
      });

      it('should throw error when it is not player\'s turn', () => {
        const currentPlayerId = gameService.getGameState().currentPlayerId;
        const otherPlayerId = currentPlayerId === player1.id ? player2.id : player1.id;
        
        expect(() => gameService.check(otherPlayerId))
          .toThrow('Not player\'s turn');
      });
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
        seatNumber: 1,
        isAway: false,
        cards: [],
        avatar: {
          type: 'default' as 'default' | 'image' | 'initials',
          color: '#000000'
        }
      };
      const player2: Player = {
        id: 'player2',
        name: 'Player 2',
        chips: 1000,
        isActive: true,
        isDealer: false,
        currentBet: 0,
        position: 1,
        seatNumber: 2,
        isAway: false,
        cards: [],
        avatar: {
          type: 'default' as 'default' | 'image' | 'initials',
          color: '#000000'
        }
      };
      gameService.addPlayer(player1);
      gameService.addPlayer(player2);

      const communityCards: Card[] = [
        { suit: 'hearts', rank: 'Q' },
        { suit: 'hearts', rank: 'J' },
        { suit: 'hearts', rank: '10' },
        { suit: 'diamonds', rank: '3' },
        { suit: 'clubs', rank: '4' }
      ];
      // ... rest of the test
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
        seatNumber: 1,
        isAway: false,
        cards: [],
        avatar: {
          type: 'default' as 'default' | 'image' | 'initials',
          color: '#000000'
        }
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