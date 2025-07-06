import { prisma } from '../db';

export const clearDatabase = async () => {
  console.log('🧹 Starting comprehensive database cleanup...');
  try {
    // Delete all records in strict dependency order
    console.log('🗑️ Deleting table actions...');
    await prisma.tableAction.deleteMany();
    console.log('🗑️ Deleting messages...');
    await prisma.message.deleteMany();
    console.log('🗑️ Deleting player-table associations...');
    await prisma.playerTable.deleteMany();
    console.log('🗑️ Deleting moderation actions...');
    await prisma.moderationAction.deleteMany();
    console.log('🗑️ Deleting role permissions...');
    await prisma.rolePermission.deleteMany();
    console.log('🗑️ Deleting players...');
    await prisma.player.deleteMany();
    console.log('🗑️ Deleting users...');
    await prisma.user.deleteMany();
    console.log('🗑️ Deleting tables...');
    await prisma.table.deleteMany();
    console.log('🗑️ Deleting roles...');
    await prisma.role.deleteMany();
    console.log('🗑️ Deleting permissions...');
    await prisma.permission.deleteMany();
    console.log('✅ Database cleanup completed successfully!');
  } catch (err) {
    console.error('❌ Error during database cleanup:', err);
    throw err;
  }
};

export const cleanupTestData = clearDatabase; 