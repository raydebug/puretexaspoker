import { prisma } from '../db';
import { tableManager } from './TableManager';
import { memoryCache } from './MemoryCache';

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

export const cleanupTestData = async () => {
  console.log('🧹 Starting comprehensive test data cleanup...');
  
  // First clear the database
  await clearDatabase();
  
  // Then clear all in-memory state
  console.log('🧹 Clearing in-memory state...');
  
  // Clear TableManager cache
  if (tableManager) {
    console.log('🗑️ Clearing TableManager cache...');
    // Only clear in-memory state, do NOT call init() here
    tableManager["tables"].clear();
    tableManager["tablePlayers"].clear();
    tableManager["tableGameStates"].clear();
    // No tableManager.init() here!
    const tables = tableManager.getAllTables();
    console.log(`🗑️ TableManager now has ${tables.length} tables after cleanup`);
    if (tables.length !== 0) {
      console.warn(`⚠️ WARNING: TableManager has ${tables.length} tables after clear (should be 0)`);
    }
  }
  
  // Clear MemoryCache
  if (memoryCache) {
    console.log('🗑️ Clearing MemoryCache...');
    memoryCache.clearCache();
  }
  
  // Clear any global socket state
  const io = (global as any).socketIO;
  if (io) {
    console.log('🗑️ Clearing WebSocket rooms...');
    // Disconnect all clients to clear room state
    io.sockets.disconnectSockets();
  }
  
  console.log('✅ Test data cleanup completed successfully!');
}; 