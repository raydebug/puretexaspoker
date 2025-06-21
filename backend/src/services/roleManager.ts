import { prisma } from '../db';
import { Role, Permission, User, ModerationAction } from '@prisma/client';

export interface RoleInfo {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  permissions: string[];
}

export interface UserRoleInfo {
  userId: string;
  username: string;
  role: RoleInfo;
  isActive: boolean;
  isBanned: boolean;
  banInfo?: {
    bannedBy: string;
    bannedAt: Date;
    reason?: string;
  };
}

export interface ModerationActionData {
  type: 'warn' | 'kick' | 'mute' | 'ban' | 'unban';
  targetUserId: string;
  moderatorId: string;
  reason?: string;
  duration?: number; // Duration in minutes for temporary actions
  tableId?: string;
}

export class RoleManager {
  private static instance: RoleManager;

  public static getInstance(): RoleManager {
    if (!RoleManager.instance) {
      RoleManager.instance = new RoleManager();
    }
    return RoleManager.instance;
  }

  // Initialize default roles and permissions
  public async initializeDefaultRoles(): Promise<void> {
    console.log('🔐 ROLE SYSTEM: Initializing default roles and permissions...');

    const permissions = await this.createDefaultPermissions();
    const roles = await this.createDefaultRoles();
    await this.assignPermissionsToRoles(roles, permissions);
    
    console.log('✅ ROLE SYSTEM: Default roles and permissions initialized');
  }

  // Check if user has specific permission
  public async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true }
              }
            }
          }
        }
      });

      if (!user || !user.isActive || user.isBanned) {
        return false;
      }

      const userPermissions = user.role.permissions.map((rp: any) => rp.permission.name);
      return userPermissions.includes(permissionName);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  private async createDefaultPermissions(): Promise<Permission[]> {
    const defaultPermissions = [
      { name: 'join_game', displayName: 'Join Game', description: 'Join poker games', category: 'game' },
      { name: 'place_bet', displayName: 'Place Bet', description: 'Make betting actions', category: 'game' },
      { name: 'chat_message', displayName: 'Chat Message', description: 'Send chat messages', category: 'game' },
      { name: 'warn_player', displayName: 'Warn Player', description: 'Issue warnings', category: 'moderation' },
      { name: 'kick_player', displayName: 'Kick Player', description: 'Kick players', category: 'moderation' },
      { name: 'ban_user', displayName: 'Ban User', description: 'Ban users', category: 'administration' }
    ];

    const permissions: Permission[] = [];
    
    for (const permData of defaultPermissions) {
      const existing = await prisma.permission.findUnique({ where: { name: permData.name } });
      
      if (!existing) {
        const permission = await prisma.permission.create({ data: permData });
        permissions.push(permission);
        console.log(`   ✅ Created permission: ${permData.displayName}`);
      } else {
        permissions.push(existing);
      }
    }
    
    return permissions;
  }

  private async createDefaultRoles(): Promise<Role[]> {
    const defaultRoles = [
      { name: 'player', displayName: 'Player', description: 'Regular poker player', level: 0 },
      { name: 'moderator', displayName: 'Moderator', description: 'Trusted user with moderation powers', level: 50 },
      { name: 'administrator', displayName: 'Administrator', description: 'Full administrative access', level: 100 }
    ];

    const roles: Role[] = [];
    
    for (const roleData of defaultRoles) {
      const existing = await prisma.role.findUnique({ where: { name: roleData.name } });
      
      if (!existing) {
        const role = await prisma.role.create({ data: roleData });
        roles.push(role);
        console.log(`   ✅ Created role: ${roleData.displayName}`);
      } else {
        roles.push(existing);
      }
    }
    
    return roles;
  }

  private async assignPermissionsToRoles(roles: Role[], permissions: Permission[]): Promise<void> {
    const rolePermissionMap = {
      'player': ['join_game', 'place_bet', 'chat_message'],
      'moderator': ['join_game', 'place_bet', 'chat_message', 'warn_player', 'kick_player'],
      'administrator': ['join_game', 'place_bet', 'chat_message', 'warn_player', 'kick_player', 'ban_user']
    };

    for (const role of roles) {
      const permissionNames = rolePermissionMap[role.name as keyof typeof rolePermissionMap] || [];
      
      for (const permName of permissionNames) {
        const permission = permissions.find(p => p.name === permName);
        if (permission) {
          const existing = await prisma.rolePermission.findUnique({
            where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }
          });
          
          if (!existing) {
            await prisma.rolePermission.create({
              data: { roleId: role.id, permissionId: permission.id }
            });
          }
        }
      }
    }
  }

  // Get user role information
  public async getUserRoleInfo(userId: string): Promise<UserRoleInfo | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true }
              }
            }
          }
        }
      });

      if (!user) {
        return null;
      }

      const roleInfo: RoleInfo = {
        id: user.role.id,
        name: user.role.name,
        displayName: user.role.displayName,
        description: user.role.description || undefined,
        level: user.role.level,
        permissions: user.role.permissions.map((rp: any) => rp.permission.name)
      };

      const userRoleInfo: UserRoleInfo = {
        userId: user.id,
        username: user.username,
        role: roleInfo,
        isActive: user.isActive,
        isBanned: user.isBanned
      };

      if (user.isBanned && user.bannedBy && user.bannedAt) {
        userRoleInfo.banInfo = {
          bannedBy: user.bannedBy,
          bannedAt: user.bannedAt,
          reason: user.banReason || undefined
        };
      }

      return userRoleInfo;
    } catch (error) {
      console.error('Error getting user role info:', error);
      return null;
    }
  }

  // Assign role to user
  public async assignRole(userId: string, roleName: string, assignedBy: string): Promise<boolean> {
    try {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }

      await prisma.user.update({
        where: { id: userId },
        data: { roleId: role.id }
      });

      console.log(`🔐 ROLE SYSTEM: User ${userId} assigned role ${roleName} by ${assignedBy}`);
      return true;
    } catch (error) {
      console.error('Error assigning role:', error);
      return false;
    }
  }

  // Execute moderation action
  public async executeModeration(actionData: ModerationActionData): Promise<ModerationAction | null> {
    try {
      const permissionMap = {
        'warn': 'warn_player',
        'kick': 'kick_player',
        'mute': 'kick_player',
        'ban': 'ban_user',
        'unban': 'ban_user'
      };

      const requiredPermission = permissionMap[actionData.type];
      const hasPermission = await this.hasPermission(actionData.moderatorId, requiredPermission);
      
      if (!hasPermission) {
        throw new Error(`Insufficient permissions for ${actionData.type} action`);
      }

      let expiresAt: Date | undefined;
      if (actionData.duration && actionData.duration > 0) {
        expiresAt = new Date(Date.now() + actionData.duration * 60 * 1000);
      }

      const moderationAction = await prisma.moderationAction.create({
        data: {
          type: actionData.type,
          reason: actionData.reason,
          duration: actionData.duration,
          moderatorId: actionData.moderatorId,
          targetUserId: actionData.targetUserId,
          tableId: actionData.tableId,
          expiresAt
        }
      });

      await this.applyModerationAction(actionData);

      console.log(`⚖️ MODERATION: ${actionData.type} action executed by ${actionData.moderatorId} against ${actionData.targetUserId}`);
      return moderationAction;
    } catch (error) {
      console.error('Error executing moderation action:', error);
      return null;
    }
  }

  // Apply moderation action effects
  private async applyModerationAction(actionData: ModerationActionData): Promise<void> {
    switch (actionData.type) {
      case 'ban':
        await prisma.user.update({
          where: { id: actionData.targetUserId },
          data: {
            isBanned: true,
            bannedBy: actionData.moderatorId,
            bannedAt: new Date(),
            banReason: actionData.reason,
            isActive: false
          }
        });
        break;
        
      case 'unban':
        await prisma.user.update({
          where: { id: actionData.targetUserId },
          data: {
            isBanned: false,
            bannedBy: null,
            bannedAt: null,
            banReason: null,
            isActive: true
          }
        });
        break;
        
      case 'kick':
      case 'mute':
      case 'warn':
        // These actions are handled by the game/chat systems
        break;
    }
  }
}

export const roleManager = RoleManager.getInstance();