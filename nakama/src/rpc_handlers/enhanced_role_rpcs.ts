/**
 * Enhanced Role Management RPC Functions for Nakama Backend
 * Advanced role system with hierarchy, inheritance, and moderation matrix
 */

import { EnhancedRoleManager } from '../auth/enhanced_role_manager';
import { UserManagementService } from '../auth/user_management';
import { ErrorHandler, withErrorHandling, ErrorFactory } from '../middleware/error_handling';
import { Validator } from '../middleware/validation';

interface ModerationRequest {
  targetUserId: string;
  action: 'warn' | 'kick' | 'mute' | 'ban' | 'unban';
  reason?: string;
  duration?: number; // minutes
  tableId?: string;
}

interface RoleAssignmentRequest {
  targetUserId: string;
  roleName: string;
  reason?: string;
}

interface ModerationHistoryRequest {
  userId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Initialize enhanced role system
 */
const initializeEnhancedRolesRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const roleManager = new EnhancedRoleManager(nk, logger);

  // Check super admin permission (system initialization)
  const userService = new UserManagementService(nk, logger);
  const hasPermission = await userService.hasPermission(ctx.userId, 'system_config');
  
  if (!hasPermission) {
    throw ErrorFactory.authorizationError('Only super administrators can initialize role system');
  }

  await roleManager.initializeEnhancedRoles();

  return errorHandler.createSuccessResponse({
    message: 'Enhanced role system initialized successfully',
    timestamp: new Date().toISOString()
  });
});

/**
 * Execute moderation action with role validation
 */
const executeModerationRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);
  const roleManager = new EnhancedRoleManager(nk, logger);

  const request: ModerationRequest = JSON.parse(payload);

  // Validate request
  validator.validate(request, [
    { field: 'targetUserId', required: true, type: 'string', minLength: 1 },
    { field: 'action', required: true, type: 'string', enum: ['warn', 'kick', 'mute', 'ban', 'unban'] },
    { field: 'reason', required: false, type: 'string', maxLength: 500 },
    { field: 'duration', required: false, type: 'number', min: 1, max: 525600 } // Max 1 year
  ]);

  // Check rate limiting for moderation actions
  await errorHandler.checkRateLimit(nk, ctx.userId, 'moderation', 10, 5); // 10 actions per 5 minutes

  // Execute moderation action
  const moderationAction = await roleManager.executeModeration(
    ctx.userId,
    request.targetUserId,
    request.action,
    {
      reason: request.reason,
      duration: request.duration,
      tableId: request.tableId
    }
  );

  return errorHandler.createSuccessResponse({
    moderationAction,
    message: `${request.action} action executed successfully`
  });
});

/**
 * Assign role with enhanced validation
 */
const assignRoleEnhancedRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);
  const roleManager = new EnhancedRoleManager(nk, logger);

  const request: RoleAssignmentRequest = JSON.parse(payload);

  // Validate request
  validator.validate(request, [
    { field: 'targetUserId', required: true, type: 'string', minLength: 1 },
    { field: 'roleName', required: true, type: 'string', minLength: 1 },
    { field: 'reason', required: false, type: 'string', maxLength: 200 }
  ]);

  // Check rate limiting for role assignments
  await errorHandler.checkRateLimit(nk, ctx.userId, 'role_assignment', 5, 10); // 5 assignments per 10 minutes

  // Assign role with validation
  const success = await roleManager.assignRoleWithValidation(
    request.targetUserId,
    request.roleName,
    ctx.userId,
    request.reason
  );

  if (!success) {
    throw new Error('Failed to assign role');
  }

  return errorHandler.createSuccessResponse({
    targetUserId: request.targetUserId,
    roleName: request.roleName,
    assignedBy: ctx.userId,
    message: 'Role assigned successfully'
  });
});

/**
 * Check if user can moderate another user
 */
const checkModerationPermissionRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const roleManager = new EnhancedRoleManager(nk, logger);

  const { targetUserId } = JSON.parse(payload);

  if (!targetUserId) {
    throw ErrorFactory.validationError('targetUserId is required');
  }

  const canModerate = await roleManager.canModerateUser(ctx.userId, targetUserId);

  return errorHandler.createSuccessResponse({
    canModerate,
    moderatorId: ctx.userId,
    targetUserId
  });
});

/**
 * Get role hierarchy information
 */
const getRoleHierarchyRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);

  try {
    // Get all roles
    const rolesResult = await nk.storageList("", "roles", 50);
    const roles = rolesResult.objects?.map(obj => obj.value) || [];

    // Get role hierarchy
    const hierarchyResult = await nk.storageList("", "role_hierarchy", 50);
    const hierarchy = hierarchyResult.objects?.map(obj => obj.value) || [];

    // Get permission groups
    const groupsResult = await nk.storageList("", "permission_groups", 50);
    const permissionGroups = groupsResult.objects?.map(obj => obj.value) || [];

    return errorHandler.createSuccessResponse({
      roles: roles.sort((a: any, b: any) => b.level - a.level), // Sort by level descending
      hierarchy,
      permissionGroups
    });
  } catch (error) {
    throw ErrorFactory.storageError('Failed to retrieve role hierarchy');
  }
});

/**
 * Get moderation history
 */
const getModerationHistoryRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);
  const userService = new UserManagementService(nk, logger);

  const request: ModerationHistoryRequest = JSON.parse(payload);
  const { limit, offset } = validator.validatePagination(request.limit, request.offset);

  // Check permission to view moderation history
  const hasPermission = await userService.hasPermission(ctx.userId, 'view_reports');
  if (!hasPermission) {
    throw ErrorFactory.authorizationError('Permission required: view_reports');
  }

  try {
    let moderationActions: any[] = [];

    if (request.userId) {
      // Get moderation history for specific user
      const result = await nk.storageList(request.userId, "moderation_actions", limit);
      moderationActions = result.objects?.map(obj => obj.value) || [];
    } else {
      // Get all moderation actions (admin view)
      const adminPermission = await userService.hasPermission(ctx.userId, 'view_admin_panel');
      if (!adminPermission) {
        throw ErrorFactory.authorizationError('Permission required: view_admin_panel');
      }

      const result = await nk.storageList("", "moderation_actions", limit);
      moderationActions = result.objects?.map(obj => obj.value) || [];
    }

    // Sort by timestamp (newest first)
    moderationActions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply offset
    const paginatedActions = moderationActions.slice(offset, offset + limit);

    return errorHandler.createSuccessResponse({
      moderationActions: paginatedActions,
      total: moderationActions.length,
      limit,
      offset
    });
  } catch (error) {
    throw ErrorFactory.storageError('Failed to retrieve moderation history');
  }
});

/**
 * Get role assignment history
 */
const getRoleAssignmentHistoryRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const roleManager = new EnhancedRoleManager(nk, logger);
  const userService = new UserManagementService(nk, logger);

  const { userId } = JSON.parse(payload);

  if (!userId) {
    throw ErrorFactory.validationError('userId is required');
  }

  // Check if user can view role history (self or admin)
  if (ctx.userId !== userId) {
    const hasPermission = await userService.hasPermission(ctx.userId, 'view_admin_panel');
    if (!hasPermission) {
      throw ErrorFactory.authorizationError('Can only view own role history or admin permission required');
    }
  }

  const history = await roleManager.getRoleAssignmentHistory(userId);

  return errorHandler.createSuccessResponse({
    userId,
    roleHistory: history,
    count: history.length
  });
});

/**
 * Get user moderation status
 */
const getUserModerationStatusRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const userService = new UserManagementService(nk, logger);

  const { userId } = JSON.parse(payload);

  if (!userId) {
    throw ErrorFactory.validationError('userId is required');
  }

  // Check permission to view user status
  if (ctx.userId !== userId) {
    const hasPermission = await userService.hasPermission(ctx.userId, 'view_reports');
    if (!hasPermission) {
      throw ErrorFactory.authorizationError('Permission required to view user status');
    }
  }

  const profile = await userService.getUserProfile(userId);
  if (!profile) {
    throw ErrorFactory.notFoundError('User');
  }

  // Get active table moderation (kicks, mutes, etc.)
  const tableModerationResult = await nk.storageList(userId, "table_moderation", 20);
  const tableModeration = tableModerationResult.objects?.map(obj => obj.value) || [];

  // Filter active moderation actions
  const now = Date.now();
  const activeModeration = tableModeration.filter((action: any) => {
    if (!action.duration) return false;
    const expiresAt = new Date(action.timestamp).getTime() + (action.duration * 60 * 1000);
    return expiresAt > now;
  });

  return errorHandler.createSuccessResponse({
    userId,
    username: profile.username,
    role: profile.role,
    isActive: profile.isActive,
    isBanned: profile.isBanned,
    banInfo: profile.banInfo,
    activeTableModeration: activeModeration,
    moderationCount: activeModeration.length
  });
});

/**
 * Bulk role operations (admin only)
 */
const bulkRoleOperationsRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const userService = new UserManagementService(nk, logger);
  const roleManager = new EnhancedRoleManager(nk, logger);

  // Check admin permission
  const hasPermission = await userService.hasPermission(ctx.userId, 'manage_roles');
  if (!hasPermission) {
    throw ErrorFactory.authorizationError('Admin permission required for bulk operations');
  }

  const { operation, userIds, roleName, reason } = JSON.parse(payload);

  if (!operation || !userIds || !Array.isArray(userIds)) {
    throw ErrorFactory.validationError('operation and userIds array are required');
  }

  if (userIds.length > 50) {
    throw ErrorFactory.validationError('Maximum 50 users per bulk operation');
  }

  const results = [];
  
  for (const userId of userIds) {
    try {
      let success = false;
      
      switch (operation) {
        case 'assign_role':
          if (!roleName) {
            throw new Error('roleName required for assign_role operation');
          }
          success = await roleManager.assignRoleWithValidation(userId, roleName, ctx.userId, reason);
          break;
          
        case 'ban':
          success = await userService.banUser(userId, ctx.userId, reason);
          break;
          
        case 'unban':
          success = await userService.unbanUser(userId, ctx.userId);
          break;
          
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      results.push({ userId, success, error: null });
    } catch (error) {
      results.push({ 
        userId, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  return errorHandler.createSuccessResponse({
    operation,
    totalUsers: userIds.length,
    successCount,
    failureCount,
    results
  });
});

// Export enhanced role RPC functions
module.exports = {
  initializeEnhancedRolesRpc,
  executeModerationRpc,
  assignRoleEnhancedRpc,
  checkModerationPermissionRpc,
  getRoleHierarchyRpc,
  getModerationHistoryRpc,
  getRoleAssignmentHistoryRpc,
  getUserModerationStatusRpc,
  bulkRoleOperationsRpc
};
