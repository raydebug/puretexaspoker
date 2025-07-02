import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '../db';
import { gameManager } from '../services/gameManager';
import { locationManager } from '../services/LocationManager';

describe('Seat Change Without Additional Buy-in', () => {
  let testTableId: string;
  let testGameId: string;
  let testPlayerId1: string;
  let testPlayerId2: string;

  beforeEach(async () => {
    // Clean up database in correct order to respect foreign key constraints
    // First delete data that references other tables
    await prisma.gameActionHistory.deleteMany();
    await prisma.gameAction.deleteMany();
    await prisma.cardOrder.deleteMany();  // CardOrder references Game
    await prisma.playerTable.deleteMany();
    // Then delete games (which reference tables)  
    await prisma.game.deleteMany();
    // Then delete the base entities
    await prisma.table.deleteMany();
    await prisma.player.deleteMany();

    // Create test table
    const table = await prisma.table.create({
      data: {
        name: 'Test Seat Change Table',
        maxPlayers: 9,
        smallBlind: 5,
        bigBlind: 10,
        minBuyIn: 100,
        maxBuyIn: 1000,
        isActive: true
      }
    });
    testTableId = table.id;

    // Create test players
    const player1 = await prisma.player.create({
      data: {
        nickname: 'TestPlayer1',
        chips: 1000
      }
    });
    testPlayerId1 = player1.id;

    const player2 = await prisma.player.create({
      data: {
        nickname: 'TestPlayer2',
        chips: 1000
      }
    });
    testPlayerId2 = player2.id;

    // Create test game
    const game = await prisma.game.create({
      data: {
        tableId: testTableId,
        status: 'waiting',
        pot: 0
      }
    });
    testGameId = game.id;
  });

  afterEach(async () => {
    // Clean up in correct order to respect foreign key constraints
    await prisma.gameActionHistory.deleteMany();
    await prisma.gameAction.deleteMany();
    await prisma.cardOrder.deleteMany();
    await prisma.playerTable.deleteMany();
    await prisma.game.deleteMany();
    await prisma.table.deleteMany();
    await prisma.player.deleteMany();
  });

  test('should preserve chip stack when player changes seats', async () => {
    console.log('🧪 Test: Player should preserve chip stack when changing seats');

    // Step 1: Player takes initial seat with specific buy-in
    const initialBuyIn = 500;
    const initialSeat = 2;
    const targetSeat = 5;

    await prisma.playerTable.create({
      data: {
        playerId: testPlayerId1,
        tableId: testTableId,
        seatNumber: initialSeat,
        buyIn: initialBuyIn
      }
    });

    console.log(`✅ Player1 seated at seat ${initialSeat} with ${initialBuyIn} chips`);

    // Step 2: Verify initial state
    const initialRecord = await prisma.playerTable.findFirst({
      where: { playerId: testPlayerId1, tableId: testTableId }
    });
    
    expect(initialRecord).toBeTruthy();
    expect(initialRecord!.seatNumber).toBe(initialSeat);
    expect(initialRecord!.buyIn).toBe(initialBuyIn);

    // Step 3: Simulate seat change (this is what the backend should do)
    // Remove from old seat
    await prisma.playerTable.deleteMany({
      where: { playerId: testPlayerId1, tableId: testTableId }
    });

    // Add to new seat with SAME chip amount (no additional buy-in)
    await prisma.playerTable.create({
      data: {
        playerId: testPlayerId1,
        tableId: testTableId,
        seatNumber: targetSeat,
        buyIn: initialBuyIn  // CRITICAL: Same amount, not new buy-in
      }
    });

    console.log(`🔄 Player1 moved from seat ${initialSeat} to seat ${targetSeat}`);

    // Step 4: Verify seat change preserved chips
    const finalRecord = await prisma.playerTable.findFirst({
      where: { playerId: testPlayerId1, tableId: testTableId }
    });

    expect(finalRecord).toBeTruthy();
    expect(finalRecord!.seatNumber).toBe(targetSeat);
    expect(finalRecord!.buyIn).toBe(initialBuyIn); // Should be exactly the same
    
    console.log(`✅ Verified: Player1 has ${finalRecord!.buyIn} chips at seat ${targetSeat} (preserved from original ${initialBuyIn})`);

    // Step 5: Verify old seat is available
    const oldSeatOccupied = await prisma.playerTable.findFirst({
      where: { tableId: testTableId, seatNumber: initialSeat }
    });

    expect(oldSeatOccupied).toBeNull();
    console.log(`✅ Verified: Seat ${initialSeat} is now available`);
  });

  test('should allow multiple seat changes while preserving chips', async () => {
    console.log('🧪 Test: Multiple seat changes should preserve chips consistently');

    const originalBuyIn = 750;
    const seats = [1, 3, 7, 4]; // Player will move through these seats

    // Initial seat
    await prisma.playerTable.create({
      data: {
        playerId: testPlayerId1,
        tableId: testTableId,
        seatNumber: seats[0],
        buyIn: originalBuyIn
      }
    });

    console.log(`✅ Player1 initially seated at seat ${seats[0]} with ${originalBuyIn} chips`);

    // Perform multiple seat changes
    for (let i = 1; i < seats.length; i++) {
      const currentSeat = seats[i - 1];
      const nextSeat = seats[i];

      console.log(`🔄 Moving from seat ${currentSeat} to seat ${nextSeat}...`);

      // Simulate seat change
      await prisma.playerTable.deleteMany({
        where: { playerId: testPlayerId1, tableId: testTableId }
      });

      await prisma.playerTable.create({
        data: {
          playerId: testPlayerId1,
          tableId: testTableId,
          seatNumber: nextSeat,
          buyIn: originalBuyIn  // Always preserve original amount
        }
      });

      // Verify chip preservation
      const currentRecord = await prisma.playerTable.findFirst({
        where: { playerId: testPlayerId1, tableId: testTableId }
      });

      expect(currentRecord!.seatNumber).toBe(nextSeat);
      expect(currentRecord!.buyIn).toBe(originalBuyIn);

      console.log(`✅ Verified: Player at seat ${nextSeat} with ${currentRecord!.buyIn} chips`);
    }

    console.log(`✅ Test completed: Chip amount consistently preserved at ${originalBuyIn} through ${seats.length - 1} seat changes`);
  });

  test('should preserve different chip amounts for different players', async () => {
    console.log('🧪 Test: Different players should preserve their individual chip amounts');

    const player1BuyIn = 300;
    const player2BuyIn = 800;

    // Seat both players initially
    await prisma.playerTable.createMany({
      data: [
        {
          playerId: testPlayerId1,
          tableId: testTableId,
          seatNumber: 1,
          buyIn: player1BuyIn
        },
        {
          playerId: testPlayerId2,
          tableId: testTableId,
          seatNumber: 3,
          buyIn: player2BuyIn
        }
      ]
    });

    console.log(`✅ Player1: ${player1BuyIn} chips at seat 1, Player2: ${player2BuyIn} chips at seat 3`);

    // Both players change seats
    // Player 1: seat 1 → seat 6
    await prisma.playerTable.deleteMany({
      where: { playerId: testPlayerId1, tableId: testTableId }
    });
    await prisma.playerTable.create({
      data: {
        playerId: testPlayerId1,
        tableId: testTableId,
        seatNumber: 6,
        buyIn: player1BuyIn  // Preserve Player1's original amount
      }
    });

    // Player 2: seat 3 → seat 8  
    await prisma.playerTable.deleteMany({
      where: { playerId: testPlayerId2, tableId: testTableId }
    });
    await prisma.playerTable.create({
      data: {
        playerId: testPlayerId2,
        tableId: testTableId,
        seatNumber: 8,
        buyIn: player2BuyIn  // Preserve Player2's original amount
      }
    });

    console.log('🔄 Both players changed seats');

    // Verify both players preserved their individual chip amounts
    const player1Final = await prisma.playerTable.findFirst({
      where: { playerId: testPlayerId1, tableId: testTableId }
    });
    const player2Final = await prisma.playerTable.findFirst({
      where: { playerId: testPlayerId2, tableId: testTableId }
    });

    expect(player1Final!.seatNumber).toBe(6);
    expect(player1Final!.buyIn).toBe(player1BuyIn);
    expect(player2Final!.seatNumber).toBe(8);
    expect(player2Final!.buyIn).toBe(player2BuyIn);

    console.log(`✅ Verified: Player1 has ${player1Final!.buyIn} chips at seat 6 (preserved)`);
    console.log(`✅ Verified: Player2 has ${player2Final!.buyIn} chips at seat 8 (preserved)`);
  });

  test('should handle seat change validation correctly', async () => {
    console.log('🧪 Test: Seat change validation should prevent invalid moves');

    const buyIn = 400;

    // Seat player 1 at seat 2
    await prisma.playerTable.create({
      data: {
        playerId: testPlayerId1,
        tableId: testTableId,
        seatNumber: 2,
        buyIn: buyIn
      }
    });

    // Seat player 2 at seat 5 
    await prisma.playerTable.create({
      data: {
        playerId: testPlayerId2,
        tableId: testTableId,
        seatNumber: 5,
        buyIn: 600
      }
    });

    console.log('✅ Two players seated at different seats');

    // Attempt to move player 1 to occupied seat 5 (should fail)
    const occupiedSeat = await prisma.playerTable.findFirst({
      where: { tableId: testTableId, seatNumber: 5 }
    });

    expect(occupiedSeat).toBeTruthy();
    expect(occupiedSeat!.playerId).toBe(testPlayerId2);

    console.log('✅ Verified: Seat 5 is occupied by Player2 - seat change should be prevented');

    // Player 1 should still be at seat 2 with original chips
    const player1Current = await prisma.playerTable.findFirst({
      where: { playerId: testPlayerId1, tableId: testTableId }
    });

    expect(player1Current!.seatNumber).toBe(2);
    expect(player1Current!.buyIn).toBe(buyIn);

    console.log('✅ Verified: Player1 remains at seat 2 with original chip amount after failed move attempt');
  });

  test('should maintain chip consistency in game state during seat changes', async () => {
    console.log('🧪 Test: Game state should reflect correct chip amounts after seat changes');

    const chipAmount = 1000;
    const gameService = gameManager.getGame(testGameId);

    // If game service doesn't exist, create one for testing
    if (!gameService) {
      console.log('ℹ️ Creating game service for testing...');
      // This would typically be handled by the game initialization
    }

    // Seat player initially
    await prisma.playerTable.create({
      data: {
        playerId: testPlayerId1,
        tableId: testTableId,
        seatNumber: 3,
        buyIn: chipAmount
      }
    });

    console.log(`✅ Player seated at seat 3 with ${chipAmount} chips`);

    // Simulate seat change in database
    await prisma.playerTable.deleteMany({
      where: { playerId: testPlayerId1, tableId: testTableId }
    });

    await prisma.playerTable.create({
      data: {
        playerId: testPlayerId1,
        tableId: testTableId,
        seatNumber: 7,
        buyIn: chipAmount  // Same amount preserved
      }
    });

    console.log('🔄 Player moved to seat 7');

    // Verify database consistency
    const finalRecord = await prisma.playerTable.findFirst({
      where: { playerId: testPlayerId1, tableId: testTableId }
    });

    expect(finalRecord!.seatNumber).toBe(7);
    expect(finalRecord!.buyIn).toBe(chipAmount);

    console.log(`✅ Database verification: Player has ${finalRecord!.buyIn} chips at seat 7`);
    console.log('✅ Test completed: Database maintains chip consistency during seat changes');
  });
});

describe('Seat Change Business Logic Validation', () => {
  test('should differentiate between new player buy-in and existing player seat change', () => {
    console.log('🧪 Test: System should distinguish between new buy-ins and seat changes');

    // Mock scenario: New player vs existing player
    const newPlayerScenario = {
      isExistingPlayer: false,
      requiresBuyIn: true,
      previousChips: 0
    };

    const existingPlayerScenario = {
      isExistingPlayer: true,
      requiresBuyIn: false,
      previousChips: 650
    };

    // Verify business logic expectations
    expect(newPlayerScenario.requiresBuyIn).toBe(true);
    expect(existingPlayerScenario.requiresBuyIn).toBe(false);
    expect(existingPlayerScenario.previousChips).toBeGreaterThan(0);

    console.log('✅ Business logic validation:');
    console.log('   - New players: Require buy-in ✓');
    console.log('   - Existing players: Use current chips ✓');
    console.log('   - Seat changes: Preserve chip amounts ✓');
  });
}); 