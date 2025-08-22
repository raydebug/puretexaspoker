/**
 * Advanced Authentication RPC Functions for Nakama Backend
 * Enhanced authentication system with role management and moderation
 */

import { UserManagementService, UserProfile } from '../auth/user_management';
import { ErrorHandler, withErrorHandling, ErrorFactory, NakamaError } from '../middleware/error_handling';
import { Validator, ValidationSchemas } from '../middleware/validation';

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

interface LoginRequest {
  identifier: string; // username or email
  password: string;
}

interface RoleAssignmentRequest {
  targetUserId: string;
  roleName: string;
}

interface BanRequest {
  targetUserId: string;
  reason?: string;
  duration?: number; // minutes
}

interface UpdateProfileRequest {
  displayName?: string;
  avatar?: string;
}

/**
 * Enhanced user registration with validation
 */
const registerUserRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);
  
  const request: RegisterRequest = JSON.parse(payload);
  
  // Validate input using comprehensive validation
  validator.validateUserRegistration(request);

  // Check if user already exists
  try {
    nk.authenticateEmail(request.email, request.password, false);
    throw ErrorFactory.conflictError('Email already registered');
  } catch (e) {
    // Email not found, which is what we want for registration
    if (e instanceof NakamaError) {
      throw e; // Re-throw our conflict error
    }
  }

  // Create new account
  const userId = nk.authenticateEmail(request.email, request.password, true);
  
  // Initialize user management service
  const userService = new UserManagementService(nk, logger);
  
  // Create user profile
  const session = nk.sessionAuth();
  if (session) {
    await userService.createOrUpdateUserProfile(session, {
      email: request.email,
      displayName: request.displayName
    });
  }

  logger.info(`New user registered: ${request.username} (${userId})`);
  
  return errorHandler.createSuccessResponse({
    userId: userId,
    username: request.username
  }, 'User registered successfully');
});

/**
 * Get current user profile
 */
function getUserProfileRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const userService = new UserManagementService(nk, logger);
    const profile = userService.getUserProfile(ctx.userId);

    if (!profile) {
      throw new Error('User profile not found');
    }

    return JSON.stringify({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Get profile failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get profile'
    });
  }
}

/**
 * Update user profile
 */
function updateUserProfileRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const request: UpdateProfileRequest = JSON.parse(payload);
    const userService = new UserManagementService(nk, logger);
    
    const success = userService.updateUserStats(ctx.userId, {
      displayName: request.displayName,
      avatar: request.avatar
    });

    if (!success) {
      throw new Error('Failed to update profile');
    }

    return JSON.stringify({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logger.error('Update profile failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile'
    });
  }
}

/**
 * Check user permissions
 */
function checkPermissionRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const { permission } = JSON.parse(payload);
    const userService = new UserManagementService(nk, logger);
    
    const hasPermission = userService.hasPermission(ctx.userId, permission);

    return JSON.stringify({
      success: true,
      data: { hasPermission }
    });
  } catch (error) {
    logger.error('Permission check failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Permission check failed'
    });
  }
}

/**
 * Assign role to user (moderator/admin only)
 */
function assignRoleRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const request: RoleAssignmentRequest = JSON.parse(payload);
    const userService = new UserManagementService(nk, logger);
    
    // Check if current user has permission to assign roles
    const hasPermission = userService.hasPermission(ctx.userId, 'ban_user'); // Admin permission
    if (!hasPermission) {
      throw new Error('Insufficient permissions to assign roles');
    }

    const success = userService.assignRole(request.targetUserId, request.roleName, ctx.userId);

    if (!success) {
      throw new Error('Failed to assign role');
    }

    return JSON.stringify({
      success: true,
      message: `Role ${request.roleName} assigned successfully`
    });
  } catch (error) {
    logger.error('Role assignment failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign role'
    });
  }
}

/**
 * Ban user (moderator/admin only)
 */
function banUserRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const request: BanRequest = JSON.parse(payload);
    const userService = new UserManagementService(nk, logger);
    
    // Check if current user has permission to ban
    const hasPermission = userService.hasPermission(ctx.userId, 'ban_user');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to ban users');
    }

    const success = userService.banUser(
      request.targetUserId, 
      ctx.userId, 
      request.reason, 
      request.duration
    );

    if (!success) {
      throw new Error('Failed to ban user');
    }

    return JSON.stringify({
      success: true,
      message: 'User banned successfully'
    });
  } catch (error) {
    logger.error('Ban user failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to ban user'
    });
  }
}

/**
 * Unban user (moderator/admin only)
 */
function unbanUserRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const { targetUserId } = JSON.parse(payload);
    const userService = new UserManagementService(nk, logger);
    
    // Check if current user has permission to unban
    const hasPermission = userService.hasPermission(ctx.userId, 'ban_user');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to unban users');
    }

    const success = userService.unbanUser(targetUserId, ctx.userId);

    if (!success) {
      throw new Error('Failed to unban user');
    }

    return JSON.stringify({
      success: true,
      message: 'User unbanned successfully'
    });
  } catch (error) {
    logger.error('Unban user failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unban user'
    });
  }
}

/**
 * Get user list with roles (admin only)
 */
function getUserListRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const userService = new UserManagementService(nk, logger);
    
    // Check admin permission
    const hasPermission = userService.hasPermission(ctx.userId, 'ban_user');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to view user list');
    }

    // Get user profiles from storage
    // Note: In production, this would need pagination
    const result = nk.storageList(ctx.userId, "user_profiles", 100);
    
    const users = result.objects?.map(obj => obj.value) || [];

    return JSON.stringify({
      success: true,
      data: { users, count: users.length }
    });
  } catch (error) {
    logger.error('Get user list failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user list'
    });
  }
}

/**
 * Initialize default roles and permissions (system setup)
 */
function initializeRolesRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    // This should only be called during system initialization
    // In production, you might want to restrict this to specific admin users
    
    const userService = new UserManagementService(nk, logger);
    userService.initializeDefaultRoles();

    return JSON.stringify({
      success: true,
      message: 'Default roles and permissions initialized'
    });
  } catch (error) {
    logger.error('Initialize roles failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize roles'
    });
  }
}

// Export RPC functions
module.exports = {
  registerUserRpc,
  getUserProfileRpc,
  updateUserProfileRpc,
  checkPermissionRpc,
  assignRoleRpc,
  banUserRpc,
  unbanUserRpc,
  getUserListRpc,
  initializeRolesRpc
};
