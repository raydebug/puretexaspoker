/// <reference path="../types/nakama.d.ts" />

// RPC function to create a new poker table
function createTableRpc(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  logger.info('Create table RPC called by user:', ctx.userId);
  
  try {
    const params = payload ? JSON.parse(payload) : {};
    
    const tableConfig = {
      tableId: params.tableId || `table_${Date.now()}`,
      tableName: params.tableName || `Table ${Date.now()}`,
      maxPlayers: params.maxPlayers || 6,
      stakes: params.stakes || '$1/$2',
      smallBlind: params.smallBlind || 1,
      bigBlind: params.bigBlind || 2,
      minBuyIn: params.minBuyIn || 40,
      maxBuyIn: params.maxBuyIn || 400
    };
    
    // Create a new match for the poker table
    const matchId = nk.matchCreate("poker_table", tableConfig);
    
    // Store table metadata in storage for discovery
    const tableMetadata = {
      matchId,
      ...tableConfig,
      createdBy: ctx.userId,
      createdAt: new Date().toISOString(),
      status: 'waiting',
      playerCount: 0
    };
    
    nk.storageWrite([{
      collection: "poker_tables",
      key: tableConfig.tableId,
      userId: ctx.userId,
      value: tableMetadata,
      permissionRead: 2, // Public read
      permissionWrite: 1  // Owner write
    }]);
    
    return JSON.stringify({
      success: true,
      tableId: tableConfig.tableId,
      matchId,
      message: 'Table created successfully'
    });
    
  } catch (error) {
    logger.error('Error creating table:', error);
    return JSON.stringify({
      success: false,
      error: 'Failed to create table'
    });
  }
}

// RPC function to join a poker table
function joinTableRpc(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  logger.info('Join table RPC called by user:', ctx.userId);
  
  try {
    const data = JSON.parse(payload);
    const { tableId } = data;
    
    if (!tableId) {
      return JSON.stringify({
        success: false,
        error: 'Table ID is required'
      });
    }
    
    // Get table metadata from storage
    const tableData = nk.storageRead([{
      collection: "poker_tables",
      key: tableId
    }]);
    
    if (!tableData || tableData.length === 0) {
      return JSON.stringify({
        success: false,
        error: 'Table not found'
      });
    }
    
    const table = tableData[0].value;
    const matchId = table.matchId;
    
    return JSON.stringify({
      success: true,
      matchId,
      tableInfo: table,
      message: 'Ready to join table'
    });
    
  } catch (error) {
    logger.error('Error joining table:', error);
    return JSON.stringify({
      success: false,
      error: 'Failed to join table'
    });
  }
}

// RPC function to take a seat at a poker table
function takeSeatRpc(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  logger.info('Take seat RPC called by user:', ctx.userId);
  
  try {
    const data = JSON.parse(payload);
    const { tableId, seatNumber, buyInAmount } = data;
    
    if (!tableId || seatNumber === undefined || !buyInAmount) {
      return JSON.stringify({
        success: false,
        error: 'Table ID, seat number, and buy-in amount are required'
      });
    }
    
    // Validate buy-in amount against user's wallet
    // TODO: Implement wallet validation
    
    // Get table info
    const tableData = nk.storageRead([{
      collection: "poker_tables",
      key: tableId
    }]);
    
    if (!tableData || tableData.length === 0) {
      return JSON.stringify({
        success: false,
        error: 'Table not found'
      });
    }
    
    const table = tableData[0].value;
    
    return JSON.stringify({
      success: true,
      matchId: table.matchId,
      seatNumber,
      buyInAmount,
      message: 'Seat action will be processed in match'
    });
    
  } catch (error) {
    logger.error('Error taking seat:', error);
    return JSON.stringify({
      success: false,
      error: 'Failed to take seat'
    });
  }
}

// RPC function to leave a seat
function leaveSeatRpc(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  logger.info('Leave seat RPC called by user:', ctx.userId);
  
  try {
    const data = JSON.parse(payload);
    const { tableId } = data;
    
    if (!tableId) {
      return JSON.stringify({
        success: false,
        error: 'Table ID is required'
      });
    }
    
    return JSON.stringify({
      success: true,
      message: 'Leave seat action will be processed in match'
    });
    
  } catch (error) {
    logger.error('Error leaving seat:', error);
    return JSON.stringify({
      success: false,
      error: 'Failed to leave seat'
    });
  }
}

// RPC function to start a game
function startGameRpc(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  logger.info('Start game RPC called by user:', ctx.userId);
  
  try {
    const data = JSON.parse(payload);
    const { tableId } = data;
    
    if (!tableId) {
      return JSON.stringify({
        success: false,
        error: 'Table ID is required'
      });
    }
    
    // Get table info
    const tableData = nk.storageRead([{
      collection: "poker_tables",
      key: tableId
    }]);
    
    if (!tableData || tableData.length === 0) {
      return JSON.stringify({
        success: false,
        error: 'Table not found'
      });
    }
    
    const table = tableData[0].value;
    
    // Send signal to match to start game
    const signal = JSON.stringify({ type: 'force_start_game' });
    // Note: nk.matchSignal would be called here in a real implementation
    
    return JSON.stringify({
      success: true,
      message: 'Game start signal sent'
    });
    
  } catch (error) {
    logger.error('Error starting game:', error);
    return JSON.stringify({
      success: false,
      error: 'Failed to start game'
    });
  }
}

// RPC function to perform player action
function playerActionRpc(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  logger.info('Player action RPC called by user:', ctx.userId);
  
  try {
    const data = JSON.parse(payload);
    const { tableId, action, amount } = data;
    
    if (!tableId || !action) {
      return JSON.stringify({
        success: false,
        error: 'Table ID and action are required'
      });
    }
    
    return JSON.stringify({
      success: true,
      message: 'Player action will be processed in match via socket message'
    });
    
  } catch (error) {
    logger.error('Error processing player action:', error);
    return JSON.stringify({
      success: false,
      error: 'Failed to process player action'
    });
  }
}

// RPC function to get list of available tables
function getTableListRpc(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  logger.info('Get table list RPC called by user:', ctx.userId);
  
  try {
    // Read all poker tables from storage
    const tables = nk.storageRead([{
      collection: "poker_tables",
      key: "*" // Get all tables
    }]);
    
    const tableList = tables.map(table => {
      const tableData = table.value;
      return {
        tableId: table.key,
        tableName: tableData.tableName,
        stakes: tableData.stakes,
        maxPlayers: tableData.maxPlayers,
        playerCount: tableData.playerCount || 0,
        status: tableData.status || 'waiting',
        matchId: tableData.matchId
      };
    });
    
    return JSON.stringify({
      success: true,
      tables: tableList
    });
    
  } catch (error) {
    logger.error('Error getting table list:', error);
    return JSON.stringify({
      success: false,
      error: 'Failed to get table list',
      tables: []
    });
  }
}

// RPC function to get player statistics
function getPlayerStatsRpc(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  logger.info('Get player stats RPC called by user:', ctx.userId);
  
  try {
    // Read player stats from storage
    const playerData = nk.storageRead([{
      collection: "player_stats",
      key: "profile",
      userId: ctx.userId
    }]);
    
    if (!playerData || playerData.length === 0) {
      // Return default stats if none exist
      return JSON.stringify({
        success: true,
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          totalWinnings: 0,
          totalLosses: 0,
          biggestWin: 0,
          biggestLoss: 0,
          favoritePosition: null,
          winRate: 0
        }
      });
    }
    
    const stats = playerData[0].value;
    
    return JSON.stringify({
      success: true,
      stats
    });
    
  } catch (error) {
    logger.error('Error getting player stats:', error);
    return JSON.stringify({
      success: false,
      error: 'Failed to get player stats'
    });
  }
}

// RPC function to get game history
function getGameHistoryRpc(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  logger.info('Get game history RPC called by user:', ctx.userId);
  
  try {
    const data = payload ? JSON.parse(payload) : {};
    const { tableId, limit = 50 } = data;
    
    // Read game history from storage
    let gameHistory;
    if (tableId) {
      gameHistory = nk.storageRead([{
        collection: "game_history",
        key: tableId,
        userId: ctx.userId
      }]);
    } else {
      // Get all game history for user
      gameHistory = nk.storageRead([{
        collection: "game_history",
        key: "*",
        userId: ctx.userId
      }]);
    }
    
    const history = gameHistory.map(game => {
      const gameData = game.value;
      // Add GH- prefix to ID if it exists
      if (gameData.id) {
        gameData.id = `GH-${gameData.id}`;
      }
      return gameData;
    }).slice(0, limit);
    
    return JSON.stringify({
      success: true,
      history
    });
    
  } catch (error) {
    logger.error('Error getting game history:', error);
    return JSON.stringify({
      success: false,
      error: 'Failed to get game history',
      history: []
    });
  }
}

// Export functions
module.exports = {
  createTableRpc,
  joinTableRpc,
  takeSeatRpc,
  leaveSeatRpc,
  startGameRpc,
  playerActionRpc,
  getTableListRpc,
  getPlayerStatsRpc,
  getGameHistoryRpc
}; 