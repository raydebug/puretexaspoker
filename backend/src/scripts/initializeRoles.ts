import { prisma } from '../db';

async function initializeRoles() {
  console.log('🔐 Initializing default roles and permissions...');

  try {
    // Create default roles
    const playerRole = await prisma.role.upsert({
      where: { name: 'player' },
      update: {},
      create: {
        name: 'player',
        displayName: 'Player',
        description: 'Regular poker player',
        level: 0
      }
    });

    const moderatorRole = await prisma.role.upsert({
      where: { name: 'moderator' },
      update: {},
      create: {
        name: 'moderator',
        displayName: 'Moderator',
        description: 'Trusted user with moderation powers',
        level: 50
      }
    });

    const adminRole = await prisma.role.upsert({
      where: { name: 'administrator' },
      update: {},
      create: {
        name: 'administrator',
        displayName: 'Administrator',
        description: 'Full administrative access',
        level: 100
      }
    });

    // Create permissions
    const permissions = [
      { name: 'join_game', displayName: 'Join Game', description: 'Join poker games', category: 'game' },
      { name: 'place_bet', displayName: 'Place Bet', description: 'Make betting actions', category: 'game' },
      { name: 'chat_message', displayName: 'Chat Message', description: 'Send chat messages', category: 'game' },
      { name: 'warn_player', displayName: 'Warn Player', description: 'Issue warnings', category: 'moderation' },
      { name: 'kick_player', displayName: 'Kick Player', description: 'Kick players', category: 'moderation' },
      { name: 'ban_user', displayName: 'Ban User', description: 'Ban users', category: 'administration' }
    ];

    for (const permData of permissions) {
      await prisma.permission.upsert({
        where: { name: permData.name },
        update: {},
        create: permData
      });
    }

    // Assign permissions to roles
    const rolePermissions = [
      { roleName: 'player', permissions: ['join_game', 'place_bet', 'chat_message'] },
      { roleName: 'moderator', permissions: ['join_game', 'place_bet', 'chat_message', 'warn_player', 'kick_player'] },
      { roleName: 'administrator', permissions: ['join_game', 'place_bet', 'chat_message', 'warn_player', 'kick_player', 'ban_user'] }
    ];

    for (const rolePermData of rolePermissions) {
      const role = await prisma.role.findUnique({ where: { name: rolePermData.roleName } });
      if (!role) continue;

      for (const permName of rolePermData.permissions) {
        const permission = await prisma.permission.findUnique({ where: { name: permName } });
        if (!permission) continue;

        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id }
        });
      }
    }

    console.log('✅ Successfully initialized default roles and permissions');
    console.log(`   📌 Player Role: ${playerRole.id}`);
    console.log(`   📌 Moderator Role: ${moderatorRole.id}`);
    console.log(`   📌 Administrator Role: ${adminRole.id}`);

  } catch (error) {
    console.error('❌ Error initializing roles:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  initializeRoles()
    .then(() => {
      console.log('🎉 Role initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Role initialization failed:', error);
      process.exit(1);
    });
}

export { initializeRoles }; 