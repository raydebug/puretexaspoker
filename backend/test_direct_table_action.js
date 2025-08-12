#!/usr/bin/env node

/**
 * Direct database test to verify TableAction creation works with string IDs
 */

const { PrismaClient } = require('@prisma/client');

async function testDirectTableAction() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing direct TableAction creation...');
    
    // Create a test action with string ID
    const testAction = await prisma.tableAction.create({
      data: {
        id: `test-action-${Date.now()}`,
        tableId: 1,
        playerId: 'Player1',
        type: 'RAISE',
        amount: 6,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 1,
        gameStateBefore: '{"pot":1,"currentBet":2}',
        gameStateAfter: null
      }
    });
    
    console.log('✅ SUCCESS: TableAction created successfully!');
    console.log('📊 Created action:', {
      id: testAction.id,
      playerId: testAction.playerId,
      type: testAction.type,
      amount: testAction.amount,
      phase: testAction.phase
    });
    
    // Query all actions to see if it appears in the list
    const allActions = await prisma.tableAction.findMany({
      where: { tableId: 1 },
      orderBy: { timestamp: 'asc' }
    });
    
    console.log(`📋 Total actions in database: ${allActions.length}`);
    allActions.forEach((action, index) => {
      console.log(`   ${index + 1}. ${action.playerId} ${action.type} ${action.amount ? `$${action.amount}` : ''} in ${action.phase} phase`);
    });
    
    return true;
    
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDirectTableAction().then(success => {
  console.log(success ? '🎯 Direct TableAction creation WORKS!' : '⚠️ Direct TableAction creation FAILED');
  process.exit(success ? 0 : 1);
});