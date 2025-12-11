/**
 * Comprehensive Error Handling System for Nakama Backend
 * Migrated from backend/src/middleware/errorHandler.ts
 */

export interface NakamaAPIError {
  code: string;
  message: string;
  statusCode: number;
  timestamp: string;
  details?: any;
}

export interface NakamaErrorResponse {
  success: boolean;
  error: NakamaAPIError;
}

export interface NakamaSuccessResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export class NakamaError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string = 'GENERAL_ERROR', statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'NakamaError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Error handling utility class for Nakama RPCs
 */
export class ErrorHandler {
  private readonly logger: nkruntime.Logger;

  constructor(logger: nkruntime.Logger) {
    this.logger = logger;
  }

  /**
   * Handle and format errors in RPC functions
   */
  public handleRpcError(
    error: Error | NakamaError | any,
    context: string,
    userId?: string
  ): string {
    this.logger.error(`[${context}] Error for user ${userId || 'unknown'}:`, {
      message: error.message,
      stack: error.stack,
      code: error.code,
      timestamp: new Date().toISOString()
    });

    let apiError: NakamaAPIError;

    if (error instanceof NakamaError) {
      apiError = {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
        details: error.details
      };
    } else if (error.name === 'ValidationError') {
      apiError = {
        code: 'VALIDATION_ERROR',
        message: error.message,
        statusCode: 422,
        timestamp: new Date().toISOString()
      };
    } else if (error.message?.includes('not found')) {
      apiError = {
        code: 'NOT_FOUND',
        message: error.message,
        statusCode: 404,
        timestamp: new Date().toISOString()
      };
    } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
      apiError = {
        code: 'UNAUTHORIZED',
        message: error.message,
        statusCode: 403,
        timestamp: new Date().toISOString()
      };
    } else if (error.message?.includes('storage') || error.message?.includes('database')) {
      apiError = {
        code: 'STORAGE_ERROR',
        message: 'Database operation failed',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        details: { originalError: error.message }
      };
    } else {
      apiError = {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        statusCode: 500,
        timestamp: new Date().toISOString()
      };
    }

    const errorResponse: NakamaErrorResponse = {
      success: false,
      error: apiError
    };

    return JSON.stringify(errorResponse);
  }

  /**
   * Create success response
   */
  public createSuccessResponse<T>(
    data: T,
    message?: string
  ): string {
    const response: NakamaSuccessResponse<T> = {
      success: true,
      data,
      ...(message && { message })
    };

    return JSON.stringify(response);
  }

  /**
   * Validate required fields in payload
   */
  public validateRequiredFields(
    payload: any,
    requiredFields: string[]
  ): void {
    const missingFields = requiredFields.filter(field => !payload[field]);
    
    if (missingFields.length > 0) {
      throw new NakamaError(
        `Missing required fields: ${missingFields.join(', ')}`,
        'VALIDATION_ERROR',
        422,
        { missingFields }
      );
    }
  }

  /**
   * Validate user permissions
   */
  public async validatePermissions(
    nk: nkruntime.Nakama,
    userId: string,
    requiredPermission: string
  ): Promise<void> {
    const { UserManagementService } = require('../auth/user_management');
    const userService = new UserManagementService(nk, this.logger);
    
    const hasPermission = await userService.hasPermission(userId, requiredPermission);
    
    if (!hasPermission) {
      throw new NakamaError(
        `Insufficient permissions. Required: ${requiredPermission}`,
        'INSUFFICIENT_PERMISSIONS',
        403,
        { requiredPermission }
      );
    }
  }

  /**
   * Validate user is not banned
   */
  public async validateUserNotBanned(
    nk: nkruntime.Nakama,
    userId: string
  ): Promise<void> {
    const { UserManagementService } = require('../auth/user_management');
    const userService = new UserManagementService(nk, this.logger);
    
    const profile = await userService.getUserProfile(userId);
    
    if (!profile) {
      throw new NakamaError(
        'User profile not found',
        'USER_NOT_FOUND',
        404
      );
    }

    if (profile.isBanned) {
      const banInfo = profile.banInfo;
      const banMessage = banInfo?.reason 
        ? `Account banned: ${banInfo.reason}`
        : 'Account is banned';
        
      throw new NakamaError(
        banMessage,
        'USER_BANNED',
        403,
        { 
          bannedAt: banInfo?.bannedAt,
          bannedBy: banInfo?.bannedBy,
          expiresAt: banInfo?.expiresAt
        }
      );
    }

    if (!profile.isActive) {
      throw new NakamaError(
        'Account is not active',
        'USER_INACTIVE',
        403
      );
    }
  }

  /**
   * Rate limiting check (basic implementation)
   */
  public async checkRateLimit(
    nk: nkruntime.Nakama,
    userId: string,
    action: string,
    maxRequests: number = 60,
    windowMinutes: number = 1
  ): Promise<void> {
    const now = Date.now();
    const windowStart = now - (windowMinutes * 60 * 1000);
    const rateLimitKey = `rate_limit:${userId}:${action}`;

    try {
      // Get current rate limit data
      const result = await nk.storageRead([{
        collection: "rate_limits",
        key: rateLimitKey,
        userId: userId
      }]);

      let requests: number[] = [];
      
      if (result && result.length > 0) {
        requests = result[0].value.requests || [];
      }

      // Filter out requests outside the time window
      requests = requests.filter(timestamp => timestamp > windowStart);

      if (requests.length >= maxRequests) {
        throw new NakamaError(
          `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMinutes} minute(s)`,
          'RATE_LIMIT_EXCEEDED',
          429,
          { 
            maxRequests,
            windowMinutes,
            currentRequests: requests.length
          }
        );
      }

      // Add current request
      requests.push(now);

      // Store updated rate limit data
      await nk.storageWrite([{
        collection: "rate_limits",
        key: rateLimitKey,
        userId: userId,
        value: { requests },
        permissionRead: 1,
        permissionWrite: 1
      }]);

    } catch (error) {
      if (error instanceof NakamaError) {
        throw error;
      }
      
      this.logger.warn(`Rate limit check failed for ${userId}:${action}`, error);
      // Don't block on rate limit failures
    }
  }

  /**
   * Validate game table access
   */
  public async validateTableAccess(
    nk: nkruntime.Nakama,
    userId: string,
    tableId: string
  ): Promise<void> {
    try {
      // Get table information
      const result = await nk.storageRead([{
        collection: "poker_tables",
        key: tableId,
        userId: ""
      }]);

      if (!result || result.length === 0) {
        throw new NakamaError(
          'Table not found',
          'TABLE_NOT_FOUND',
          404
        );
      }

      const table = result[0].value;

      // Check if table is active
      if (!table.isActive) {
        throw new NakamaError(
          'Table is not active',
          'TABLE_INACTIVE',
          400
        );
      }

      // Check if table is private and user has access
      if (table.isPrivate && !table.allowedUsers?.includes(userId)) {
        throw new NakamaError(
          'Access denied to private table',
          'TABLE_ACCESS_DENIED',
          403
        );
      }

    } catch (error) {
      if (error instanceof NakamaError) {
        throw error;
      }
      
      throw new NakamaError(
        'Failed to validate table access',
        'TABLE_VALIDATION_ERROR',
        500,
        { originalError: error.message }
      );
    }
  }

  /**
   * Log security events
   */
  public async logSecurityEvent(
    nk: nkruntime.Nakama,
    userId: string,
    eventType: string,
    details: any
  ): Promise<void> {
    try {
      const securityEvent = {
        userId,
        eventType,
        details,
        timestamp: new Date().toISOString(),
        ipAddress: details.ipAddress || 'unknown',
        userAgent: details.userAgent || 'unknown'
      };

      await nk.storageWrite([{
        collection: "security_events",
        key: `${eventType}_${Date.now()}_${userId}`,
        userId: userId,
        value: securityEvent,
        permissionRead: 0, // System only
        permissionWrite: 0
      }]);

      this.logger.info(`Security event logged: ${eventType} for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to log security event:', error);
    }
  }
}

/**
 * Pre-built error factory functions
 */
export const ErrorFactory = {
  validationError: (message: string, details?: any) => 
    new NakamaError(message, 'VALIDATION_ERROR', 422, details),

  authenticationError: (message: string = 'Authentication required') => 
    new NakamaError(message, 'AUTHENTICATION_ERROR', 401),

  authorizationError: (message: string = 'Insufficient permissions') => 
    new NakamaError(message, 'AUTHORIZATION_ERROR', 403),

  notFoundError: (resource: string) => 
    new NakamaError(`${resource} not found`, 'NOT_FOUND', 404),

  conflictError: (message: string) => 
    new NakamaError(message, 'CONFLICT', 409),

  rateLimitError: (limit: number, window: number) => 
    new NakamaError(
      `Rate limit exceeded: ${limit} requests per ${window} minutes`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { limit, window }
    ),

  gameStateError: (message: string) => 
    new NakamaError(message, 'INVALID_GAME_STATE', 400),

  insufficientFundsError: (required: number, available: number) => 
    new NakamaError(
      'Insufficient funds for this action',
      'INSUFFICIENT_FUNDS',
      400,
      { required, available }
    ),

  tableFullError: () => 
    new NakamaError('Table is full', 'TABLE_FULL', 400),

  outOfTurnError: () => 
    new NakamaError('Action not allowed: out of turn', 'OUT_OF_TURN', 400),

  invalidBetError: (message: string) => 
    new NakamaError(message, 'INVALID_BET', 400),

  storageError: (operation: string) => 
    new NakamaError(`Storage operation failed: ${operation}`, 'STORAGE_ERROR', 500)
};

/**
 * RPC wrapper with automatic error handling
 */
export function withErrorHandling(
  rpcFunction: (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
  ) => Promise<string> | string
) {
  return async (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
  ): Promise<string> => {
    const errorHandler = new ErrorHandler(logger);
    
    try {
      const result = await rpcFunction(ctx, logger, nk, payload);
      return result;
    } catch (error) {
      return errorHandler.handleRpcError(error, ctx.userId || 'unknown', ctx.userId);
    }
  };
}
