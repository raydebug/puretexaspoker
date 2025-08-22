/**
 * Advanced User Management System for Nakama Backend
 * Migrated from backend/src/services/authService.ts and roleManager.ts
 */

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  avatar?: string;
  chips: number;
  tablesPlayed: number;
  tablesWon: number;
  role: RoleInfo;
  isActive: boolean;
  isBanned: boolean;
  banInfo?: BanInfo;
  createdAt: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
}

export interface RoleInfo {
  id: string;
  name: string; // player, spectator, moderator, administrator
  displayName: string;
  description?: string;
  level: number; // 0=player, 10=spectator, 50=moderator, 100=admin
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string; // join_game, place_bet, chat_message, warn_player, kick_player, ban_user
  category: string; // gameplay, social, moderation, administration
  description?: string;
}

export interface BanInfo {
  bannedBy: string;
  bannedAt: string;
  reason?: string;
  expiresAt?: string; // For temporary bans
}

export interface ModerationAction {
  id: string;
  type: 'warn' | 'kick' | 'mute' | 'ban' | 'unban';
  targetUserId: string;
  moderatorId: string;
  reason?: string;
  duration?: number; // Duration in minutes for temporary actions
  tableId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class UserManagementService {
  private readonly nk: nkruntime.Nakama;
  private readonly logger: nkruntime.Logger;

  constructor(nk: nkruntime.Nakama, logger: nkruntime.Logger) {
    this.nk = nk;
    this.logger = logger;
  }

  /**
   * Initialize default roles and permissions
   */
  public async initializeDefaultRoles(): Promise<void> {
    this.logger.info('🔐 Initializing default roles and permissions...');

    const permissions = await this.createDefaultPermissions();
    await this.createDefaultRoles(permissions);

    this.logger.info('✅ Default roles and permissions initialized');
  }

  /**
   * Create default permissions
   */
  private async createDefaultPermissions(): Promise<Permission[]> {
    const defaultPermissions: Permission[] = [
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
        id: 'chat_message',
        name: 'chat_message',
        category: 'social',
        description: 'Send chat messages'
      },
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
        id: 'ban_user',
        name: 'ban_user',
        category: 'administration',
        description: 'Ban users from the platform'
      }
    ];

    // Store permissions in Nakama storage
    for (const permission of defaultPermissions) {
      await this.nk.storageWrite([{
        collection: "permissions",
        key: permission.id,
        userId: "",
        value: permission,
        permissionRead: 2, // Public read
        permissionWrite: 0  // No write (system only)
      }]);
    }

    return defaultPermissions;
  }

  /**
   * Create default roles
   */
  private async createDefaultRoles(permissions: Permission[]): Promise<void> {
    const defaultRoles: RoleInfo[] = [
      {
        id: 'player',
        name: 'player',
        displayName: 'Player',
        description: 'Regular poker player',
        level: 0,
        permissions: permissions.filter(p => ['join_game', 'place_bet', 'chat_message'].includes(p.name))
      },
      {
        id: 'spectator',
        name: 'spectator',
        displayName: 'Spectator',
        description: 'Can observe games only',
        level: 10,
        permissions: permissions.filter(p => ['chat_message'].includes(p.name))
      },
      {
        id: 'moderator',
        name: 'moderator',
        displayName: 'Moderator',
        description: 'Table moderation privileges',
        level: 50,
        permissions: permissions.filter(p => !['ban_user'].includes(p.name))
      },
      {
        id: 'administrator',
        name: 'administrator',
        displayName: 'Administrator',
        description: 'Full system administration',
        level: 100,
        permissions: permissions
      }
    ];

    // Store roles in Nakama storage
    for (const role of defaultRoles) {
      await this.nk.storageWrite([{
        collection: "roles",
        key: role.id,
        userId: "",
        value: role,
        permissionRead: 2, // Public read
        permissionWrite: 0  // No write (system only)
      }]);
    }
  }

  /**
   * Get user profile with role information
   */
  public async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Get user profile from storage
      const profileResult = await this.nk.storageRead([{
        collection: "user_profiles",
        key: "profile",
        userId: userId
      }]);

      if (!profileResult || profileResult.length === 0) {
        return null;
      }

      return profileResult[0].value as UserProfile;
    } catch (error) {
      this.logger.error(`Failed to get user profile for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Create or update user profile after authentication
   */
  public async createOrUpdateUserProfile(session: nkruntime.Session, metadata?: Record<string, any>): Promise<UserProfile> {
    const existingProfile = await this.getUserProfile(session.user_id);
    
    if (existingProfile) {
      // Update last login
      existingProfile.lastLoginAt = new Date().toISOString();
      existingProfile.lastActiveAt = new Date().toISOString();
      
      await this.nk.storageWrite([{
        collection: "user_profiles",
        key: "profile",
        userId: session.user_id,
        value: existingProfile,
        permissionRead: 1, // Owner read only
        permissionWrite: 1  // Owner write only
      }]);
      
      return existingProfile;
    }

    // Create new user profile
    const defaultRole = await this.getRole('player');
    if (!defaultRole) {
      throw new Error('Default player role not found');
    }

    const newProfile: UserProfile = {
      id: session.user_id,
      username: session.username,
      email: metadata?.email,
      displayName: metadata?.displayName || session.username,
      avatar: metadata?.avatar,
      chips: 10000, // Default starting chips
      tablesPlayed: 0,
      tablesWon: 0,
      role: defaultRole,
      isActive: true,
      isBanned: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };

    await this.nk.storageWrite([{
      collection: "user_profiles",
      key: "profile",
      userId: session.user_id,
      value: newProfile,
      permissionRead: 1,
      permissionWrite: 1
    }]);

    this.logger.info(`Created new user profile for ${session.username} (${session.user_id})`);
    return newProfile;
  }

  /**
   * Get role by name
   */
  public async getRole(roleName: string): Promise<RoleInfo | null> {
    try {
      const roleResult = await this.nk.storageRead([{
        collection: "roles",
        key: roleName,
        userId: ""
      }]);

      if (!roleResult || roleResult.length === 0) {
        return null;
      }

      return roleResult[0].value as RoleInfo;
    } catch (error) {
      this.logger.error(`Failed to get role ${roleName}:`, error);
      return null;
    }
  }

  /**
   * Check if user has permission
   */
  public async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const profile = await this.getUserProfile(userId);
    if (!profile || !profile.isActive || profile.isBanned) {
      return false;
    }

    return profile.role.permissions.some(p => p.name === permissionName);
  }

  /**
   * Assign role to user
   */
  public async assignRole(userId: string, roleName: string, moderatorId?: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      const newRole = await this.getRole(roleName);

      if (!profile || !newRole) {
        return false;
      }

      profile.role = newRole;

      await this.nk.storageWrite([{
        collection: "user_profiles",
        key: "profile",
        userId: userId,
        value: profile,
        permissionRead: 1,
        permissionWrite: 1
      }]);

      // Log role change
      if (moderatorId) {
        await this.logModerationAction({
          id: `role_change_${Date.now()}`,
          type: 'warn', // Using warn as closest type for role change
          targetUserId: userId,
          moderatorId: moderatorId,
          reason: `Role changed to ${newRole.displayName}`,
          timestamp: new Date().toISOString(),
          metadata: { action: 'role_change', newRole: roleName }
        });
      }

      this.logger.info(`Assigned role ${roleName} to user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to assign role ${roleName} to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Ban user
   */
  public async banUser(
    userId: string, 
    moderatorId: string, 
    reason?: string, 
    duration?: number
  ): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return false;
      }

      const banInfo: BanInfo = {
        bannedBy: moderatorId,
        bannedAt: new Date().toISOString(),
        reason: reason,
        expiresAt: duration ? new Date(Date.now() + duration * 60000).toISOString() : undefined
      };

      profile.isBanned = true;
      profile.banInfo = banInfo;

      await this.nk.storageWrite([{
        collection: "user_profiles",
        key: "profile",
        userId: userId,
        value: profile,
        permissionRead: 1,
        permissionWrite: 1
      }]);

      // Log moderation action
      await this.logModerationAction({
        id: `ban_${Date.now()}`,
        type: 'ban',
        targetUserId: userId,
        moderatorId: moderatorId,
        reason: reason,
        duration: duration,
        timestamp: new Date().toISOString()
      });

      this.logger.info(`Banned user ${userId} by ${moderatorId}${duration ? ` for ${duration} minutes` : ' permanently'}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to ban user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Unban user
   */
  public async unbanUser(userId: string, moderatorId: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return false;
      }

      profile.isBanned = false;
      profile.banInfo = undefined;

      await this.nk.storageWrite([{
        collection: "user_profiles",
        key: "profile",
        userId: userId,
        value: profile,
        permissionRead: 1,
        permissionWrite: 1
      }]);

      // Log moderation action
      await this.logModerationAction({
        id: `unban_${Date.now()}`,
        type: 'unban',
        targetUserId: userId,
        moderatorId: moderatorId,
        timestamp: new Date().toISOString()
      });

      this.logger.info(`Unbanned user ${userId} by ${moderatorId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to unban user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Log moderation action
   */
  private async logModerationAction(action: ModerationAction): Promise<void> {
    try {
      await this.nk.storageWrite([{
        collection: "moderation_actions",
        key: action.id,
        userId: action.moderatorId,
        value: action,
        permissionRead: 2, // Public read for transparency
        permissionWrite: 1  // Owner write only
      }]);
    } catch (error) {
      this.logger.error(`Failed to log moderation action:`, error);
    }
  }

  /**
   * Update user stats (chips, games played, etc.)
   */
  public async updateUserStats(userId: string, stats: Partial<UserProfile>): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return false;
      }

      // Update allowed fields
      if (stats.chips !== undefined) profile.chips = stats.chips;
      if (stats.tablesPlayed !== undefined) profile.tablesPlayed = stats.tablesPlayed;
      if (stats.tablesWon !== undefined) profile.tablesWon = stats.tablesWon;
      if (stats.avatar !== undefined) profile.avatar = stats.avatar;
      if (stats.displayName !== undefined) profile.displayName = stats.displayName;

      profile.lastActiveAt = new Date().toISOString();

      await this.nk.storageWrite([{
        collection: "user_profiles",
        key: "profile", 
        userId: userId,
        value: profile,
        permissionRead: 1,
        permissionWrite: 1
      }]);

      return true;
    } catch (error) {
      this.logger.error(`Failed to update user stats for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if ban has expired
   */
  public async checkBanExpiration(userId: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile || !profile.isBanned || !profile.banInfo?.expiresAt) {
        return false;
      }

      const now = new Date();
      const expiresAt = new Date(profile.banInfo.expiresAt);

      if (now >= expiresAt) {
        // Ban has expired, automatically unban
        await this.unbanUser(userId, 'system');
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to check ban expiration for ${userId}:`, error);
      return false;
    }
  }
}
