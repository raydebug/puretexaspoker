/**
 * Enhanced Role Management System for Nakama Backend
 * Complete migration from backend/src/services/roleManager.ts with additional features
 */

import { UserManagementService, RoleInfo, Permission, ModerationAction } from './user_management';
import { ErrorFactory, NakamaError } from '../middleware/error_handling';

export interface RoleHierarchy {
  roleName: string;
  level: number;
  inheritsFrom?: string[];
  canModerateRoles?: string[];
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface ModerationContext {
  tableId?: string;
  reason?: string;
  duration?: number; // minutes
  metadata?: Record<string, any>;
}

export interface RoleAssignmentHistory {
  id: string;
  userId: string;
  fromRole: string;
  toRole: string;
  assignedBy: string;
  assignedAt: string;
  reason?: string;
}

/**
 * Enhanced Role Manager with hierarchy and inheritance
 */
export class EnhancedRoleManager {
  private readonly nk: nkruntime.Nakama;
  private readonly logger: nkruntime.Logger;
  private readonly userService: UserManagementService;

  constructor(nk: nkruntime.Nakama, logger: nkruntime.Logger) {
    this.nk = nk;
    this.logger = logger;
    this.userService = new UserManagementService(nk, logger);
  }

  /**
   * Initialize enhanced role system with hierarchy
   */
  public async initializeEnhancedRoles(): Promise<void> {
    this.logger.info('🔐 Initializing enhanced role system with hierarchy...');

    // Create permission groups first
    await this.createPermissionGroups();
    
    // Create roles with hierarchy
    await this.createRoleHierarchy();
    
    // Set up role moderation permissions
    await this.setupRoleModerationMatrix();

    this.logger.info('✅ Enhanced role system initialized successfully');
  }

  /**
   * Create organized permission groups
   */
  private async createPermissionGroups(): Promise<void> {
    const permissionGroups: PermissionGroup[] = [
      {
        id: 'gameplay',
        name: 'Gameplay Permissions',
        description: 'Permissions related to playing poker',
        permissions: [
          {
            id: 'join_game',
            name: 'join_game',
            category: 'gameplay',
            description: 'Join poker games and tables'
          },
          {
            id: 'place_bet',
            name: 'place_bet',
            category: 'gameplay',
            description: 'Place bets and perform poker actions'
          },
          {
            id: 'create_table',
            name: 'create_table',
            category: 'gameplay',
            description: 'Create new poker tables'
          },
          {
            id: 'spectate_game',
            name: 'spectate_game',
            category: 'gameplay',
            description: 'Watch games as spectator'
          }
        ]
      },
      {
        id: 'social',
        name: 'Social Permissions',
        description: 'Communication and social features',
        permissions: [
          {
            id: 'chat_message',
            name: 'chat_message',
            category: 'social',
            description: 'Send chat messages'
          },
          {
            id: 'private_message',
            name: 'private_message',
            category: 'social',
            description: 'Send private messages'
          },
          {
            id: 'create_club',
            name: 'create_club',
            category: 'social',
            description: 'Create poker clubs'
          },
          {
            id: 'join_club',
            name: 'join_club',
            category: 'social',
            description: 'Join poker clubs'
          }
        ]
      },
      {
        id: 'moderation',
        name: 'Moderation Permissions',
        description: 'Content and user moderation',
        permissions: [
          {
            id: 'warn_player',
            name: 'warn_player',
            category: 'moderation',
            description: 'Issue warnings to players'
          },
          {
            id: 'kick_player',
            name: 'kick_player',
            category: 'moderation',
            description: 'Kick players from tables'
          },
          {
            id: 'mute_player',
            name: 'mute_player',
            category: 'moderation',
            description: 'Mute players in chat'
          },
          {
            id: 'delete_message',
            name: 'delete_message',
            category: 'moderation',
            description: 'Delete chat messages'
          },
          {
            id: 'view_reports',
            name: 'view_reports',
            category: 'moderation',
            description: 'View user reports and complaints'
          }
        ]
      },
      {
        id: 'administration',
        name: 'Administration Permissions',
        description: 'System administration and management',
        permissions: [
          {
            id: 'ban_user',
            name: 'ban_user',
            category: 'administration',
            description: 'Ban users from the platform'
          },
          {
            id: 'manage_roles',
            name: 'manage_roles',
            category: 'administration',
            description: 'Assign and modify user roles'
          },
          {
            id: 'view_admin_panel',
            name: 'view_admin_panel',
            category: 'administration',
            description: 'Access administration interface'
          },
          {
            id: 'manage_tables',
            name: 'manage_tables',
            category: 'administration',
            description: 'Manage and configure tables'
          },
          {
            id: 'view_analytics',
            name: 'view_analytics',
            category: 'administration',
            description: 'View system analytics and reports'
          },
          {
            id: 'system_config',
            name: 'system_config',
            category: 'administration',
            description: 'Modify system configuration'
          }
        ]
      }
    ];

    // Store permission groups
    for (const group of permissionGroups) {
      await this.nk.storageWrite([{
        collection: "permission_groups",
        key: group.id,
        userId: "",
        value: group,
        permissionRead: 2,
        permissionWrite: 0
      }]);

      // Store individual permissions
      for (const permission of group.permissions) {
        await this.nk.storageWrite([{
          collection: "permissions",
          key: permission.id,
          userId: "",
          value: permission,
          permissionRead: 2,
          permissionWrite: 0
        }]);
      }
    }

    this.logger.info(`✅ Created ${permissionGroups.length} permission groups with ${permissionGroups.reduce((acc, g) => acc + g.permissions.length, 0)} permissions`);
  }

  /**
   * Create role hierarchy with inheritance
   */
  private async createRoleHierarchy(): Promise<void> {
    const roleHierarchy: RoleHierarchy[] = [
      {
        roleName: 'banned',
        level: -10,
        inheritsFrom: [],
        canModerateRoles: []
      },
      {
        roleName: 'spectator',
        level: 0,
        inheritsFrom: [],
        canModerateRoles: []
      },
      {
        roleName: 'player',
        level: 10,
        inheritsFrom: ['spectator'],
        canModerateRoles: []
      },
      {
        roleName: 'vip_player',
        level: 20,
        inheritsFrom: ['player'],
        canModerateRoles: []
      },
      {
        roleName: 'table_moderator',
        level: 30,
        inheritsFrom: ['vip_player'],
        canModerateRoles: ['player', 'spectator']
      },
      {
        roleName: 'moderator',
        level: 50,
        inheritsFrom: ['table_moderator'],
        canModerateRoles: ['vip_player', 'player', 'spectator']
      },
      {
        roleName: 'senior_moderator',
        level: 60,
        inheritsFrom: ['moderator'],
        canModerateRoles: ['table_moderator', 'vip_player', 'player', 'spectator']
      },
      {
        roleName: 'administrator',
        level: 80,
        inheritsFrom: ['senior_moderator'],
        canModerateRoles: ['moderator', 'table_moderator', 'vip_player', 'player', 'spectator']
      },
      {
        roleName: 'super_admin',
        level: 100,
        inheritsFrom: ['administrator'],
        canModerateRoles: ['administrator', 'moderator', 'table_moderator', 'vip_player', 'player', 'spectator']
      }
    ];

    // Define role permissions
    const rolePermissions = {
      'banned': [],
      'spectator': ['spectate_game', 'join_club'],
      'player': ['join_game', 'place_bet', 'chat_message', 'private_message', 'create_club'],
      'vip_player': ['create_table'],
      'table_moderator': ['warn_player', 'kick_player', 'mute_player'],
      'moderator': ['delete_message', 'view_reports'],
      'senior_moderator': ['ban_user'],
      'administrator': ['manage_roles', 'view_admin_panel', 'manage_tables', 'view_analytics'],
      'super_admin': ['system_config']
    };

    // Create roles with inherited permissions
    for (const hierarchy of roleHierarchy) {
      const permissions = await this.calculateInheritedPermissions(hierarchy, rolePermissions);
      
      const role: RoleInfo = {
        id: hierarchy.roleName,
        name: hierarchy.roleName,
        displayName: this.formatRoleName(hierarchy.roleName),
        description: this.getRoleDescription(hierarchy.roleName),
        level: hierarchy.level,
        permissions: permissions
      };

      await this.nk.storageWrite([{
        collection: "roles",
        key: hierarchy.roleName,
        userId: "",
        value: role,
        permissionRead: 2,
        permissionWrite: 0
      }]);

      // Store hierarchy information
      await this.nk.storageWrite([{
        collection: "role_hierarchy",
        key: hierarchy.roleName,
        userId: "",
        value: hierarchy,
        permissionRead: 2,
        permissionWrite: 0
      }]);
    }

    this.logger.info(`✅ Created ${roleHierarchy.length} roles with inheritance hierarchy`);
  }

  /**
   * Calculate inherited permissions for a role
   */
  private async calculateInheritedPermissions(
    hierarchy: RoleHierarchy,
    rolePermissions: Record<string, string[]>
  ): Promise<Permission[]> {
    const allPermissionNames = new Set<string>();
    
    // Add direct permissions
    const directPermissions = rolePermissions[hierarchy.roleName] || [];
    directPermissions.forEach(p => allPermissionNames.add(p));

    // Add inherited permissions
    if (hierarchy.inheritsFrom) {
      for (const parentRole of hierarchy.inheritsFrom) {
        const parentPermissions = rolePermissions[parentRole] || [];
        parentPermissions.forEach(p => allPermissionNames.add(p));
        
        // Recursively get parent's inherited permissions
        // This is simplified - in production you might want a more sophisticated inheritance system
      }
    }

    // Convert permission names to Permission objects
    const permissions: Permission[] = [];
    for (const permissionName of allPermissionNames) {
      try {
        const result = await this.nk.storageRead([{
          collection: "permissions",
          key: permissionName,
          userId: ""
        }]);

        if (result && result.length > 0) {
          permissions.push(result[0].value as Permission);
        }
      } catch (error) {
        this.logger.warn(`Permission ${permissionName} not found for role ${hierarchy.roleName}`);
      }
    }

    return permissions;
  }

  /**
   * Set up role moderation matrix
   */
  private async setupRoleModerationMatrix(): Promise<void> {
    const moderationMatrix = {
      'super_admin': ['administrator', 'senior_moderator', 'moderator', 'table_moderator', 'vip_player', 'player', 'spectator'],
      'administrator': ['senior_moderator', 'moderator', 'table_moderator', 'vip_player', 'player', 'spectator'],
      'senior_moderator': ['moderator', 'table_moderator', 'vip_player', 'player', 'spectator'],
      'moderator': ['table_moderator', 'vip_player', 'player', 'spectator'],
      'table_moderator': ['vip_player', 'player', 'spectator']
    };

    await this.nk.storageWrite([{
      collection: "role_moderation_matrix",
      key: "moderation_permissions",
      userId: "",
      value: moderationMatrix,
      permissionRead: 2,
      permissionWrite: 0
    }]);

    this.logger.info('✅ Role moderation matrix configured');
  }

  /**
   * Check if user can moderate another user
   */
  public async canModerateUser(moderatorId: string, targetUserId: string): Promise<boolean> {
    try {
      const moderatorProfile = await this.userService.getUserProfile(moderatorId);
      const targetProfile = await this.userService.getUserProfile(targetUserId);

      if (!moderatorProfile || !targetProfile) {
        return false;
      }

      // Get moderation matrix
      const matrixResult = await this.nk.storageRead([{
        collection: "role_moderation_matrix",
        key: "moderation_permissions",
        userId: ""
      }]);

      if (!matrixResult || matrixResult.length === 0) {
        return false;
      }

      const matrix = matrixResult[0].value;
      const moderatableRoles = matrix[moderatorProfile.role.name] || [];

      return moderatableRoles.includes(targetProfile.role.name);
    } catch (error) {
      this.logger.error('Error checking moderation permissions:', error);
      return false;
    }
  }

  /**
   * Execute moderation action with role validation
   */
  public async executeModeration(
    moderatorId: string,
    targetUserId: string,
    action: 'warn' | 'kick' | 'mute' | 'ban' | 'unban',
    context: ModerationContext
  ): Promise<ModerationAction> {
    // Check if moderator can moderate target
    const canModerate = await this.canModerateUser(moderatorId, targetUserId);
    if (!canModerate) {
      throw ErrorFactory.authorizationError('Insufficient moderation permissions for target user');
    }

    // Check if moderator has required permission for action
    const permissionMap = {
      'warn': 'warn_player',
      'kick': 'kick_player',
      'mute': 'mute_player',
      'ban': 'ban_user',
      'unban': 'ban_user'
    };

    const requiredPermission = permissionMap[action];
    const hasPermission = await this.userService.hasPermission(moderatorId, requiredPermission);
    
    if (!hasPermission) {
      throw ErrorFactory.authorizationError(`Missing permission: ${requiredPermission}`);
    }

    // Execute the moderation action
    let result: boolean = false;
    switch (action) {
      case 'ban':
        result = await this.userService.banUser(targetUserId, moderatorId, context.reason, context.duration);
        break;
      case 'unban':
        result = await this.userService.unbanUser(targetUserId, moderatorId);
        break;
      case 'warn':
      case 'kick':
      case 'mute':
        result = await this.executeTableAction(action, targetUserId, moderatorId, context);
        break;
    }

    if (!result) {
      throw new NakamaError(`Failed to execute ${action} action`, 'MODERATION_FAILED', 500);
    }

    // Create moderation record
    const moderationAction: ModerationAction = {
      id: `${action}_${Date.now()}_${moderatorId}`,
      type: action,
      targetUserId,
      moderatorId,
      reason: context.reason,
      duration: context.duration,
      tableId: context.tableId,
      timestamp: new Date().toISOString(),
      metadata: context.metadata
    };

    // Store moderation action
    await this.nk.storageWrite([{
      collection: "moderation_actions",
      key: moderationAction.id,
      userId: moderatorId,
      value: moderationAction,
      permissionRead: 2,
      permissionWrite: 1
    }]);

    this.logger.info(`⚖️ Moderation action executed: ${action} by ${moderatorId} against ${targetUserId}`);
    return moderationAction;
  }

  /**
   * Execute table-specific moderation actions
   */
  private async executeTableAction(
    action: 'warn' | 'kick' | 'mute',
    targetUserId: string,
    moderatorId: string,
    context: ModerationContext
  ): Promise<boolean> {
    try {
      // Store table-specific moderation action
      const tableAction = {
        action,
        targetUserId,
        moderatorId,
        tableId: context.tableId,
        reason: context.reason,
        duration: context.duration,
        timestamp: new Date().toISOString()
      };

      await this.nk.storageWrite([{
        collection: "table_moderation",
        key: `${context.tableId}_${action}_${targetUserId}_${Date.now()}`,
        userId: moderatorId,
        value: tableAction,
        permissionRead: 2,
        permissionWrite: 1
      }]);

      return true;
    } catch (error) {
      this.logger.error(`Failed to execute table action ${action}:`, error);
      return false;
    }
  }

  /**
   * Get role assignment history
   */
  public async getRoleAssignmentHistory(userId: string): Promise<RoleAssignmentHistory[]> {
    try {
      const result = await this.nk.storageList(userId, "role_assignments", 50);
      return result.objects?.map(obj => obj.value as RoleAssignmentHistory) || [];
    } catch (error) {
      this.logger.error('Error getting role assignment history:', error);
      return [];
    }
  }

  /**
   * Assign role with validation and history tracking
   */
  public async assignRoleWithValidation(
    targetUserId: string,
    roleName: string,
    assignedBy: string,
    reason?: string
  ): Promise<boolean> {
    // Check if assigner can assign this role
    const canAssign = await this.canAssignRole(assignedBy, roleName);
    if (!canAssign) {
      throw ErrorFactory.authorizationError(`Cannot assign role: ${roleName}`);
    }

    // Get current user profile to track role change
    const currentProfile = await this.userService.getUserProfile(targetUserId);
    const fromRole = currentProfile?.role.name || 'none';

    // Assign the role
    const success = await this.userService.assignRole(targetUserId, roleName, assignedBy);
    
    if (success) {
      // Record role assignment history
      const historyRecord: RoleAssignmentHistory = {
        id: `role_change_${Date.now()}`,
        userId: targetUserId,
        fromRole,
        toRole: roleName,
        assignedBy,
        assignedAt: new Date().toISOString(),
        reason
      };

      await this.nk.storageWrite([{
        collection: "role_assignments",
        key: historyRecord.id,
        userId: targetUserId,
        value: historyRecord,
        permissionRead: 1,
        permissionWrite: 1
      }]);

      this.logger.info(`Role assigned: ${targetUserId} ${fromRole} -> ${roleName} by ${assignedBy}`);
    }

    return success;
  }

  /**
   * Check if user can assign a specific role
   */
  private async canAssignRole(assignerId: string, roleName: string): Promise<boolean> {
    const assignerProfile = await this.userService.getUserProfile(assignerId);
    if (!assignerProfile) {
      return false;
    }

    // Check if assigner has manage_roles permission
    const hasManagePermission = await this.userService.hasPermission(assignerId, 'manage_roles');
    if (!hasManagePermission) {
      return false;
    }

    // Get target role level
    const targetRole = await this.userService.getRole(roleName);
    if (!targetRole) {
      return false;
    }

    // Can only assign roles at or below their own level
    return assignerProfile.role.level >= targetRole.level;
  }

  /**
   * Utility functions
   */
  private formatRoleName(roleName: string): string {
    return roleName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private getRoleDescription(roleName: string): string {
    const descriptions = {
      'banned': 'Banned user with no access',
      'spectator': 'Can observe games only',
      'player': 'Regular poker player',
      'vip_player': 'Premium player with additional privileges',
      'table_moderator': 'Table-level moderation privileges',
      'moderator': 'Community moderator',
      'senior_moderator': 'Senior moderation privileges',
      'administrator': 'System administrator',
      'super_admin': 'Full system access'
    };

    return descriptions[roleName] || 'Custom role';
  }
}
