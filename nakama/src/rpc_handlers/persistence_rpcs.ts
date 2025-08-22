/**
 * Game Persistence and Reconnection RPC Functions for Nakama Backend
 * Handle game state persistence, player reconnection, and crash recovery
 */

import { PersistenceManager, GameSession, ReconnectionData } from '../game_logic/persistence_manager';
import { ErrorHandler, withErrorHandling, ErrorFactory } from '../middleware/error_handling';
import { Validator } from '../middleware/validation';
import { UserManagementService } from '../auth/user_management';

interface CreateSessionRequest {
  tableId: string;
  matchId: string;
  seatNumber: number;
  initialChips: number;
}

interface ReconnectRequest {
  tableId: string;
}

interface SnapshotRequest {
  tableId: string;
  matchId: string;
  gameState: any;
}

interface ActionRecordRequest {
  tableId: string;
  playerId: string;
  playerName: string;
  action: string;
  amount?: number;
  gamePhase: string;
  handNumber: number;
  gameStateBefore?: string;
  gameStateAfter?: string;
}

/**
 * Create game session for player joining a table
 */
const createGameSessionRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);
  const persistenceManager = new PersistenceManager(nk, logger);

  const request: CreateSessionRequest = JSON.parse(payload);

  // Validate request
  validator.validate(request, [
    { field: 'tableId', required: true, type: 'string', minLength: 1 },
    { field: 'matchId', required: true, type: 'string', minLength: 1 },
    { field: 'seatNumber', required: true, type: 'number', min: 1, max: 10 },
    { field: 'initialChips', required: true, type: 'number', min: 1 }
  ]);

  // Check if user already has an active session
  const existingSession = await persistenceManager.getActiveGameSession(ctx.userId);
  if (existingSession && existingSession.status === 'active') {
    throw ErrorFactory.conflictError('User already has an active game session');
  }

  // Validate user permissions
  await errorHandler.validateUserNotBanned(nk, ctx.userId);
  const userService = new UserManagementService(nk, logger);
  const hasPermission = await userService.hasPermission(ctx.userId, 'join_game');
  if (!hasPermission) {
    throw ErrorFactory.authorizationError('Permission required: join_game');
  }

  // Create session
  const session = await persistenceManager.createGameSession(
    ctx.userId,
    request.tableId,
    request.matchId,
    request.seatNumber,
    request.initialChips
  );

  return errorHandler.createSuccessResponse({
    session,
    message: 'Game session created successfully'
  });
});

/**
 * Handle player disconnection
 */
const handleDisconnectionRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const persistenceManager = new PersistenceManager(nk, logger);

  const { tableId, reason } = JSON.parse(payload);

  if (!tableId) {
    throw ErrorFactory.validationError('tableId is required');
  }

  await persistenceManager.handlePlayerDisconnection(
    ctx.userId,
    tableId,
    reason || 'network'
  );

  return errorHandler.createSuccessResponse({
    userId: ctx.userId,
    tableId,
    message: 'Disconnection handled successfully'
  });
});

/**
 * Attempt player reconnection
 */
const attemptReconnectionRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);
  const persistenceManager = new PersistenceManager(nk, logger);

  const request: ReconnectRequest = JSON.parse(payload);

  validator.validate(request, [
    { field: 'tableId', required: true, type: 'string', minLength: 1 }
  ]);

  // Check user is not banned
  await errorHandler.validateUserNotBanned(nk, ctx.userId);

  // Check rate limiting for reconnection attempts
  await errorHandler.checkRateLimit(nk, ctx.userId, 'reconnection', 5, 5); // 5 attempts per 5 minutes

  // Attempt reconnection
  const reconnectionData = await persistenceManager.attemptPlayerReconnection(
    ctx.userId,
    request.tableId
  );

  return errorHandler.createSuccessResponse({
    reconnectionData,
    message: 'Reconnection successful'
  });
});

/**
 * Create game snapshot
 */
const createGameSnapshotRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);
  const persistenceManager = new PersistenceManager(nk, logger);

  const request: SnapshotRequest = JSON.parse(payload);

  validator.validate(request, [
    { field: 'tableId', required: true, type: 'string', minLength: 1 },
    { field: 'matchId', required: true, type: 'string', minLength: 1 },
    { field: 'gameState', required: true, type: 'object' }
  ]);

  // Create snapshot
  const snapshot = await persistenceManager.createGameSnapshot(
    request.tableId,
    request.matchId,
    request.gameState
  );

  return errorHandler.createSuccessResponse({
    snapshot: {
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      handNumber: snapshot.handNumber,
      gamePhase: snapshot.gamePhase
    },
    message: 'Game snapshot created successfully'
  });
});

/**
 * Restore game state from snapshot
 */
const restoreGameStateRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const persistenceManager = new PersistenceManager(nk, logger);
  const userService = new UserManagementService(nk, logger);

  const { snapshotId } = JSON.parse(payload);

  if (!snapshotId) {
    throw ErrorFactory.validationError('snapshotId is required');
  }

  // Check admin permission for game restoration
  const hasPermission = await userService.hasPermission(ctx.userId, 'manage_tables');
  if (!hasPermission) {
    throw ErrorFactory.authorizationError('Admin permission required for game restoration');
  }

  // Restore game state
  const snapshot = await persistenceManager.restoreGameState(snapshotId);

  return errorHandler.createSuccessResponse({
    snapshot,
    message: 'Game state restored successfully'
  });
});

/**
 * Record game action
 */
const recordGameActionRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);
  const persistenceManager = new PersistenceManager(nk, logger);

  const request: ActionRecordRequest = JSON.parse(payload);

  validator.validate(request, [
    { field: 'tableId', required: true, type: 'string', minLength: 1 },
    { field: 'playerId', required: true, type: 'string', minLength: 1 },
    { field: 'playerName', required: true, type: 'string', minLength: 1 },
    { field: 'action', required: true, type: 'string', minLength: 1 },
    { field: 'gamePhase', required: true, type: 'string', minLength: 1 },
    { field: 'handNumber', required: true, type: 'number', min: 1 }
  ]);

  // Record action
  const gameAction = await persistenceManager.recordGameAction(request.tableId, {
    playerId: request.playerId,
    playerName: request.playerName,
    action: request.action,
    amount: request.amount,
    gamePhase: request.gamePhase,
    handNumber: request.handNumber,
    gameStateBefore: request.gameStateBefore,
    gameStateAfter: request.gameStateAfter
  });

  return errorHandler.createSuccessResponse({
    gameAction: {
      id: gameAction.id,
      action: gameAction.action,
      playerName: gameAction.playerName,
      amount: gameAction.amount,
      timestamp: gameAction.timestamp
    },
    message: 'Game action recorded successfully'
  });
});

/**
 * Get user's active game session
 */
const getActiveSessionRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const persistenceManager = new PersistenceManager(nk, logger);

  const session = await persistenceManager.getActiveGameSession(ctx.userId);

  if (!session) {
    return errorHandler.createSuccessResponse({
      session: null,
      hasActiveSession: false
    });
  }

  // Don't expose sensitive information
  const publicSession = {
    sessionId: session.sessionId,
    tableId: session.tableId,
    seatNumber: session.seatNumber,
    chips: session.chips,
    status: session.status,
    lastActionAt: session.lastActionAt,
    disconnectedAt: session.disconnectedAt,
    reconnectionAttempts: session.reconnectionAttempts,
    isProtected: session.isProtected
  };

  return errorHandler.createSuccessResponse({
    session: publicSession,
    hasActiveSession: true
  });
});

/**
 * Get game history for table
 */
const getGameHistoryRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);
  const persistenceManager = new PersistenceManager(nk, logger);

  const { tableId, since, limit, offset } = JSON.parse(payload);
  const { limit: validLimit, offset: validOffset } = validator.validatePagination(limit, offset);

  if (!tableId) {
    throw ErrorFactory.validationError('tableId is required');
  }

  // Get actions since timestamp or all recent actions
  const sinceTimestamp = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Last 24 hours
  const actions = await persistenceManager.getMissedActions(tableId, sinceTimestamp);

  // Apply pagination
  const paginatedActions = actions.slice(validOffset, validOffset + validLimit);

  return errorHandler.createSuccessResponse({
    tableId,
    actions: paginatedActions.map(action => ({
      id: action.id,
      playerName: action.playerName,
      action: action.action,
      amount: action.amount,
      gamePhase: action.gamePhase,
      handNumber: action.handNumber,
      timestamp: action.timestamp
    })),
    total: actions.length,
    limit: validLimit,
    offset: validOffset
  });
});

/**
 * Get latest game snapshot for table
 */
const getLatestSnapshotRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const persistenceManager = new PersistenceManager(nk, logger);

  const { tableId } = JSON.parse(payload);

  if (!tableId) {
    throw ErrorFactory.validationError('tableId is required');
  }

  const snapshot = await persistenceManager.getLatestGameSnapshot(tableId);

  if (!snapshot) {
    return errorHandler.createSuccessResponse({
      snapshot: null,
      hasSnapshot: false
    });
  }

  // Return public snapshot information
  const publicSnapshot = {
    id: snapshot.id,
    timestamp: snapshot.timestamp,
    gamePhase: snapshot.gamePhase,
    handNumber: snapshot.handNumber,
    pot: snapshot.pot,
    currentBet: snapshot.currentBet,
    currentPlayerId: snapshot.currentPlayerId,
    players: snapshot.players.map(player => ({
      username: player.username,
      seatNumber: player.seatNumber,
      chips: player.chips,
      status: player.status
    }))
  };

  return errorHandler.createSuccessResponse({
    snapshot: publicSnapshot,
    hasSnapshot: true
  });
});

/**
 * Cleanup old game data (admin only)
 */
const cleanupGameDataRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const persistenceManager = new PersistenceManager(nk, logger);
  const userService = new UserManagementService(nk, logger);

  // Check admin permission
  const hasPermission = await userService.hasPermission(ctx.userId, 'system_config');
  if (!hasPermission) {
    throw ErrorFactory.authorizationError('Admin permission required for data cleanup');
  }

  const { tableId } = JSON.parse(payload);

  if (!tableId) {
    throw ErrorFactory.validationError('tableId is required');
  }

  await persistenceManager.cleanupGameData(tableId);

  return errorHandler.createSuccessResponse({
    tableId,
    message: 'Game data cleanup completed successfully'
  });
});

/**
 * Get disconnection statistics (admin only)
 */
const getDisconnectionStatsRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);
  const userService = new UserManagementService(nk, logger);

  // Check admin permission
  const hasPermission = await userService.hasPermission(ctx.userId, 'view_analytics');
  if (!hasPermission) {
    throw ErrorFactory.authorizationError('Admin permission required for disconnection statistics');
  }

  const { limit, offset } = JSON.parse(payload);
  const { limit: validLimit, offset: validOffset } = validator.validatePagination(limit, offset);

  try {
    // Get disconnection records
    const result = await nk.storageList("", "disconnection_records", validLimit * 2);
    let records = result.objects?.map(obj => obj.value) || [];

    // Sort by timestamp (newest first)
    records.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const paginatedRecords = records.slice(validOffset, validOffset + validLimit);

    // Calculate statistics
    const total = records.length;
    const reasons = records.reduce((acc: any, record: any) => {
      acc[record.reason] = (acc[record.reason] || 0) + 1;
      return acc;
    }, {});

    const last24Hours = records.filter((record: any) => 
      new Date(record.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    return errorHandler.createSuccessResponse({
      records: paginatedRecords,
      statistics: {
        total,
        last24Hours,
        reasonBreakdown: reasons
      },
      limit: validLimit,
      offset: validOffset
    });
  } catch (error) {
    throw ErrorFactory.storageError('Failed to retrieve disconnection statistics');
  }
});

// Export persistence RPC functions
module.exports = {
  createGameSessionRpc,
  handleDisconnectionRpc,
  attemptReconnectionRpc,
  createGameSnapshotRpc,
  restoreGameStateRpc,
  recordGameActionRpc,
  getActiveSessionRpc,
  getGameHistoryRpc,
  getLatestSnapshotRpc,
  cleanupGameDataRpc,
  getDisconnectionStatsRpc
};
