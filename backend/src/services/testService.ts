import { prisma } from '../db';

export const clearDatabase = async () => {
  console.log('🧹 Starting comprehensive database cleanup...');
  try {
    // Delete all records in strict dependency order
    console.log('🗑️ Deleting game action history...');
    await prisma.gameActionHistory.deleteMany();
    console.log('🗑️ Deleting game actions...');
    await prisma.gameAction.deleteMany();
    console.log('🗑️ Deleting player sessions...');
    await prisma.playerSession.deleteMany();
    console.log('🗑️ Deleting game sessions...');
    await prisma.gameSession.deleteMany();
    console.log('🗑️ Deleting card orders...');
    await prisma.cardOrder.deleteMany();
    console.log('🗑️ Deleting player-table associations...');
    await prisma.playerTable.deleteMany();
    console.log('🗑️ Deleting messages...');
    await prisma.message.deleteMany();
    console.log('🗑️ Deleting games...');
    await prisma.game.deleteMany();
    console.log('🗑️ Deleting players...');
    await prisma.player.deleteMany();
    console.log('🗑️ Deleting tables...');
    await prisma.table.deleteMany();
    console.log('🗑️ Deleting users...');
    await prisma.user.deleteMany();
    console.log('✅ Database cleanup completed successfully!');
  } catch (err) {
    console.error('❌ Error during database cleanup:', err);
    throw err;
  }
};

export const cleanupTestData = clearDatabase; 