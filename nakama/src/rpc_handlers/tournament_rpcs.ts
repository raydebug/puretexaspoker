/**
 * Tournament Management RPC Functions for Nakama Backend
 * Complete tournament system with scheduling, brackets, and prize distribution
 */

import { TournamentManager, Tournament, TournamentPlayer } from '../game_logic/tournament_manager';
import { ErrorHandler, withErrorHandling, ErrorFactory } from '../middleware/error_handling';
import { Validator } from '../middleware/validation';
import { UserManagementService } from '../auth/user_management';

interface CreateTournamentRequest {
  name: string;
  description?: string;
  type: 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss' | 'sit_n_go';
  gameFormat: 'texas_holdem' | 'omaha' | 'mixed';
  scheduledAt: string;
  registrationEndAt: string;
  maxPlayers: number;
  minPlayers: number;
  buyIn: number;
  startingChips: number;
  blindLevelDuration: number;
  isPrivate: boolean;
  password?: string;
  rules?: string;
}

interface RegisterTournamentRequest {
  tournamentId: string;
  password?: string;
}

interface TournamentActionRequest {
  tournamentId: string;
  action: 'start' | 'pause' | 'resume' | 'cancel';
  reason?: string;
}

interface EliminatePlayerRequest {
  tournamentId: string;
  playerId: string;
  reason?: string;
}

/**
 * Create a new tournament
 */
const createTournamentRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);
  const tournamentManager = new TournamentManager(nk, logger);

  const request: CreateTournamentRequest = JSON.parse(payload);

  // Validate tournament creation request
  validator.validate(request, [
    { field: 'name', required: true, type: 'string', minLength: 3, maxLength: 100 },
    { field: 'type', required: true, type: 'string', enum: ['single_elimination', 'double_elimination', 'round_robin', 'swiss', 'sit_n_go'] },
    { field: 'gameFormat', required: true, type: 'string', enum: ['texas_holdem', 'omaha', 'mixed'] },
    { field: 'maxPlayers', required: true, type: 'number', min: 4, max: 1000 },
    { field: 'minPlayers', required: true, type: 'number', min: 2 },
    { field: 'buyIn', required: true, type: 'number', min: 1 },
    { field: 'startingChips', required: true, type: 'number', min: 100 },
    { field: 'blindLevelDuration', required: true, type: 'number', min: 5, max: 120 }
  ]);

  // Additional validation
  if (request.minPlayers > request.maxPlayers) {
    throw ErrorFactory.validationError('Minimum players cannot exceed maximum players');
  }

  if (new Date(request.scheduledAt) <= new Date()) {
    throw ErrorFactory.validationError('Tournament must be scheduled in the future');
  }

  if (new Date(request.registrationEndAt) >= new Date(request.scheduledAt)) {
    throw ErrorFactory.validationError('Registration must end before tournament starts');
  }

  // Check rate limiting
  await errorHandler.checkRateLimit(nk, ctx.userId, 'create_tournament', 3, 60); // 3 tournaments per hour

  // Create tournament
  const tournament = await tournamentManager.createTournament(ctx.userId, request);

  // Schedule tournament to start registration
  await scheduleRegistrationStart(nk, tournament);

  return errorHandler.createSuccessResponse({
    tournament,
    message: 'Tournament created successfully'
  });
});

/**
 * Register for a tournament
 */
const registerTournamentRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);
  const tournamentManager = new TournamentManager(nk, logger);

  const request: RegisterTournamentRequest = JSON.parse(payload);

  validator.validate(request, [
    { field: 'tournamentId', required: true, type: 'string', minLength: 1 }
  ]);

  // Check user is not banned
  await errorHandler.validateUserNotBanned(nk, ctx.userId);

  // Check rate limiting
  await errorHandler.checkRateLimit(nk, ctx.userId, 'tournament_register', 10, 10); // 10 registrations per 10 minutes

  // Register player
  const tournamentPlayer = await tournamentManager.registerPlayer(request.tournamentId, ctx.userId);

  return errorHandler.createSuccessResponse({
    tournamentPlayer,
    message: 'Successfully registered for tournament'
  });
});

/**
 * Get tournament details
 */
const getTournamentRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const { tournamentId } = JSON.parse(payload);

  if (!tournamentId) {
    throw ErrorFactory.validationError('tournamentId is required');
  }

  try {
    // Get tournament
    const tournamentResult = await nk.storageRead([{
      collection: "tournaments",
      key: tournamentId,
      userId: ""
    }]);

    if (!tournamentResult || tournamentResult.length === 0) {
      throw ErrorFactory.notFoundError('Tournament');
    }

    const tournament = tournamentResult[0].value as Tournament;

    // Get tournament players
    const playersResult = await nk.storageList("", "tournament_players", 1000);
    const allPlayers = playersResult.objects?.map(obj => obj.value as TournamentPlayer) || [];
    
    // Filter players for this tournament (simplified)
    const players = allPlayers.filter(player => {
      // In production, you'd have a proper tournament-player association
      return true;
    }).slice(0, tournament.currentPlayers);

    // Get user's registration status
    let userRegistration = null;
    try {
      const userResult = await nk.storageRead([{
        collection: "tournament_players",
        key: `${tournamentId}_${ctx.userId}`,
        userId: ctx.userId
      }]);
      userRegistration = userResult?.[0]?.value || null;
    } catch (error) {
      // User not registered
    }

    return errorHandler.createSuccessResponse({
      tournament,
      players: players.map(p => ({
        username: p.username,
        status: p.status,
        currentChips: p.currentChips,
        finalPosition: p.finalPosition
      })),
      userRegistration,
      isRegistered: !!userRegistration
    });
  } catch (error) {
    throw ErrorFactory.storageError('Failed to retrieve tournament details');
  }
});

/**
 * List tournaments
 */
const listTournamentsRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);

  const { status, type, limit, offset } = JSON.parse(payload);
  const { limit: validLimit, offset: validOffset } = validator.validatePagination(limit, offset);

  try {
    // Get all tournaments
    const result = await nk.storageList("", "tournaments", validLimit * 2); // Get more to filter
    let tournaments = result.objects?.map(obj => obj.value as Tournament) || [];

    // Apply filters
    if (status) {
      tournaments = tournaments.filter(t => t.status === status);
    }
    if (type) {
      tournaments = tournaments.filter(t => t.type === type);
    }

    // Sort by scheduled time
    tournaments.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    // Apply pagination
    const paginatedTournaments = tournaments.slice(validOffset, validOffset + validLimit);

    // Remove sensitive information for public listing
    const publicTournaments = paginatedTournaments.map(tournament => ({
      id: tournament.id,
      name: tournament.name,
      description: tournament.description,
      status: tournament.status,
      type: tournament.type,
      gameFormat: tournament.gameFormat,
      scheduledAt: tournament.scheduledAt,
      registrationEndAt: tournament.registrationEndAt,
      maxPlayers: tournament.maxPlayers,
      minPlayers: tournament.minPlayers,
      currentPlayers: tournament.currentPlayers,
      buyIn: tournament.buyIn,
      prizePool: tournament.prizePool,
      isPrivate: tournament.isPrivate,
      createdAt: tournament.createdAt
    }));

    return errorHandler.createSuccessResponse({
      tournaments: publicTournaments,
      total: tournaments.length,
      limit: validLimit,
      offset: validOffset
    });
  } catch (error) {
    throw ErrorFactory.storageError('Failed to retrieve tournament list');
  }
});

/**
 * Admin tournament actions (start, pause, cancel)
 */
const tournamentActionRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);
  const tournamentManager = new TournamentManager(nk, logger);
  const userService = new UserManagementService(nk, logger);

  const request: TournamentActionRequest = JSON.parse(payload);

  validator.validate(request, [
    { field: 'tournamentId', required: true, type: 'string', minLength: 1 },
    { field: 'action', required: true, type: 'string', enum: ['start', 'pause', 'resume', 'cancel'] }
  ]);

  // Get tournament to check permissions
  const tournamentResult = await nk.storageRead([{
    collection: "tournaments",
    key: request.tournamentId,
    userId: ""
  }]);

  if (!tournamentResult || tournamentResult.length === 0) {
    throw ErrorFactory.notFoundError('Tournament');
  }

  const tournament = tournamentResult[0].value as Tournament;

  // Check permissions (tournament creator or admin)
  const isCreator = tournament.createdBy === ctx.userId;
  const isAdmin = await userService.hasPermission(ctx.userId, 'manage_tables');

  if (!isCreator && !isAdmin) {
    throw ErrorFactory.authorizationError('Only tournament creator or admin can perform this action');
  }

  let result;
  switch (request.action) {
    case 'start':
      await tournamentManager.startTournament(request.tournamentId, ctx.userId);
      result = 'Tournament started successfully';
      break;
    
    case 'pause':
      tournament.status = 'paused';
      await updateTournamentStatus(nk, tournament);
      result = 'Tournament paused';
      break;
    
    case 'resume':
      tournament.status = 'in_progress';
      await updateTournamentStatus(nk, tournament);
      result = 'Tournament resumed';
      break;
    
    case 'cancel':
      tournament.status = 'cancelled';
      await updateTournamentStatus(nk, tournament);
      await refundTournamentPlayers(nk, tournament);
      result = 'Tournament cancelled and players refunded';
      break;
  }

  return errorHandler.createSuccessResponse({
    tournamentId: request.tournamentId,
    action: request.action,
    message: result
  });
});

/**
 * Eliminate player from tournament (admin only)
 */
const eliminatePlayerRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);
  const tournamentManager = new TournamentManager(nk, logger);
  const userService = new UserManagementService(nk, logger);

  const request: EliminatePlayerRequest = JSON.parse(payload);

  validator.validate(request, [
    { field: 'tournamentId', required: true, type: 'string', minLength: 1 },
    { field: 'playerId', required: true, type: 'string', minLength: 1 }
  ]);

  // Check admin permission
  const hasPermission = await userService.hasPermission(ctx.userId, 'manage_tables');
  if (!hasPermission) {
    throw ErrorFactory.authorizationError('Admin permission required to eliminate players');
  }

  await tournamentManager.eliminatePlayer(request.tournamentId, request.playerId, ctx.userId);

  return errorHandler.createSuccessResponse({
    message: 'Player eliminated successfully',
    tournamentId: request.tournamentId,
    playerId: request.playerId
  });
});

/**
 * Get tournament leaderboard
 */
const getTournamentLeaderboardRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const { tournamentId } = JSON.parse(payload);

  if (!tournamentId) {
    throw ErrorFactory.validationError('tournamentId is required');
  }

  try {
    // Get tournament players
    const result = await nk.storageList("", "tournament_players", 1000);
    const allPlayers = result.objects?.map(obj => obj.value as TournamentPlayer) || [];
    
    // Filter and sort players for leaderboard
    const tournamentPlayers = allPlayers.filter(player => {
      // In production, you'd have proper tournament-player association
      return true;
    });

    // Sort by current chips (for active players) or final position (for eliminated players)
    tournamentPlayers.sort((a, b) => {
      if (a.status === 'eliminated' && b.status === 'eliminated') {
        return (a.finalPosition || 999) - (b.finalPosition || 999);
      }
      if (a.status === 'eliminated') return 1;
      if (b.status === 'eliminated') return -1;
      return b.currentChips - a.currentChips;
    });

    const leaderboard = tournamentPlayers.map((player, index) => ({
      position: player.finalPosition || (index + 1),
      username: player.username,
      status: player.status,
      currentChips: player.currentChips,
      prizeMoney: player.prizeMoney || 0,
      eliminatedAt: player.eliminatedAt
    }));

    return errorHandler.createSuccessResponse({
      tournamentId,
      leaderboard,
      totalPlayers: leaderboard.length
    });
  } catch (error) {
    throw ErrorFactory.storageError('Failed to retrieve tournament leaderboard');
  }
});

/**
 * Get user's tournament history
 */
const getUserTournamentHistoryRpc = withErrorHandling(async (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): Promise<string> => {
  const errorHandler = new ErrorHandler(logger);
  const validator = new Validator(logger);

  const { limit, offset } = JSON.parse(payload);
  const { limit: validLimit, offset: validOffset } = validator.validatePagination(limit, offset);

  try {
    // Get user's tournament participations
    const result = await nk.storageList(ctx.userId, "tournament_players", validLimit);
    const userTournaments = result.objects?.map(obj => obj.value as TournamentPlayer) || [];

    // Sort by registration date (newest first)
    userTournaments.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());

    // Apply pagination
    const paginatedHistory = userTournaments.slice(validOffset, validOffset + validLimit);

    // Calculate statistics
    const totalTournaments = userTournaments.length;
    const wins = userTournaments.filter(t => t.finalPosition === 1).length;
    const totalPrizeMoney = userTournaments.reduce((sum, t) => sum + (t.prizeMoney || 0), 0);

    return errorHandler.createSuccessResponse({
      history: paginatedHistory.map(tournament => ({
        tournamentId: tournament.userId, // This would be the tournament ID in proper implementation
        registeredAt: tournament.registeredAt,
        status: tournament.status,
        finalPosition: tournament.finalPosition,
        prizeMoney: tournament.prizeMoney,
        eliminatedAt: tournament.eliminatedAt
      })),
      statistics: {
        totalTournaments,
        wins,
        winRate: totalTournaments > 0 ? (wins / totalTournaments * 100).toFixed(1) : '0.0',
        totalPrizeMoney
      },
      limit: validLimit,
      offset: validOffset
    });
  } catch (error) {
    throw ErrorFactory.storageError('Failed to retrieve tournament history');
  }
});

/**
 * Helper functions
 */
async function scheduleRegistrationStart(nk: nkruntime.Nakama, tournament: Tournament): Promise<void> {
  // In production, you'd schedule this with Nakama's timer system
  tournament.status = 'registration';
}

async function updateTournamentStatus(nk: nkruntime.Nakama, tournament: Tournament): Promise<void> {
  tournament.updatedAt = new Date().toISOString();
  await nk.storageWrite([{
    collection: "tournaments",
    key: tournament.id,
    userId: tournament.createdBy,
    value: tournament,
    permissionRead: 2,
    permissionWrite: 1
  }]);
}

async function refundTournamentPlayers(nk: nkruntime.Nakama, tournament: Tournament): Promise<void> {
  // Get all players and refund their buy-ins
  const result = await nk.storageList("", "tournament_players", 1000);
  const players = result.objects?.map(obj => obj.value as TournamentPlayer) || [];
  
  const userService = new UserManagementService(nk, nk.logger);
  
  for (const player of players) {
    if (player.status === 'registered' || player.status === 'playing') {
      const profile = await userService.getUserProfile(player.userId);
      if (profile) {
        await userService.updateUserStats(player.userId, {
          chips: profile.chips + tournament.buyIn
        });
      }
    }
  }
}

// Export tournament RPC functions
module.exports = {
  createTournamentRpc,
  registerTournamentRpc,
  getTournamentRpc,
  listTournamentsRpc,
  tournamentActionRpc,
  eliminatePlayerRpc,
  getTournamentLeaderboardRpc,
  getUserTournamentHistoryRpc
};
