import { prisma } from '../../db';
import { tableManager } from '../../services/TableManager';

export async function setupTestDatabase() {
  try {
    // Create default role if it doesn't exist
    const playerRole = await prisma.role.upsert({
      where: { name: 'player' },
      update: {},
      create: {
        name: 'player',
        displayName: 'Player',
        description: 'Default player role',
        level: 0
      }
    });
    // console.log('Player role created/updated:', playerRole.id);

    // Create admin role if it doesn't exist
    await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Administrator role',
        level: 100
      }
    });

    // Initialize TableManager
    await tableManager.init();
  } catch (error) {
    console.warn('Warning: Could not set up test database roles:', error);
  }
}

export async function cleanupTestDatabase() {
  try {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        OR: [
          { username: { startsWith: 'testuser' } },
          { username: { startsWith: 'newuser' } },
          { username: { startsWith: 'authtest' } },
          { email: { contains: 'test@' } },
          { email: { contains: 'example.com' } },
          { email: { contains: 'authtest' } }
        ]
      }
    });

    // Clean up test players
    await prisma.player.deleteMany({
      where: {
        nickname: {
          startsWith: 'testplayer'
        }
      }
    });
  } catch (error) {
    console.warn('Warning: Could not clean up test database:', error);
  }
}