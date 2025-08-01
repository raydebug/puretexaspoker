import { PrismaClient } from '@prisma/client';

// Test database configuration for in-memory testing
const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file::memory:?cache=shared'
    }
  }
});

// Initialize test database
export async function initializeTestDatabase() {
  try {
    console.log('🧪 Initializing test database...');
    
    // Clean up existing test database
    await testPrisma.$executeRaw`PRAGMA foreign_keys = OFF`;
    await testPrisma.$executeRaw`DELETE FROM TableAction`;
    await testPrisma.$executeRaw`DELETE FROM Message`;
    await testPrisma.$executeRaw`DELETE FROM PlayerTable`;
    await testPrisma.$executeRaw`DELETE FROM Player`;
    await testPrisma.$executeRaw`DELETE FROM Table`;
    await testPrisma.$executeRaw`DELETE FROM User`;
    await testPrisma.$executeRaw`DELETE FROM ModerationAction`;
    await testPrisma.$executeRaw`DELETE FROM RolePermission`;
    await testPrisma.$executeRaw`DELETE FROM Permission`;
    await testPrisma.$executeRaw`DELETE FROM Role`;
    await testPrisma.$executeRaw`PRAGMA foreign_keys = ON`;
    
    console.log('✅ Test database initialized and cleaned');
    return testPrisma;
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  }
}

// Clean up test database
export async function cleanupTestDatabase() {
  try {
    console.log('🧹 Cleaning up test database...');
    await testPrisma.$disconnect();
    console.log('✅ Test database cleaned up');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
  }
}

// Create test tables
export async function createTestTables() {
  try {
    console.log('🎯 Creating test tables...');
    
    // Create default roles
    const playerRole = await testPrisma.role.upsert({
      where: { name: 'player' },
      update: {},
      create: {
        name: 'player',
        displayName: 'Player',
        description: 'Regular player',
        level: 0
      }
    });
    
    const adminRole = await testPrisma.role.upsert({
      where: { name: 'administrator' },
      update: {},
      create: {
        name: 'administrator',
        displayName: 'Administrator',
        description: 'System administrator',
        level: 100
      }
    });
    
    // Create test tables
    const tables = await Promise.all([
      testPrisma.table.create({
        data: {
          id: 1,
          name: 'Test Table 1',
          maxPlayers: 6,
          smallBlind: 1,
          bigBlind: 2,
          minBuyIn: 20,
          maxBuyIn: 200,
          status: 'waiting',
          phase: 'waiting'
        }
      }),
      testPrisma.table.create({
        data: {
          id: 2,
          name: 'Test Table 2',
          maxPlayers: 6,
          smallBlind: 5,
          bigBlind: 10,
          minBuyIn: 100,
          maxBuyIn: 1000,
          status: 'waiting',
          phase: 'waiting'
        }
      }),
      testPrisma.table.create({
        data: {
          id: 3,
          name: 'Test Table 3',
          maxPlayers: 8,
          smallBlind: 2,
          bigBlind: 4,
          minBuyIn: 40,
          maxBuyIn: 400,
          status: 'waiting',
          phase: 'waiting'
        }
      })
    ]);
    
    console.log(`✅ Created ${tables.length} test tables`);
    return tables;
  } catch (error) {
    console.error('❌ Failed to create test tables:', error);
    throw error;
  }
}

// Create test players
export async function createTestPlayers() {
  try {
    console.log('👥 Creating test players...');
    
    const players = await Promise.all([
      testPrisma.player.create({
        data: {
          id: 'Player1',
          nickname: 'Player1',
          chips: 100
        }
      }),
      testPrisma.player.create({
        data: {
          id: 'Player2',
          nickname: 'Player2',
          chips: 100
        }
      }),
      testPrisma.player.create({
        data: {
          id: 'Player3',
          nickname: 'Player3',
          chips: 100
        }
      }),
      testPrisma.player.create({
        data: {
          id: 'Player4',
          nickname: 'Player4',
          chips: 100
        }
      }),
      testPrisma.player.create({
        data: {
          id: 'Player5',
          nickname: 'Player5',
          chips: 100
        }
      })
    ]);
    
    console.log(`✅ Created ${players.length} test players`);
    return players;
  } catch (error) {
    console.error('❌ Failed to create test players:', error);
    throw error;
  }
}

export { testPrisma }; 