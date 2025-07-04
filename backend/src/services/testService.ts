import { prisma } from '../db';

export const clearDatabase = async () => {
  console.log('🧹 Starting comprehensive database cleanup...');
  
  try {
    // Delete all records in reverse order of dependencies
    console.log('🗑️ Deleting game actions...');
    await prisma.gameAction.deleteMany();
    
    console.log('🗑️ Deleting game action history...');
    await prisma.gameActionHistory.deleteMany();
    
    console.log('🗑️ Deleting messages...');
    await prisma.message.deleteMany();
    
    console.log('🗑️ Deleting games...');
    await prisma.game.deleteMany();
    
    console.log('🗑️ Deleting player table associations...');
    await prisma.playerTable.deleteMany();
    
    console.log('🗑️ Deleting user locations...');
    // Note: UserLocation model doesn't exist in current schema
    
    console.log('🗑️ Deleting tables...');
    await prisma.table.deleteMany();
    
    console.log('🗑️ Deleting players...');
    await prisma.player.deleteMany();
    
    console.log('🗑️ Deleting users...');
    await prisma.user.deleteMany();
    
    console.log('✅ Comprehensive database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  }
};

export const cleanupTestData = async () => {
  console.log('🧹 Cleaning up stale test data from previous runs...');
  
  try {
    // Delete stale player-table records
    const playerTableCount = await prisma.playerTable.deleteMany({
      where: {
        player: {
          nickname: {
            startsWith: 'Player'
          }
        }
      }
    });
    console.log(`🗑️ Deleted ${playerTableCount.count} stale player-table records`);
    
    // Delete stale test players
    const playerCount = await prisma.player.deleteMany({
      where: {
        nickname: {
          startsWith: 'Player'
        }
      }
    });
    console.log(`🗑️ Deleted ${playerCount.count} stale test players (this fixes observers count issue)`);
    
    // Delete stale game records
    const gameCount = await prisma.game.deleteMany({
      where: {
        id: {
          not: 'test-game-id'
        }
      }
    });
    console.log(`🗑️ Deleted ${gameCount.count} stale game records`);
    
    // Delete stale user locations
    // Note: UserLocation model doesn't exist in current schema
    console.log(`🗑️ Skipping user location cleanup (model not in schema)`);
    
    // Delete stale game actions
    const actionCount = await prisma.gameAction.deleteMany({
      where: {
        gameId: {
          not: 'test-game-id'
        }
      }
    });
    console.log(`🗑️ Deleted ${actionCount.count} stale game action records`);
    
    console.log('✅ Test data cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test data cleanup:', error);
    throw error;
  }
}; 