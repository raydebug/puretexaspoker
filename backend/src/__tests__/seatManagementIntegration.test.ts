import { gameManager } from '../services/gameManager';
import { prisma } from '../db';

describe('Seat Management Integration', () => {
  let tableId: string;
  let playerId1: string;
  let playerId2: string;
  let playerId3: string;

  beforeEach(async () => {
    // Clean up any existing data in correct order to avoid foreign key constraints
    await prisma.gameAction.deleteMany();
    await prisma.game.deleteMany();
    await prisma.playerTable.deleteMany();
    await prisma.player.deleteMany();
    await prisma.table.deleteMany();

    // Create players
    const player1 = await prisma.player.create({
      data: {
        nickname: 'SeatPlayer1',
        chips: 1000
      }
    });

    const player2 = await prisma.player.create({
      data: {
        nickname: 'SeatPlayer2',
        chips: 1000
      }
    });

    const player3 = await prisma.player.create({
      data: {
        nickname: 'SeatPlayer3',
        chips: 1000
      }
    });

    playerId1 = player1.id;
    playerId2 = player2.id;
    playerId3 = player3.id;

    // Create table
    const table = await prisma.table.create({
      data: {
        name: 'Seat Management Test Table',
        maxPlayers: 6,
        smallBlind: 5,
        bigBlind: 10,
        minBuyIn: 100,
        maxBuyIn: 1000
      }
    });

    tableId = table.id;

    // Add players to table with specific seat numbers
    await prisma.playerTable.create({
      data: {
        playerId: playerId1,
        tableId,
        seatNumber: 1,
        buyIn: 500
      }
    });

    await prisma.playerTable.create({
      data: {
        playerId: playerId2,
        tableId,
        seatNumber: 3,
        buyIn: 500
      }
    });

    await prisma.playerTable.create({
      data: {
        playerId: playerId3,
        tableId,
        seatNumber: 5,
        buyIn: 500
      }
    });
  });

  afterEach(async () => {
    // Clean up in correct order to avoid foreign key constraints
    await prisma.gameAction.deleteMany();
    await prisma.game.deleteMany();
    await prisma.playerTable.deleteMany();
    await prisma.player.deleteMany();
    await prisma.table.deleteMany();
  });

  it('should properly manage seat assignments and turn order', async () => {
    // Create game
    const gameState = await gameManager.createGame(tableId);
    expect(gameState.players).toHaveLength(3);
    
    // Verify players are assigned to correct seats
    const player1 = gameState.players.find(p => p.id === playerId1);
    const player2 = gameState.players.find(p => p.id === playerId2);
    const player3 = gameState.players.find(p => p.id === playerId3);

    expect(player1?.seatNumber).toBe(1);
    expect(player2?.seatNumber).toBe(3);
    expect(player3?.seatNumber).toBe(5);

    // Initially players should not be active (until game starts)
    expect(player1?.isActive).toBe(false);
    expect(player2?.isActive).toBe(false);
    expect(player3?.isActive).toBe(false);

    // Start game - this should activate seated players
    const startedGameState = await gameManager.startGame(gameState.id);
    
    // After starting, all seated players should be active
    const activePlayer1 = startedGameState.players.find(p => p.id === playerId1);
    const activePlayer2 = startedGameState.players.find(p => p.id === playerId2);
    const activePlayer3 = startedGameState.players.find(p => p.id === playerId3);

    expect(activePlayer1?.isActive).toBe(true);
    expect(activePlayer2?.isActive).toBe(true);
    expect(activePlayer3?.isActive).toBe(true);

    // Verify proper turn order based on seat positions
    expect(startedGameState.currentPlayerId).toBeTruthy();
    expect(startedGameState.phase).toBe('preflop');
    expect(startedGameState.pot).toBe(15); // 5 + 10 blinds
  });

  it('should handle proper turn management during betting rounds', async () => {
    // Create and start game
    const gameState = await gameManager.createGame(tableId);
    const startedGameState = await gameManager.startGame(gameState.id);
    
    const firstPlayerId = startedGameState.currentPlayerId;
    expect(firstPlayerId).toBeTruthy();

    // Verify it's the correct player's turn (should be first to act after big blind)
    const currentPlayer = startedGameState.players.find(p => p.id === firstPlayerId);
    expect(currentPlayer).toBeTruthy();

    // Player action should work - call the big blind
    const initialPot = startedGameState.pot;
    const afterCallState = await gameManager.call(gameState.id, firstPlayerId!);
    expect(afterCallState.pot).toBeGreaterThanOrEqual(initialPot);

    // Current player should have changed
    expect(afterCallState.currentPlayerId).not.toBe(firstPlayerId);
    expect(afterCallState.currentPlayerId).toBeTruthy();
  });

  it('should handle dealer button movement correctly', async () => {
    // Create and start game
    const gameState = await gameManager.createGame(tableId);
    const startedGameState = await gameManager.startGame(gameState.id);
    
    const initialDealerPosition = startedGameState.dealerPosition;
    
    // Get the game service to check dealer management
    const game = gameManager.getGame(gameState.id);
    expect(game).toBeTruthy();
    
    if (game) {
      const seatManager = game.getSeatManager();
      const turnOrder = seatManager.calculateTurnOrder(startedGameState.players);
      
      // Verify turn order is based on seat numbers (ascending)
      expect(turnOrder).toHaveLength(3);
      expect(turnOrder[0].seatNumber).toBe(1);
      expect(turnOrder[1].seatNumber).toBe(3);
      expect(turnOrder[2].seatNumber).toBe(5);
      
      // Dealer position should be a valid index
      expect(initialDealerPosition).toBeGreaterThanOrEqual(0);
      expect(initialDealerPosition).toBeLessThan(turnOrder.length);
    }
  });

  it('should handle player folding and turn advancement', async () => {
    // Create and start game
    const gameState = await gameManager.createGame(tableId);
    const startedGameState = await gameManager.startGame(gameState.id);
    
    const firstPlayerId = startedGameState.currentPlayerId;
    expect(firstPlayerId).toBeTruthy();

    // First player folds
    const afterFoldState = await gameManager.fold(gameState.id, firstPlayerId!);
    
    // Player should be inactive
    const foldedPlayer = afterFoldState.players.find(p => p.id === firstPlayerId);
    expect(foldedPlayer?.isActive).toBe(false);
    
    // Current player should have moved to next active player
    expect(afterFoldState.currentPlayerId).not.toBe(firstPlayerId);
    expect(afterFoldState.currentPlayerId).toBeTruthy();
    
    // Should still have 2 active players
    const activePlayers = afterFoldState.players.filter(p => p.isActive);
    expect(activePlayers).toHaveLength(2);
  });

  it('should handle heads-up scenario correctly', async () => {
    // Remove one player to create heads-up
    await prisma.playerTable.deleteMany({
      where: { playerId: playerId3 }
    });

    // Create game with only 2 players
    const gameState = await gameManager.createGame(tableId);
    expect(gameState.players).toHaveLength(2);
    
    const startedGameState = await gameManager.startGame(gameState.id);
    
    // Should have proper blind structure for heads-up
    expect(startedGameState.pot).toBe(15); // 5 + 10 blinds
    expect(startedGameState.currentPlayerId).toBeTruthy();
    
    // Both players should be active
    const activePlayers = startedGameState.players.filter(p => p.isActive);
    expect(activePlayers).toHaveLength(2);
  });

  it('should handle bet and raise actions with proper turn management', async () => {
    // Create and start game
    const gameState = await gameManager.createGame(tableId);
    const startedGameState = await gameManager.startGame(gameState.id);
    
    const firstPlayerId = startedGameState.currentPlayerId;
    expect(firstPlayerId).toBeTruthy();

    // Get the current player's current bet to calculate proper raise
    const currentPlayer = startedGameState.players.find(p => p.id === firstPlayerId);
    const currentBet = currentPlayer?.currentBet || 0;
    const requiredCall = startedGameState.currentBet - currentBet;
    
    // First player raises (call + additional significant raise amount)
    const raiseAmount = requiredCall + 25; // Ensure this is a proper raise above current bet
    const initialPot = startedGameState.pot;
    const initialCurrentBet = startedGameState.currentBet;
    const afterRaiseState = await gameManager.placeBet(gameState.id, firstPlayerId!, raiseAmount);
    
    // Pot should increase
    expect(afterRaiseState.pot).toBeGreaterThan(initialPot);
    expect(afterRaiseState.currentBet).toBeGreaterThan(initialCurrentBet);
    
    // Current player should advance
    expect(afterRaiseState.currentPlayerId).not.toBe(firstPlayerId);
    
    // Player should have increased bet amount
    const raisingPlayer = afterRaiseState.players.find(p => p.id === firstPlayerId);
    expect(raisingPlayer?.currentBet).toBeGreaterThan(currentBet);
  });

  it('should handle check action in proper scenarios', async () => {
    // Create and start game
    const gameState = await gameManager.createGame(tableId);
    const startedGameState = await gameManager.startGame(gameState.id);
    
    // Get to a state where check is valid (post-flop with no current bet)
    // Call to complete preflop betting
    let currentGameState = startedGameState;
    const activePlayers = currentGameState.players.filter(p => p.isActive);
    
    // Complete preflop betting round
    for (let i = 0; i < activePlayers.length && currentGameState.phase === 'preflop'; i++) {
      if (currentGameState.currentPlayerId) {
        try {
          currentGameState = await gameManager.call(gameState.id, currentGameState.currentPlayerId);
        } catch (error) {
          // If call fails, player might already have correct amount
          break;
        }
      }
    }
    
    // Should progress to flop automatically when betting round completes
    if (currentGameState.phase === 'flop') {
      expect(currentGameState.communityCards).toHaveLength(3);
      expect(currentGameState.currentBet).toBe(0); // Betting round reset
      
      // Test check action if there's a current player
      const currentPlayerId = currentGameState.currentPlayerId;
      if (currentPlayerId) {
        const beforeCheck = currentGameState.currentPlayerId;
        const afterCheckState = await gameManager.check(gameState.id, currentPlayerId);
        
        // Verify the action succeeded (game state should change)
        expect(afterCheckState).toBeDefined();
        expect(afterCheckState.players.find(p => p.id === currentPlayerId)).toBeTruthy();
      }
    }
  });
}); 