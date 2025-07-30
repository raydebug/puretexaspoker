import { prisma } from '../../db';
import { tableManager } from '../../services/TableManager';

export async function setupTestDatabase() {
  try {
    // Create default role if it doesn't exist
    const existingRole = await prisma.role.findUnique({
      where: { name: 'player' }
    });

    if (!existingRole) {
      await prisma.role.create({
        data: {
          name: 'player',
          displayName: 'Player',
          description: 'Default player role',
          level: 0
        }
      });
    }

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
          { email: { contains: 'test@' } }
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