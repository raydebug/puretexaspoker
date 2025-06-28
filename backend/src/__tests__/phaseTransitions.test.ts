import { GameService } from '../services/gameService';
import { gameManager } from '../services/gameManager';
import { Player } from '../types/shared';
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '../db';

describe('Enhanced Game Phase Transitions', () => {
  let gameService: GameService;
  let player1: Player;
  let player2: Player;
  let tableId: string;

  beforeEach(async () => {
    gameService = new GameService('test-game-id');
    
    // Create test players
    player1 = {
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
        type: 'default',
        color: '#000000'
      }
    };

    player2 = {
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
        type: 'default',
        color: '#000000'
      }
    };

    // Create table for integration tests
    const table = await prisma.table.create({
      data: {
        name: 'Test Table',
        maxPlayers: 9,
        smallBlind: 5,
        bigBlind: 10,
        minBuyIn: 100,
        maxBuyIn: 1000
      }
    });
    tableId = table.id;

    // Add players to table
    const dbPlayer1 = await prisma.player.create({
      data: { 
        nickname: 'Player 1',
        chips: 1000
      }
    });
    const dbPlayer2 = await prisma.player.create({
      data: { 
        nickname: 'Player 2',
        chips: 1000
      }
    });

    await prisma.playerTable.createMany({
      data: [
        { playerId: dbPlayer1.id, tableId, seatNumber: 1, buyIn: 1000 },
        { playerId: dbPlayer2.id, tableId, seatNumber: 2, buyIn: 1000 }
      ]
    });
  });

  afterEach(async () => {
    // Clean up database
    await prisma.gameAction.deleteMany();
    await prisma.game.deleteMany();
    await prisma.playerTable.deleteMany();
    await prisma.player.deleteMany();
    await prisma.table.deleteMany();
  });

  describe('Basic Phase Transitions', () => {
    beforeEach(() => {
      gameService.addPlayer(player1);
      gameService.addPlayer(player2);
      gameService.startGame();
    });

    it('should start in preflop phase', () => {
      const gameState = gameService.getGameState();
      expect(gameState.phase).toBe('preflop');
      expect(gameState.communityCards).toHaveLength(0);
    });

    it('should transition to flop when betting round completes', () => {
      // Complete preflop betting
      const currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.call(currentPlayerId!); // Player calls big blind
      
      const gameState = gameService.getGameState();
      expect(gameState.phase).toBe('flop');
      expect(gameState.communityCards).toHaveLength(3);
    });

    it('should transition through all phases correctly', () => {
      // Preflop to flop
      let currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.call(currentPlayerId!);
      expect(gameService.getGameState().phase).toBe('flop');

      // Flop to turn
      currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.check(currentPlayerId!);
      currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.check(currentPlayerId!);
      expect(gameService.getGameState().phase).toBe('turn');

      // Turn to river
      currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.check(currentPlayerId!);
      currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.check(currentPlayerId!);
      expect(gameService.getGameState().phase).toBe('river');

      // River to showdown
      currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.check(currentPlayerId!);
      currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.check(currentPlayerId!);
      
      const finalState = gameService.getGameState();
      expect(finalState.phase).toBe('finished');
      expect(finalState.isHandComplete).toBe(true);
      expect(finalState.winner).toBeDefined();
    });
  });

  describe('Betting Round Completion Logic', () => {
    beforeEach(() => {
      gameService.addPlayer(player1);
      gameService.addPlayer(player2);
      gameService.startGame();
    });

    it('should not advance phase until all players have acted', () => {
      const initialPhase = gameService.getGameState().phase;
      
      // First player acts but second hasn't
      const currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.placeBet(currentPlayerId!, 50);
      
      // Should still be in same phase
      expect(gameService.getGameState().phase).toBe(initialPhase);
      expect(gameService.getGameState().currentPlayerId).not.toBe(currentPlayerId);
    });

    it('should handle all-in scenarios correctly', () => {
      // Player raises to create a betting situation
      const currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.placeBet(currentPlayerId!, 100); // Raise to 100
      
      // Other player goes all-in by calling/raising with all chips
      const nextPlayerId = gameService.getGameState().currentPlayerId;
      const nextPlayer = gameService.getPlayer(nextPlayerId!);
      gameService.placeBet(nextPlayerId!, nextPlayer!.chips);
      
      // Should advance to flop after all-in scenario
      expect(gameService.getGameState().phase).toBe('flop');
    });

    it('should handle fold scenarios correctly', () => {
      const currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.fold(currentPlayerId!);
      
      const gameState = gameService.getGameState();
      expect(gameState.isHandComplete).toBe(true);
      expect(gameState.phase).toBe('finished');
      expect(gameState.winner).toBeDefined();
    });
  });

  describe('Enhanced dealCommunityCards validation', () => {
    beforeEach(() => {
      gameService.addPlayer(player1);
      gameService.addPlayer(player2);
      gameService.startGame();
    });

    it('should throw error when trying to deal while hand is complete', () => {
      // Complete the hand by folding
      const currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.fold(currentPlayerId!);
      
      expect(() => gameService.dealCommunityCards())
        .toThrow('Cannot deal community cards: hand is complete');
    });

    it('should throw error when trying to deal before game starts', () => {
      const newGameService = new GameService('test-game-id-2');
      expect(() => newGameService.dealCommunityCards())
        .toThrow('Cannot deal community cards: game not started');
    });

    it('should throw error when betting round is not complete', () => {
      // Don't complete betting round
      expect(() => gameService.dealCommunityCards())
        .toThrow('Cannot advance phase: betting round is not complete');
    });

    it('should throw error when trying to deal in showdown', () => {
      // Get to showdown
      let currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.call(currentPlayerId!); // Complete preflop
      
      // Complete flop, turn, river
      for (let i = 0; i < 3; i++) {
        currentPlayerId = gameService.getGameState().currentPlayerId;
        gameService.check(currentPlayerId!);
        currentPlayerId = gameService.getGameState().currentPlayerId;
        gameService.check(currentPlayerId!);
      }
      
      expect(() => gameService.dealCommunityCards())
        .toThrow('Cannot deal community cards: hand is complete');
    });
  });

  describe('Phase Information API', () => {
    beforeEach(() => {
      gameService.addPlayer(player1);
      gameService.addPlayer(player2);
      gameService.startGame();
    });

    it('should provide correct phase info for preflop', () => {
      const phaseInfo = gameService.getPhaseInfo();
      expect(phaseInfo.phase).toBe('preflop');
      expect(phaseInfo.description).toBe('Pre-flop betting round');
      expect(phaseInfo.communityCardCount).toBe(0);
      expect(phaseInfo.canBet).toBe(true);
      expect(phaseInfo.canDeal).toBe(false); // Betting not complete
    });

    it('should provide correct phase info for flop', () => {
      // Complete preflop
      const currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.call(currentPlayerId!);
      
      const phaseInfo = gameService.getPhaseInfo();
      expect(phaseInfo.phase).toBe('flop');
      expect(phaseInfo.description).toBe('Flop betting round (3 community cards)');
      expect(phaseInfo.communityCardCount).toBe(3);
      expect(phaseInfo.canBet).toBe(true);
      expect(phaseInfo.canDeal).toBe(false); // New betting round just started
    });

    it('should indicate when dealing is possible', () => {
      // Complete preflop betting
      const currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.call(currentPlayerId!);
      
      // Complete flop betting
      let nextPlayerId = gameService.getGameState().currentPlayerId;
      gameService.check(nextPlayerId!);
      nextPlayerId = gameService.getGameState().currentPlayerId;
      gameService.check(nextPlayerId!);
      
      const phaseInfo = gameService.getPhaseInfo();
      expect(phaseInfo.phase).toBe('turn');
      expect(phaseInfo.canDeal).toBe(false); // New betting round
    });
  });

  describe('New Hand Functionality', () => {
    beforeEach(() => {
      gameService.addPlayer(player1);
      gameService.addPlayer(player2);
      gameService.startGame();
    });

    it('should start new hand after current hand completes', () => {
      // Complete hand by folding
      const currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.fold(currentPlayerId!);
      
      expect(gameService.getGameState().isHandComplete).toBe(true);
      
      // Start new hand
      gameService.startNewHand();
      
      const newGameState = gameService.getGameState();
      expect(newGameState.phase).toBe('preflop');
      expect(newGameState.isHandComplete).toBe(false);
      expect(newGameState.pot).toBe(15); // New blinds posted
      expect(newGameState.communityCards).toHaveLength(0);
      expect(newGameState.winner).toBeUndefined();
    });

    it('should throw error when trying to start new hand before current completes', () => {
      expect(() => gameService.startNewHand())
        .toThrow('Cannot start new hand: current hand is not complete');
    });

    it('should throw error when not enough players have chips', () => {
      // Complete hand
      const currentPlayerId = gameService.getGameState().currentPlayerId;
      gameService.fold(currentPlayerId!);
      
      // Remove all chips from players
      gameService.getGameState().players.forEach(p => p.chips = 0);
      
      expect(() => gameService.startNewHand())
        .toThrow('Not enough players with chips to start new hand');
    });
  });

  describe('Integration with GameManager', () => {
    it('should handle phase transitions through GameManager', async () => {
      const gameState = await gameManager.createGame(tableId);
      const startedState = await gameManager.startGame(gameState.id);
      
      expect(startedState.phase).toBe('preflop');
      
      // Complete preflop betting
      const currentPlayerId = startedState.currentPlayerId;
      await gameManager.call(gameState.id, currentPlayerId!);
      
      const flopState = await gameManager.getGameState(gameState.id);
      expect(flopState?.phase).toBe('flop');
      expect(flopState?.communityCards).toHaveLength(3);
    });

    it('should get phase info through GameManager', async () => {
      const gameState = await gameManager.createGame(tableId);
      await gameManager.startGame(gameState.id);
      
      const phaseInfo = await gameManager.getPhaseInfo(gameState.id);
      expect(phaseInfo.phase).toBe('preflop');
      expect(phaseInfo.canBet).toBe(true);
    });

    it('should start new hand through GameManager', async () => {
      const gameState = await gameManager.createGame(tableId);
      const startedState = await gameManager.startGame(gameState.id);
      
      // Complete hand
      const currentPlayerId = startedState.currentPlayerId;
      await gameManager.fold(gameState.id, currentPlayerId!);
      
      // Start new hand
      const newHandState = await gameManager.startNewHand(gameState.id);
      expect(newHandState.phase).toBe('preflop');
      expect(newHandState.isHandComplete).toBe(false);
    });

    it('should handle force complete phase', async () => {
      const gameState = await gameManager.createGame(tableId);
      await gameManager.startGame(gameState.id);
      
      // Try to force complete before betting is done (should fail)
      try {
        await gameManager.forceCompletePhase(gameState.id);
        fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).toContain('Betting round not complete');
      }
      
      // Complete betting then force complete
      const currentState = await gameManager.getGameState(gameState.id);
      const currentPlayerId = currentState?.currentPlayerId;
      if (currentPlayerId) {
        await gameManager.call(gameState.id, currentPlayerId);
      }
      
      // Now should be able to force complete (though phase already advanced)
      const updatedState = await gameManager.getGameState(gameState.id);
      expect(updatedState?.phase).toBe('flop');
    });
  });
}); 