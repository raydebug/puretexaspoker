import { prisma } from '../db';

/**
 * Comprehensive database cleanup for tests
 * Handles foreign key relationships in correct order
 */
export async function cleanupDatabase(): Promise<void> {
  try {
    // Order matters! Delete dependent records first
    
    // 1. Role management related tables
    await prisma.moderationAction.deleteMany();
    await prisma.rolePermission.deleteMany();
    
    // 2. Game and table related tables
    await prisma.tableAction.deleteMany();
    await prisma.message.deleteMany();
    await prisma.playerTable.deleteMany();
    
    // 4. User related tables (users have relationships)
    await prisma.player.deleteMany();
    await prisma.user.deleteMany();
    
    // 5. Table and structural tables
    await prisma.table.deleteMany();
    
    // 6. Role system tables (least dependent)
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();
    
    console.log('✅ Database cleanup completed successfully');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  }
}

/**
 * Initialize test database with minimal required data
 */
export async function initializeTestDatabase(): Promise<void> {
  try {
    // Create default roles if they don't exist
    const existingRoles = await prisma.role.findMany();
    
    if (existingRoles.length === 0) {
      await prisma.role.createMany({
        data: [
          {
            name: 'player',
            displayName: 'Player',
            level: 0,
            description: 'Regular player'
          },
          {
            name: 'moderator', 
            displayName: 'Moderator',
            level: 50,
            description: 'Moderator with limited admin privileges'
          },
          {
            name: 'administrator',
            displayName: 'Administrator', 
            level: 100,
            description: 'Full administrator access'
          }
        ]
      });
    }
    
    console.log('✅ Test database initialized successfully');
  } catch (error) {
    console.error('❌ Test database initialization failed:', error);
    throw error;
  }
}

/**
 * Create test user with specified role
 */
export async function createTestUser(username: string, roleName: string = 'player') {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }
  
  return await prisma.user.create({
    data: {
      username,
      email: `${username}@test.com`,
      password: 'hashedpassword',
      displayName: username,
      roleId: role.id
    }
  });
}

/**
 * Create test table
 */
export async function createTestTable(name: string = 'Test Table') {
  return await prisma.table.create({
    data: {
      name,
      maxPlayers: 6,
      smallBlind: 5,
      bigBlind: 10,
      minBuyIn: 100,
      maxBuyIn: 1000
    }
  });
}

/**
 * Create test player
 */
export async function createTestPlayer(nickname: string, chips: number = 1000) {
  return await prisma.player.create({
    data: {
      id: nickname,
      nickname,
      chips
    }
  });
} 