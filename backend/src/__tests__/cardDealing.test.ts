import { gameManager } from '../services/gameManager';
import { prisma } from '../db';

describe('Card Dealing Integration', () => {
  let tableId: string;
  let playerId1: string;
  let playerId2: string;

  beforeEach(async () => {
    // Clean up any existing data
    await prisma.gameAction.deleteMany();
    await prisma.game.deleteMany();
    await prisma.playerTable.deleteMany();
    await prisma.player.deleteMany();
    await prisma.table.deleteMany();

    // Create players
    const player1 = await prisma.player.create({
      data: {
        nickname: 'TestPlayer1',
        chips: 1000
      }
    });

    const player2 = await prisma.player.create({
      data: {
        nickname: 'TestPlayer2',
        chips: 1000
      }
    });

    playerId1 = player1.id;
    playerId2 = player2.id;

    // Create table
    const table = await prisma.table.create({
      data: {
        name: 'Test Table',
        maxPlayers: 6,
        smallBlind: 5,
        bigBlind: 10,
        minBuyIn: 100,
        maxBuyIn: 1000
      }
    });

    tableId = table.id;

    // Add players to table
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
        seatNumber: 2,
        buyIn: 500
      }
    });
  });

  afterEach(async () => {
    // Clean up
    await prisma.gameAction.deleteMany();
    await prisma.game.deleteMany();
    await prisma.playerTable.deleteMany();
    await prisma.player.deleteMany();
    await prisma.table.deleteMany();
  });

  it('should deal cards to players when game starts', async () => {
    // Create game
    const gameState = await gameManager.createGame(tableId);
    expect(gameState.players).toHaveLength(2);
    expect(gameState.status).toBe('waiting');

    // Start game (this should deal cards)
    const startedGameState = await gameManager.startGame(gameState.id);
    
    // Verify cards were dealt
    expect(startedGameState.status).toBe('playing');
    expect(startedGameState.phase).toBe('preflop');
    expect(startedGameState.players[0].cards).toHaveLength(2);
    expect(startedGameState.players[1].cards).toHaveLength(2);
    
    // Each card should have rank and suit
    const player1Cards = startedGameState.players[0].cards;
    expect(player1Cards[0]).toHaveProperty('rank');
    expect(player1Cards[0]).toHaveProperty('suit');
    expect(player1Cards[1]).toHaveProperty('rank');
    expect(player1Cards[1]).toHaveProperty('suit');

    // Verify blinds were posted
    expect(startedGameState.pot).toBe(15); // 5 + 10
    expect(startedGameState.currentBet).toBe(10);
  });

  it('should deal community cards through all phases', async () => {
    // Create and start game
    const gameState = await gameManager.createGame(tableId);
    const startedGameState = await gameManager.startGame(gameState.id);
    
    expect(startedGameState.phase).toBe('preflop');
    expect(startedGameState.communityCards).toHaveLength(0);

    // Complete preflop betting first
    const currentPlayerId = startedGameState.currentPlayerId;
    const callState = await gameManager.call(gameState.id, currentPlayerId!);
    
    // Deal flop (should happen automatically after betting round completes)
    expect(callState.phase).toBe('flop');
    expect(callState.communityCards).toHaveLength(3);
    
    // Complete flop betting
    let nextPlayerId = callState.currentPlayerId;
    const checkState1 = await gameManager.check(gameState.id, nextPlayerId!);
    nextPlayerId = checkState1.currentPlayerId;
    const checkState2 = await gameManager.check(gameState.id, nextPlayerId!);
    
    // Deal turn (should happen automatically)
    expect(checkState2.phase).toBe('turn');
    expect(checkState2.communityCards).toHaveLength(4);
    
    // Complete turn betting
    nextPlayerId = checkState2.currentPlayerId;
    const checkState3 = await gameManager.check(gameState.id, nextPlayerId!);
    nextPlayerId = checkState3.currentPlayerId;
    const checkState4 = await gameManager.check(gameState.id, nextPlayerId!);
    
    // Deal river (should happen automatically)
    expect(checkState4.phase).toBe('river');
    expect(checkState4.communityCards).toHaveLength(5);
    
    // All community cards should have rank and suit
    checkState4.communityCards.forEach(card => {
      expect(card).toHaveProperty('rank');
      expect(card).toHaveProperty('suit');
      expect(['hearts', 'diamonds', 'clubs', 'spades']).toContain(card.suit);
      expect(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']).toContain(card.rank);
    });
  });

  it('should handle basic betting actions', async () => {
    // Create and start game
    const gameState = await gameManager.createGame(tableId);
    const startedGameState = await gameManager.startGame(gameState.id);
    
    const firstPlayerId = startedGameState.currentPlayerId;
    expect(firstPlayerId).toBeTruthy();

    // Check initial pot and current bet
    expect(startedGameState.pot).toBe(15); // 5 + 10 blinds
    expect(startedGameState.currentBet).toBe(10); // big blind
    expect(startedGameState.phase).toBe('preflop');
    
    // Current player should be able to call
    const callState = await gameManager.call(gameState.id, firstPlayerId!);
    expect(callState.pot).toBe(20); // 15 initial + 5 call (to match big blind)
    
    // In a 2-player game, when both players have equal bets, 
    // the betting round completes and flop should be dealt
    expect(callState.phase).toBe('flop');
    expect(callState.communityCards).toHaveLength(3);
    
    // The current bet should reset for new betting round
    expect(callState.currentBet).toBe(0);
  });

  it('should ensure all dealt cards are unique', async () => {
    // Create and start game
    const gameState = await gameManager.createGame(tableId);
    const startedGameState = await gameManager.startGame(gameState.id);
    
    // Complete preflop betting
    let currentPlayerId = startedGameState.currentPlayerId;
    let currentState = await gameManager.call(gameState.id, currentPlayerId!);
    
    // Complete flop betting
    currentPlayerId = currentState.currentPlayerId;
    currentState = await gameManager.check(gameState.id, currentPlayerId!);
    currentPlayerId = currentState.currentPlayerId;
    currentState = await gameManager.check(gameState.id, currentPlayerId!);
    
    // Complete turn betting  
    currentPlayerId = currentState.currentPlayerId;
    currentState = await gameManager.check(gameState.id, currentPlayerId!);
    currentPlayerId = currentState.currentPlayerId;
    currentState = await gameManager.check(gameState.id, currentPlayerId!);
    
    // Collect all dealt cards (now we should have all 5 community cards)
    const allCards = [
      ...currentState.players[0].cards,
      ...currentState.players[1].cards,
      ...currentState.communityCards
    ];
    
    // All cards should be unique
    const cardStrings = allCards.map(card => `${card.rank}-${card.suit}`);
    const uniqueCards = new Set(cardStrings);
    expect(uniqueCards.size).toBe(allCards.length);
    expect(allCards).toHaveLength(9); // 2 + 2 + 5
  });
}); 