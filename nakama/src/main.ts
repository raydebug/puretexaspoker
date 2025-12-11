function InitModule(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
  logger.info('Pure Texas Poker Nakama Server - Initializing...');

  // Register authentication hooks
  initializer.registerBeforeAuthenticateDevice(beforeAuthenticateDevice);
  initializer.registerBeforeAuthenticateEmail(beforeAuthenticateEmail);
  initializer.registerBeforeAuthenticateCustom(beforeAuthenticateCustom);
  initializer.registerAfterAuthenticateDevice(afterAuthenticate);
  initializer.registerAfterAuthenticateEmail(afterAuthenticate);
  initializer.registerAfterAuthenticateCustom(afterAuthenticate);

  // Register match handler for poker tables
  const pokerModule = require('./match_handlers/poker_table');
  initializer.registerMatch("poker_table", {
    matchInit: pokerModule.pokerTableInit,
    matchJoinAttempt: pokerModule.pokerTableJoinAttempt,
    matchJoin: pokerModule.pokerTableJoin,
    matchLeave: pokerModule.pokerTableLeave,
    matchLoop: pokerModule.pokerTableLoop,
    matchSignal: pokerModule.pokerTableSignal,
    matchTerminate: pokerModule.pokerTableTerminate
  });

  // Register RPC functions
  const rpcModule = require('./rpc_handlers/table_rpcs');
  initializer.registerRpc("create_table", rpcModule.createTableRpc);
  initializer.registerRpc("join_table", rpcModule.joinTableRpc);
  initializer.registerRpc("take_seat", rpcModule.takeSeatRpc);
  initializer.registerRpc("leave_seat", rpcModule.leaveSeatRpc);
  initializer.registerRpc("start_game", rpcModule.startGameRpc);
  initializer.registerRpc("player_action", rpcModule.playerActionRpc);
  initializer.registerRpc("get_table_list", rpcModule.getTableListRpc);
  initializer.registerRpc("get_player_stats", rpcModule.getPlayerStatsRpc);
  initializer.registerRpc("get_game_history", rpcModule.getGameHistoryRpc);

  // Register authentication and user management RPCs
  const authModule = require('./rpc_handlers/auth_rpcs');
  initializer.registerRpc("register_user", authModule.registerUserRpc);
  initializer.registerRpc("get_user_profile", authModule.getUserProfileRpc);
  initializer.registerRpc("update_user_profile", authModule.updateUserProfileRpc);
  initializer.registerRpc("check_permission", authModule.checkPermissionRpc);
  initializer.registerRpc("assign_role", authModule.assignRoleRpc);
  initializer.registerRpc("ban_user", authModule.banUserRpc);
  initializer.registerRpc("unban_user", authModule.unbanUserRpc);
  initializer.registerRpc("get_user_list", authModule.getUserListRpc);
  initializer.registerRpc("initialize_roles", authModule.initializeRolesRpc);

  // Register comprehensive testing RPCs (test_ prefixed for BDD testing)
  const testModule = require('./rpc_handlers/test_rpcs');
  initializer.registerRpc("test_create_mock_game", testModule.testCreateMockGameRpc);
  initializer.registerRpc("test_get_mock_game", testModule.testGetMockGameRpc);
  initializer.registerRpc("test_update_mock_game", testModule.testUpdateMockGameRpc);
  initializer.registerRpc("test_player_action", testModule.testPlayerActionRpc);
  initializer.registerRpc("test_advance_phase", testModule.testAdvancePhaseRpc);
  initializer.registerRpc("test_take_seat", testModule.testTakeSeatRpc);
  initializer.registerRpc("test_start_game", testModule.testStartGameRpc);
  initializer.registerRpc("test_cleanup_games", testModule.testCleanupGamesRpc);
  initializer.registerRpc("test_get_game_history", testModule.testGetGameHistoryRpc);

  // Register enhanced role management RPCs
  const enhancedRoleModule = require('./rpc_handlers/enhanced_role_rpcs');
  initializer.registerRpc("initialize_enhanced_roles", enhancedRoleModule.initializeEnhancedRolesRpc);
  initializer.registerRpc("execute_moderation", enhancedRoleModule.executeModerationRpc);
  initializer.registerRpc("assign_role_enhanced", enhancedRoleModule.assignRoleEnhancedRpc);
  initializer.registerRpc("check_moderation_permission", enhancedRoleModule.checkModerationPermissionRpc);
  initializer.registerRpc("get_role_hierarchy", enhancedRoleModule.getRoleHierarchyRpc);
  initializer.registerRpc("get_moderation_history", enhancedRoleModule.getModerationHistoryRpc);
  initializer.registerRpc("get_role_assignment_history", enhancedRoleModule.getRoleAssignmentHistoryRpc);
  initializer.registerRpc("get_user_moderation_status", enhancedRoleModule.getUserModerationStatusRpc);
  initializer.registerRpc("bulk_role_operations", enhancedRoleModule.bulkRoleOperationsRpc);

  // Register tournament management RPCs
  const tournamentModule = require('./rpc_handlers/tournament_rpcs');
  initializer.registerRpc("create_tournament", tournamentModule.createTournamentRpc);
  initializer.registerRpc("register_tournament", tournamentModule.registerTournamentRpc);
  initializer.registerRpc("get_tournament", tournamentModule.getTournamentRpc);
  initializer.registerRpc("list_tournaments", tournamentModule.listTournamentsRpc);
  initializer.registerRpc("tournament_action", tournamentModule.tournamentActionRpc);
  initializer.registerRpc("eliminate_player", tournamentModule.eliminatePlayerRpc);
  initializer.registerRpc("get_tournament_leaderboard", tournamentModule.getTournamentLeaderboardRpc);
  initializer.registerRpc("get_user_tournament_history", tournamentModule.getUserTournamentHistoryRpc);

  // Register game persistence and reconnection RPCs
  const persistenceModule = require('./rpc_handlers/persistence_rpcs');
  initializer.registerRpc("create_game_session", persistenceModule.createGameSessionRpc);
  initializer.registerRpc("handle_disconnection", persistenceModule.handleDisconnectionRpc);
  initializer.registerRpc("attempt_reconnection", persistenceModule.attemptReconnectionRpc);
  initializer.registerRpc("create_game_snapshot", persistenceModule.createGameSnapshotRpc);
  initializer.registerRpc("restore_game_state", persistenceModule.restoreGameStateRpc);
  initializer.registerRpc("record_game_action", persistenceModule.recordGameActionRpc);
  initializer.registerRpc("get_active_session", persistenceModule.getActiveSessionRpc);
  initializer.registerRpc("get_game_history", persistenceModule.getGameHistoryRpc);
  initializer.registerRpc("get_latest_snapshot", persistenceModule.getLatestSnapshotRpc);
  initializer.registerRpc("cleanup_game_data", persistenceModule.cleanupGameDataRpc);
  initializer.registerRpc("get_disconnection_stats", persistenceModule.getDisconnectionStatsRpc);

  logger.info('Pure Texas Poker Nakama Server - Initialization complete');
}

// Authentication Hooks
function beforeAuthenticateDevice(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.AuthenticateDeviceRequest): nkruntime.AuthenticateDeviceRequest {
  logger.info('Before authenticate device:', data.account?.id);
  return data;
}

function beforeAuthenticateEmail(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.AuthenticateEmailRequest): nkruntime.AuthenticateEmailRequest {
  logger.info('Before authenticate email:', data.account?.email);
  return data;
}

function beforeAuthenticateCustom(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.AuthenticateCustomRequest): nkruntime.AuthenticateCustomRequest {
  logger.info('Before authenticate custom:', data.account?.id);
  return data;
}

function afterAuthenticate(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.Session, request: any): void {
  logger.info('User authenticated:', data.user_id);
  
  // Import user management service
  const { UserManagementService } = require('./auth/user_management');
  const userService = new UserManagementService(nk, logger);
  
  try {
    // Check if ban has expired first
    userService.checkBanExpiration(data.user_id);
    
    // Create or update user profile with enhanced role system
    const metadata = {
      email: request.email,
      displayName: request.displayName || data.username
    };
    
    userService.createOrUpdateUserProfile(data, metadata);
    
    // Initialize player stats for backward compatibility
    const playerStats = {
      user_id: data.user_id,
      username: data.username,
      gamesPlayed: 0,
      gamesWon: 0,
      totalWinnings: 0,
      totalLosses: 0,
      biggestWin: 0,
      biggestLoss: 0,
      favoritePosition: null,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    nk.storageWrite([{
      collection: "player_stats",
      key: "profile",
      userId: data.user_id,
      value: playerStats,
      version: "*"
    }]);
    
    logger.info(`User ${data.username} authenticated successfully with enhanced profile`);
  } catch (error) {
    logger.error('Failed to initialize enhanced user profile:', error);
    // Fall back to basic initialization
    try {
      const basicStats = {
        user_id: data.user_id,
        username: data.username,
        gamesPlayed: 0,
        gamesWon: 0,
        lastLogin: new Date().toISOString()
      };
      
      nk.storageWrite([{
        collection: "player_stats",
        key: "profile", 
        userId: data.user_id,
        value: basicStats,
        version: "*"
      }]);
    } catch (fallbackError) {
      logger.error('Failed to initialize basic player stats:', fallbackError);
    }
  }
}

// Storage Filters
function filterPlayerStats(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.StorageData[]): nkruntime.StorageData[] {
  return data.filter(item => item.collection === "player_stats");
}

function filterGameHistory(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.StorageData[]): nkruntime.StorageData[] {
  return data.filter(item => item.collection === "game_history");
}

// Import will be handled by require() calls within the registration functions 