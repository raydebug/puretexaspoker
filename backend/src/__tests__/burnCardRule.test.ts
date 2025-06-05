import { gameManager } from '../services/gameManager';
import { prisma } from '../db';

describe('Burn Card Rule Integration', () => {
  let tableId: string;
  let playerId1: string;
  let playerId2: string;

  beforeEach(async () => {
    await prisma.gameAction.deleteMany();
    await prisma.game.deleteMany();
    await prisma.playerTable.deleteMany();
    await prisma.player.deleteMany();
    await prisma.table.deleteMany();

    const player1 = await prisma.player.create({
      data: { nickname: 'BurnTest1', chips: 1000 }
    });
    const player2 = await prisma.player.create({
      data: { nickname: 'BurnTest2', chips: 1000 }
    });
    playerId1 = player1.id;
    playerId2 = player2.id;

    const table = await prisma.table.create({
      data: {
        name: 'Burn Test Table',
        maxPlayers: 6,
        smallBlind: 5,
        bigBlind: 10,
        minBuyIn: 100,
        maxBuyIn: 1000
      }
    });
    tableId = table.id;

    await prisma.playerTable.createMany({
      data: [
        { playerId: playerId1, tableId, seatNumber: 1, buyIn: 500 },
        { playerId: playerId2, tableId, seatNumber: 2, buyIn: 500 }
      ]
    });
  });

  afterEach(async () => {
    await prisma.gameAction.deleteMany();
    await prisma.game.deleteMany();
    await prisma.playerTable.deleteMany();
    await prisma.player.deleteMany();
    await prisma.table.deleteMany();
  });

  it('should burn a card before each community card round', async () => {
    const gameState = await gameManager.createGame(tableId);
    let state = await gameManager.startGame(gameState.id);

    // Preflop -> Flop
    let currentPlayerId = state.currentPlayerId!;
    state = await gameManager.call(gameState.id, currentPlayerId);
    expect(state.phase).toBe('flop');
    expect(state.communityCards).toHaveLength(3);
    expect(state.burnedCards).toHaveLength(1);

    // Flop -> Turn
    currentPlayerId = state.currentPlayerId!;
    state = await gameManager.check(gameState.id, currentPlayerId);
    currentPlayerId = state.currentPlayerId!;
    state = await gameManager.check(gameState.id, currentPlayerId);
    expect(state.phase).toBe('turn');
    expect(state.communityCards).toHaveLength(4);
    expect(state.burnedCards).toHaveLength(2);

    // Turn -> River
    currentPlayerId = state.currentPlayerId!;
    state = await gameManager.check(gameState.id, currentPlayerId);
    currentPlayerId = state.currentPlayerId!;
    state = await gameManager.check(gameState.id, currentPlayerId);
    expect(state.phase).toBe('river');
    expect(state.communityCards).toHaveLength(5);
    expect(state.burnedCards).toHaveLength(3);
  });
});
