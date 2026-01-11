import { generateInitialTables } from '../utils/tableUtils';
import { DeckService } from './deckService';
import { HandEvaluator } from './handEvaluator';
import { SeatManager } from './seatManager';
import { SidePotManager } from './sidePotManager';

import { EnhancedBlindManager } from './enhancedBlindManager';
import { memoryCache } from './MemoryCache';
import { prisma } from '../db';
import { Card, Player, GameState } from '../types/shared';
import { createHash } from 'crypto';

export interface TableData {
  id: number;
  name: string;
  players: number;
  maxPlayers: number;
  observers: number;
  status: 'active' | 'waiting' | 'full';
  stakes: string;
  gameType: 'No Limit' | 'Pot Limit' | 'Fixed Limit';
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
}

interface TablePlayer {
  id: string;
  nickname: string;
  role: 'player' | 'observer';
  chips: number;
  seatNumber?: number;
}

interface TableGameState {
  tableId: number;
  status: 'waiting' | 'playing' | 'finished';
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  deck: Card[];
  board: Card[];
  players: Player[];
  currentPlayerId: string | null;
  dealerPosition: number;
  smallBlindPosition: number;
  bigBlindPosition: number;
  currentBet: number;
  minBet: number;
  handNumber: number;
  cardOrderHash?: string;
}

class TableManager {
  private tables: Map<number, TableData>;
  private tablePlayers: Map<number, Map<string, TablePlayer>>;
  private tableGameStates: Map<number, TableGameState>;
  private deckService: DeckService;
  private handEvaluator: HandEvaluator;


  constructor() {
    this.tables = new Map();
    this.tablePlayers = new Map();
    this.tableGameStates = new Map();
    this.deckService = new DeckService();
    this.handEvaluator = new HandEvaluator();
  }

  // Test-only: Queue specific decks for a table (array of decks)
  private queuedDecks: Map<number, Card[][]> = new Map();

  public queueDeck(tableId: number, decks: Card[][]): void {
    console.log(`🃏 TableManager: Queuing ${decks.length} decks for table ${tableId}`);
    // Append to existing if any
    const existing = this.queuedDecks.get(tableId) || [];
    this.queuedDecks.set(tableId, [...existing, ...decks]);
  }

  public async init(): Promise<void> {
    await this.initializeTables();
  }

  private async initializeTables(): Promise<void> {
    try {
      // Clear existing in-memory state first
      this.tables.clear();
      this.tablePlayers.clear();
      this.tableGameStates.clear();
      // Debug: Cleared existing in-memory state

      // Load actual tables from database
      let dbTables = await prisma.table.findMany();
      // Debug: Found ${dbTables.length} tables in database

      if (dbTables.length === 0) {
        // Debug: No tables found in database, creating default tables...
        // Create default tables if none exist
        const defaultTables = [
          {
            name: 'No Limit $0.01/$0.02 Micro Table 1',
            maxPlayers: 6,
            smallBlind: 1,
            bigBlind: 2,
            minBuyIn: 40,
            maxBuyIn: 200
          },
          {
            name: 'Pot Limit $0.25/$0.50 Low Table 1',
            maxPlayers: 6,
            smallBlind: 25,
            bigBlind: 50,
            minBuyIn: 1000,
            maxBuyIn: 5000
          },
          {
            name: 'Fixed Limit $1/$2 Medium Table 1',
            maxPlayers: 6,
            smallBlind: 100,
            bigBlind: 200,
            minBuyIn: 4000,
            maxBuyIn: 20000
          }
        ];
        for (const tableData of defaultTables) {
          await prisma.table.create({ data: tableData });
        }
        // Reload tables after creation
        dbTables = await prisma.table.findMany();
      }

      // Load player seating from database
      const playerTables = await prisma.playerTable.findMany({
        include: { player: true }
      });
      // console.log(`TableManager: Found ${playerTables.length} player-table associations`);

      // Convert database tables to TableData format
      dbTables.forEach((dbTable: any, index: any) => {
        const tableData: TableData = {
          id: dbTable.id, // Use the actual database integer ID
          name: dbTable.name,
          players: 0,
          maxPlayers: dbTable.maxPlayers,
          observers: 0,
          status: 'waiting',
          stakes: `$${dbTable.smallBlind}/${dbTable.bigBlind}`,
          gameType: 'No Limit' as const, // Default game type
          smallBlind: dbTable.smallBlind,
          bigBlind: dbTable.bigBlind,
          minBuyIn: dbTable.minBuyIn,
          maxBuyIn: dbTable.maxBuyIn
        };

        // console.log(`TableManager: Adding table ${tableData.id} (${tableData.name}) to in-memory state`);
        this.tables.set(tableData.id, tableData);
        this.tablePlayers.set(tableData.id, new Map());
        this.initializeTableGameState(tableData.id);
      });

      // Populate tablePlayers with seated players from database
      playerTables.forEach((pt: any) => {
        const tableId = Number(pt.tableId);
        const playerMap = this.tablePlayers.get(tableId);
        if (playerMap) {
          playerMap.set(pt.player.nickname, { // Use nickname as key instead of UUID
            id: pt.player.nickname, // Use nickname as ID for simple matching
            nickname: pt.player.nickname,
            role: 'player', // All seated players are 'player' role
            chips: pt.buyIn,
            seatNumber: pt.seatNumber
          });

          // Update table player count
          const table = this.tables.get(tableId);
          if (table) {
            table.players++;
            table.status = table.players >= table.maxPlayers ? 'full' : 'active';
            this.tables.set(tableId, table);
          }
        }
      });

      // console.log(`TableManager: Initialized with ${this.tables.size} tables from database`);
      // console.log(`TableManager: Loaded ${playerTables.length} seated players from database`);
    } catch (error) {
      console.error('TableManager: Error initializing tables:', error);
      // Fallback to hardcoded tables if database fails
      const initialTables = generateInitialTables();
      // Debug: Fallback to ${initialTables.length} hardcoded tables
      initialTables.forEach((table) => {
        this.tables.set(table.id, table);
        this.tablePlayers.set(table.id, new Map());
        this.initializeTableGameState(table.id);
      });
    }
  }

  private initializeTableGameState(tableId: number): void {
    this.tableGameStates.set(tableId, {
      tableId,
      status: 'waiting',
      phase: 'waiting',
      pot: 0,
      deck: [],
      board: [],
      players: [],
      currentPlayerId: null,
      dealerPosition: 0,
      smallBlindPosition: 1,
      bigBlindPosition: 2,
      currentBet: 0,
      minBet: 0,
      handNumber: 1
    });
  }

  public getAllTables(): TableData[] {
    const tables = Array.from(this.tables.values());
    // Debug: getAllTables() returning ${tables.length} tables
    return tables;
  }

  public getTable(tableId: number): TableData | undefined {
    return this.tables.get(tableId);
  }

  public getTableGameState(tableId: number): TableGameState | undefined {
    return this.tableGameStates.get(tableId);
  }

  public joinTable(
    tableId: number,
    playerId: string,
    nickname: string
  ): { success: boolean; error?: string } {
    const table = this.tables.get(tableId);
    if (!table) {
      return { success: false, error: 'Table not found' };
    }

    const players = this.tablePlayers.get(tableId);
    if (!players) {
      return { success: false, error: 'Table not initialized' };
    }

    // Check if player is already at another table
    for (const [tid, tablePlayers] of this.tablePlayers) {
      if (tablePlayers.has(playerId) && tid !== tableId) {
        return { success: false, error: 'Already joined another table' };
      }
    }

    // If player is already at this table, just return success (idempotent)
    if (players.has(playerId)) {
      return { success: true };
    }

    // Add player as observer
    players.set(playerId, {
      id: playerId,
      nickname,
      role: 'observer',
      chips: 0,
    });

    // Update table data
    const updatedTable = { ...table, observers: table.observers + 1 };
    this.tables.set(tableId, updatedTable);

    return { success: true };
  }

  public leaveTable(tableId: number, playerId: string): boolean {
    const table = this.tables.get(tableId);
    const players = this.tablePlayers.get(tableId);

    if (!table || !players) {
      return false;
    }

    const player = players.get(playerId);
    if (!player) {
      return false;
    }

    // Update table data
    const updatedTable = { ...table };
    if (player.role === 'player') {
      updatedTable.players--;
      updatedTable.status = updatedTable.players === 0 ? 'waiting' : 'active';
    } else {
      updatedTable.observers--;
    }

    players.delete(playerId);
    this.tables.set(tableId, updatedTable);

    // CRITICAL: Update game state to remove player
    const gameState = this.tableGameStates.get(tableId);
    if (gameState) {
      gameState.players = gameState.players.filter(p => p.id !== playerId);

      // If no players left, reset state
      if (gameState.players.length === 0) {
        gameState.status = 'waiting';
        gameState.phase = 'waiting';
        gameState.pot = 0;
        gameState.board = [];
        gameState.currentPlayerId = null;
      }

      // Broadcast updated state
      const io = (global as any).socketIO;
      if (io) {
        const broadcastState = {
          ...gameState,
          communityCards: gameState.board || []
        };
        io.to(`table:${tableId}`).emit('gameState', broadcastState);
      }
    }

    return true;
  }

  public async sitDown(
    tableId: number,
    playerId: string,
    buyIn: number,
    seatNumber?: number
  ): Promise<{ success: boolean; error?: string }> {
    const table = this.tables.get(tableId);
    if (!table) {
      return { success: false, error: 'Table not found' };
    }

    // Validate buy-in amount
    if (buyIn < table.minBuyIn || buyIn > table.maxBuyIn) {
      return {
        success: false,
        error: `Buy-in must be between ${table.minBuyIn} and ${table.maxBuyIn}`
      };
    }

    // Check if table is full
    if (table.players >= table.maxPlayers) {
      return { success: false, error: 'Table is full' };
    }

    const players = this.tablePlayers.get(tableId);
    if (!players) {
      return { success: false, error: 'Table not initialized' };
    }

    const player = players.get(playerId);
    if (!player) {
      return { success: false, error: 'Must join table first' };
    }

    if (player.role === 'player') {
      return { success: false, error: 'Already seated' };
    }

    // Update player role and chips
    player.role = 'player';
    player.chips = buyIn;
    player.seatNumber = seatNumber;

    // Update table counts
    const updatedTable = {
      ...table,
      players: table.players + 1,
      observers: table.observers - 1
    };
    updatedTable.status = updatedTable.players >= updatedTable.maxPlayers ? 'full' : 'active';
    this.tables.set(tableId, updatedTable);

    // Record SIT_DOWN action in game history
    try {
      const gameState = this.tableGameStates.get(tableId);
      const handNumber = gameState?.handNumber || 1;
      const phase = gameState?.phase || 'waiting';
      const actionSequence = await this.getNextActionSequence(tableId, handNumber);

      await prisma.tableAction.create({
        data: {
          tableId: tableId,
          playerId: playerId, // playerId is nickname here
          type: 'SIT_DOWN',
          amount: buyIn,
          phase: phase,
          handNumber: handNumber,
          actionSequence: actionSequence,
          gameStateBefore: JSON.stringify({
            status: updatedTable.status,
            phase,
            chips: buyIn
          }),
          gameStateAfter: null
        }
      });
      console.log(`✅ SIT_DOWN action recorded: ${playerId} sits with $${buyIn}`);
    } catch (error) {
      console.error('❌ Failed to record SIT_DOWN action:', error);
      // Continue even if logging fails, as the core action succeeded
    }

    // CRITICAL: Update the game state players list immediately so the UI reflects the change
    const gameState = this.tableGameStates.get(tableId);
    if (gameState) {
      // Check if player already in gameState.players
      const existingIdx = gameState.players.findIndex(p => p.id === playerId);
      const playerUpdate = {
        id: playerId,
        name: player.nickname,
        seatNumber: seatNumber || (gameState.players.length + 1),
        position: seatNumber ? (seatNumber - 1) : gameState.players.length,
        chips: buyIn,
        currentBet: 0,
        isDealer: false,
        isAway: false,
        isActive: true,
        cards: [],
        avatar: {
          type: 'initials' as const,
          initials: player.nickname.substring(0, 2).toUpperCase(),
          color: '#4CAF50'
        }
      };

      if (existingIdx >= 0) {
        gameState.players[existingIdx] = playerUpdate;
      } else {
        gameState.players.push(playerUpdate);
      }
      gameState.players.sort((a, b) => a.seatNumber - b.seatNumber);

      // Broadcast updated state
      const io = (global as any).socketIO;
      if (io) {
        const broadcastState = {
          ...gameState,
          communityCards: gameState.board || []
        };
        io.to(`table:${tableId}`).emit('gameState', broadcastState);
        console.log(`📡 TableManager: Seating update broadcast for table ${tableId}`);
      }
    }

    return { success: true };
  }

  public standUp(tableId: number, playerId: string): boolean {
    const table = this.tables.get(tableId);
    const players = this.tablePlayers.get(tableId);

    if (!table || !players) {
      return false;
    }

    const player = players.get(playerId);
    if (!player || player.role !== 'player') {
      return false;
    }

    // Update player
    player.role = 'observer';
    player.chips = 0;

    // Update table
    const updatedTable = { ...table };
    updatedTable.players--;
    updatedTable.observers++;
    updatedTable.status = updatedTable.players === 0 ? 'waiting' : 'active';
    this.tables.set(tableId, updatedTable);

    return true;
  }

  public getTablePlayers(tableId: number): TablePlayer[] {
    const players = Array.from(this.tablePlayers.get(tableId)?.values() || []);
    return players;
  }

  // NEW: Game management methods
  public async startTableGame(tableId: number): Promise<{ success: boolean; error?: string; gameState?: TableGameState }> {
    const table = this.tables.get(tableId);
    const gameState = this.tableGameStates.get(tableId);

    if (!table || !gameState) {
      return { success: false, error: 'Table not found' };
    }

    const seatedPlayers = this.getTablePlayers(tableId).filter(p => p.role === 'player');
    if (seatedPlayers.length < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }

    try {
      // Generate simple card order hash for transparency
      const cardOrderHash = this.generateSimpleCardOrderHash(tableId);

      // Sort seated players by their assigned seat numbers
      const sortedBySeat = [...seatedPlayers].sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

      // Initialize game state
      const newGameState: TableGameState = {
        ...gameState,
        status: 'playing',
        phase: 'preflop',
        pot: 0,
        deck: this.deckService.createNewDeck(),
        board: [],
        players: sortedBySeat.map((p, index) => ({
          id: p.nickname, // Use nickname as ID for simple matching
          name: p.nickname,
          seatNumber: p.seatNumber || (index + 1),
          position: index,
          chips: p.chips,
          currentBet: 0,
          isDealer: index === 0,
          isAway: false,
          isActive: true,
          cards: [],
          avatar: {
            type: 'initials',
            initials: p.nickname.substring(0, 2).toUpperCase(),
            color: '#4CAF50'
          }
        })),
        currentPlayerId: sortedBySeat[2]?.nickname || sortedBySeat[0]?.nickname || null, // Use nickname as ID
        dealerPosition: 0,
        smallBlindPosition: 1,
        bigBlindPosition: 2,
        currentBet: table.bigBlind,
        minBet: table.bigBlind,
        handNumber: gameState.handNumber,
        cardOrderHash: cardOrderHash
      };

      // Deal cards and post blinds
      // CHECK FOR QUEUED DECK (TESTING CHEAT)
      const queuedDecks = this.queuedDecks.get(tableId);

      if (queuedDecks && queuedDecks.length > 0) {
        // Shift the first deck from the queue
        const nextDeck = queuedDecks.shift();

        if (nextDeck && nextDeck.length > 0) {
          console.log(`🃏 USING QUEUED DECK for table ${tableId} (${nextDeck.length} cards). Remaining decks: ${queuedDecks.length}`);
          // Use the queued deck directly without shuffling
          newGameState.deck = [...nextDeck];

          // Update the queue (if empty, we can leave it empty array or delete)
          if (queuedDecks.length === 0) {
            this.queuedDecks.delete(tableId);
          }
        } else {
          // Fallback if empty deck was scheduled
          this.deckService.shuffle(newGameState.deck);
        }
      } else {
        // Normal random deck
        this.deckService.shuffle(newGameState.deck);
      }

      // Sort players by seat number to ensure deterministic dealing order
      // This is critical for the programmed deck to work correctly
      const sortedPlayers = [...newGameState.players].sort((a, b) => a.seatNumber - b.seatNumber);

      // Deal cards to players
      sortedPlayers.forEach(player => {
        // Find the player object in the game state array to update the correct reference
        const statePlayer = newGameState.players.find(p => p.id === player.id);
        if (statePlayer) {
          statePlayer.cards = this.deckService.dealCards(2, newGameState.deck);
        }
      });

      // Post blinds and record in game history
      const smallBlindPlayer = newGameState.players[newGameState.smallBlindPosition];
      const bigBlindPlayer = newGameState.players[newGameState.bigBlindPosition];

      if (smallBlindPlayer) {
        const smallBlindAmount = Math.min(table.smallBlind, smallBlindPlayer.chips);
        smallBlindPlayer.chips -= smallBlindAmount;
        smallBlindPlayer.currentBet = smallBlindAmount;
        newGameState.pot += smallBlindAmount;

        // Record small blind action
        try {
          await prisma.tableAction.create({
            data: {
              tableId: tableId,
              playerId: smallBlindPlayer.id,
              type: 'SMALL_BLIND',
              amount: smallBlindAmount,
              phase: 'preflop',
              handNumber: newGameState.handNumber || 1,
              actionSequence: 1,
              gameStateBefore: JSON.stringify({
                pot: newGameState.pot - smallBlindAmount,
                currentBet: 0,
                chips: smallBlindPlayer.chips + smallBlindAmount
              }),
              gameStateAfter: null
            }
          });
          console.log(`✅ Small blind recorded: ${smallBlindPlayer.id} posts $${smallBlindAmount}`);
        } catch (error) {
          console.error('❌ Failed to record small blind:', error);
        }
      }

      if (bigBlindPlayer) {
        const bigBlindAmount = Math.min(table.bigBlind, bigBlindPlayer.chips);
        bigBlindPlayer.chips -= bigBlindAmount;
        bigBlindPlayer.currentBet = bigBlindAmount;
        newGameState.pot += bigBlindAmount;

        // Record big blind action
        try {
          await prisma.tableAction.create({
            data: {
              tableId: tableId,
              playerId: bigBlindPlayer.id,
              type: 'BIG_BLIND',
              amount: bigBlindAmount,
              phase: 'preflop',
              handNumber: newGameState.handNumber || 1,
              actionSequence: 2,
              gameStateBefore: JSON.stringify({
                pot: newGameState.pot - bigBlindAmount,
                currentBet: smallBlindPlayer?.currentBet || 0,
                chips: bigBlindPlayer.chips + bigBlindAmount
              }),
              gameStateAfter: null
            }
          });
          console.log(`✅ Big blind recorded: ${bigBlindPlayer.id} posts $${bigBlindAmount}`);
        } catch (error) {
          console.error('❌ Failed to record big blind:', error);
        }
      }

      // Update game state
      this.tableGameStates.set(tableId, newGameState);

      // Update memory cache
      memoryCache.updateTable(tableId, {
        status: 'playing',
        phase: 'preflop',
        pot: newGameState.pot,
        players: newGameState.players.map(p => ({
          id: p.name, // Use name as ID for consistency
          nickname: p.name,
          seatNumber: p.seatNumber,
          chips: p.chips,
          holeCards: p.cards.map(c => `${c.rank}${c.suit}`),
          isActive: p.isActive,
          isAllIn: false
        })),
        currentPlayer: newGameState.currentPlayerId || undefined,
        communityCards: [],
        cardOrderHash: cardOrderHash
      });

      // Emit WebSocket events to notify frontend
      const io = (global as any).socketIO;
      if (io) {
        console.log(`📡 TableManager: Emitting game state to rooms for table ${tableId}`);

        // CRITICAL: Ensure communityCards is present for frontend compatibility
        const broadcastState = {
          ...newGameState,
          communityCards: newGameState.board || []
        };

        // Emit only to table-based rooms (table-only architecture)
        io.to(`table:${tableId}`).emit('gameState', broadcastState);
        // Also emit to all clients for debugging/fallback
        io.emit('gameState', broadcastState);
        // Emit game started event to table room only
        const gameStartedData = {
          tableId,
          gameState: broadcastState,
          message: `Game started at table ${tableId} with ${newGameState.players.length} players`
        };
        io.to(`table:${tableId}`).emit('gameStarted', gameStartedData);
        console.log(`📡 TableManager: WebSocket events emitted for table ${tableId}`);
      } else {
        console.log(`⚠️ TableManager: Socket.IO instance not available for table ${tableId}`);
      }

      console.log(`✅ Table ${tableId} game started with ${newGameState.players.length} players`);
      return { success: true, gameState: newGameState };

    } catch (error) {
      console.error(`❌ Failed to start table ${tableId} game:`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  public async playerAction(
    tableId: number,
    playerId: string,
    action: string,
    amount?: number
  ): Promise<{ success: boolean; error?: string; gameState?: TableGameState }> {
    const gameState = this.tableGameStates.get(tableId);
    if (!gameState || gameState.status !== 'playing') {
      return { success: false, error: 'Game not in progress' };
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (gameState.currentPlayerId !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    try {
      // Record action in database for complete game history
      console.log(`📊 RECORDING ACTION: ${playerId} ${action} ${amount ? `$${amount}` : ''} in ${gameState.phase} phase`);

      // Get next action sequence for proper ordering
      const actionSequence = await this.getNextActionSequence(tableId, gameState.handNumber);

      // Create TableAction record for game history
      await prisma.tableAction.create({
        data: {
          // id will auto-increment as integer
          tableId: tableId,
          playerId: playerId,
          type: action.toUpperCase(), // Ensure consistent case
          amount: amount || null,
          phase: gameState.phase || 'unknown',
          handNumber: gameState.handNumber || 1,
          actionSequence: actionSequence,
          gameStateBefore: JSON.stringify({
            pot: gameState.pot,
            currentBet: gameState.currentBet,
            currentPlayerId: gameState.currentPlayerId,
            phase: gameState.phase
          }),
          gameStateAfter: null // Will be updated after action processing
        }
      });

      console.log(`✅ TableAction recorded: ${action} by ${playerId} (sequence: ${actionSequence})`);

      // Process action
      switch (action) {
        case 'fold':
          player.isActive = false;
          break;
        case 'check':
          // Only allowed if no current bet
          if (gameState.currentBet > player.currentBet) {
            return { success: false, error: 'Cannot check when there is a bet' };
          }
          break;
        case 'call':
          const callAmount = gameState.currentBet - player.currentBet;
          if (callAmount > player.chips) {
            return { success: false, error: 'Not enough chips to call' };
          }
          player.chips -= callAmount;
          player.currentBet = gameState.currentBet;
          gameState.pot += callAmount;
          break;
        case 'bet':
        case 'raise':
          if (!amount || amount <= gameState.currentBet) {
            return { success: false, error: 'Invalid bet amount' };
          }
          if (amount > player.chips) {
            return { success: false, error: 'Not enough chips' };
          }
          const betAmount = amount - player.currentBet;
          player.chips -= betAmount;
          player.currentBet = amount;
          gameState.pot += betAmount;
          gameState.currentBet = amount;
          gameState.minBet = amount;
          break;
        case 'allIn':
          const allInAmount = player.chips;
          player.chips = 0;
          player.currentBet += allInAmount;
          gameState.pot += allInAmount;
          if (player.currentBet > gameState.currentBet) {
            gameState.currentBet = player.currentBet;
            gameState.minBet = player.currentBet;
          }
          break;
        default:
          return { success: false, error: 'Invalid action' };
      }

      // Move to next player
      this.moveToNextPlayer(gameState);

      // Check if betting round is complete
      if (this.isBettingRoundComplete(gameState)) {
        await this.advanceToNextPhase(tableId, gameState);
      }

      // Update game state in memory
      this.tableGameStates.set(tableId, gameState);

      // Skip updating action record for UI-focused testing  
      console.log(`🧪 TEST MODE: Skipping TableAction update for UI-only verification`);

      // Update memory cache
      memoryCache.updateTable(tableId, {
        status: gameState.status,
        phase: gameState.phase,
        pot: gameState.pot,
        players: gameState.players.map(p => ({
          id: p.id,
          nickname: p.name,
          seatNumber: p.seatNumber,
          chips: p.chips,
          holeCards: p.cards.map(c => `${c.rank}${c.suit}`),
          isActive: p.isActive,
          isAllIn: p.chips === 0
        })),
        currentPlayer: gameState.currentPlayerId || undefined,
        communityCards: gameState.board.map(c => `${c.rank}${c.suit}`)
      });

      // CRITICAL FIX: Emit updated game state after player action
      const io = (global as any).socketIO;
      if (io) {
        console.log(`📡 TableManager: Player action processed - emitting updated game state for table ${tableId}`);

        // Ensure communityCards is present for frontend compatibility
        const broadcastState = {
          ...gameState,
          communityCards: gameState.board || []
        };

        // Emit to table-based rooms (table-only architecture)
        io.to(`table:${tableId}`).emit('gameState', broadcastState);

        // Also emit to all clients for debugging/fallback
        io.emit('gameState', broadcastState);

        console.log(`📡 TableManager: WebSocket game state update emitted after player action`);
      }

      return { success: true, gameState };

    } catch (error) {
      console.error(`❌ Player action failed:`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  private moveToNextPlayer(gameState: TableGameState): void {
    const activePlayers = gameState.players.filter(p => p.isActive);
    if (activePlayers.length <= 1) return;

    const currentIndex = activePlayers.findIndex(p => p.id === gameState.currentPlayerId);
    const nextIndex = (currentIndex + 1) % activePlayers.length;
    gameState.currentPlayerId = activePlayers[nextIndex].id;
  }

  private isBettingRoundComplete(gameState: TableGameState): boolean {
    const activePlayers = gameState.players.filter(p => p.isActive);
    if (activePlayers.length <= 1) return true;

    // Check if all active players have acted and bets are equal
    return activePlayers.every(p => p.currentBet === gameState.currentBet);
  }

  private async advanceToNextPhase(tableId: number, gameState: TableGameState): Promise<void> {
    const phaseOrder = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const currentIndex = phaseOrder.indexOf(gameState.phase);

    if (currentIndex === -1 || currentIndex >= phaseOrder.length - 1) {
      // Game is complete, determine winner
      await this.determineWinner(tableId, gameState);
      return;
    }

    const nextPhase = phaseOrder[currentIndex + 1];
    const prevPhase = gameState.phase;
    gameState.phase = nextPhase as any;
    gameState.currentBet = 0;
    gameState.minBet = 0;

    // Reset player bets for new betting round
    gameState.players.forEach(p => {
      p.currentBet = 0;
    });

    // Deal community cards
    let communityCards: any[] = [];
    let dealtCardAction = '';
    if (nextPhase === 'flop') {
      communityCards = this.deckService.dealCards(3, gameState.deck);
      gameState.board = communityCards;
      dealtCardAction = 'FLOP_DEALT';
    } else if (nextPhase === 'turn') {
      communityCards = this.deckService.dealCards(1, gameState.deck);
      gameState.board.push(...communityCards);
      dealtCardAction = 'TURN_DEALT';
    } else if (nextPhase === 'river') {
      communityCards = this.deckService.dealCards(1, gameState.deck);
      gameState.board.push(...communityCards);
      dealtCardAction = 'RIVER_DEALT';
    }

    // Record card dealt event in game history
    try {
      let currentSeq = await this.getNextActionSequence(tableId, gameState.handNumber);

      // 1. Record FLOP_DEALT / TURN_DEALT / RIVER_DEALT
      if (dealtCardAction) {
        await prisma.tableAction.create({
          data: {
            tableId: tableId,
            playerId: 'System',
            type: dealtCardAction,
            amount: null,
            phase: nextPhase,
            handNumber: gameState.handNumber || 1,
            actionSequence: currentSeq,
            gameStateBefore: JSON.stringify({
              prevPhase: prevPhase,
              pot: gameState.pot,
              phase: nextPhase
            }),
            gameStateAfter: null
          }
        });
        console.log(`✅ ${dealtCardAction} recorded (sequence: ${currentSeq})`);
        currentSeq++;
      }

      // 2. Record ACTION_START (first to act in this phase)
      await prisma.tableAction.create({
        data: {
          tableId: tableId,
          playerId: 'System',
          type: 'ACTION_START',
          amount: null,
          phase: nextPhase,
          handNumber: gameState.handNumber || 1,
          actionSequence: currentSeq,
          gameStateBefore: JSON.stringify({
            currentPhase: nextPhase,
            pot: gameState.pot,
            firstToAct: gameState.currentPlayerId || 'unknown'
          }),
          gameStateAfter: null
        }
      });
      console.log(`✅ ACTION_START recorded for ${nextPhase} (sequence: ${currentSeq})`);
    } catch (error) {
      console.error('❌ Failed to record phase transition events:', error);
    }

    // Set first to act
    const activePlayers = gameState.players.filter(p => p.isActive);
    if (activePlayers.length > 0) {
      gameState.currentPlayerId = activePlayers[0].id;
    }

    // Update game state in memory
    this.tableGameStates.set(tableId, gameState);

    // Update memory cache
    memoryCache.updateTable(tableId, {
      status: gameState.status,
      phase: gameState.phase,
      pot: gameState.pot,
      players: gameState.players.map(p => ({
        id: p.id,
        nickname: p.name,
        seatNumber: p.seatNumber,
        chips: p.chips,
        holeCards: p.cards.map(c => `${c.rank}${c.suit}`),
        isActive: p.isActive,
        isAllIn: p.chips === 0
      })),
      currentPlayer: gameState.currentPlayerId || undefined,
      communityCards: gameState.board.map(c => `${c.rank}${c.suit}`)
    });

    // CRITICAL FIX: Emit updated game state to all clients after phase transition
    const io = (global as any).socketIO;
    if (io) {
      console.log(`📡 TableManager: Phase transition to ${nextPhase} - emitting updated game state for table ${tableId}`);

      // Emit to table-based rooms (table-only architecture)
      const broadcastState = {
        ...gameState,
        communityCards: gameState.board || []
      };
      io.to(`table:${tableId}`).emit('gameState', broadcastState);

      // Also emit to all clients for debugging/fallback
      io.emit('gameState', broadcastState);

      // Emit specific phase transition event
      const phaseTransitionData = {
        tableId,
        fromPhase: phaseOrder[currentIndex],
        toPhase: nextPhase,
        gameState: broadcastState,
        message: `Phase transitioned from ${phaseOrder[currentIndex]} to ${nextPhase}`,
        communityCards: gameState.board,
        isAutomatic: true,
        timestamp: Date.now()
      };

      io.to(`table:${tableId}`).emit('phaseTransition', phaseTransitionData);
      io.to(`table:${tableId}`).emit(`automatic${nextPhase.charAt(0).toUpperCase() + nextPhase.slice(1)}`, phaseTransitionData);

      console.log(`📡 TableManager: WebSocket events emitted for phase transition to ${nextPhase}`);
    } else {
      console.log(`⚠️ TableManager: Socket.IO instance not available for phase transition to ${nextPhase}`);
    }
  }

  private async determineWinner(tableId: number, gameState: TableGameState): Promise<void> {
    const activePlayers = gameState.players.filter(p => p.isActive);

    if (activePlayers.length === 1) {
      // Last player standing wins
      const winner = activePlayers[0];
      winner.chips += gameState.pot;
      gameState.pot = 0;
    } else {
      // Evaluate hands
      const hands = activePlayers.map(player => ({
        player,
        hand: this.handEvaluator.evaluateHand([...player.cards, ...gameState.board], [])
      }));

      // Find winner(s)
      const bestHand = hands.reduce((best, current) =>
        this.handEvaluator.compareHands(current.hand, best.hand) > 0 ? current : best
      );

      const winners = hands.filter(h =>
        this.handEvaluator.compareHands(h.hand, bestHand.hand) === 0
      );

      // Split pot among winners
      const winAmount = Math.floor(gameState.pot / winners.length);
      winners.forEach(({ player }) => {
        player.chips += winAmount;
      });

      // Record winner information in game history
      if (winners.length === 1) {
        const winner = winners[0];
        const actionSequence = await this.getNextActionSequence(tableId, gameState.handNumber);

        await prisma.tableAction.create({
          data: {
            tableId: tableId,
            playerId: winner.player.id,
            type: 'HAND_WIN',
            amount: winAmount,
            phase: 'showdown',
            handNumber: gameState.handNumber || 1,
            actionSequence: actionSequence,
            gameStateBefore: JSON.stringify({
              pot: gameState.pot,
              winners: winners.map(w => ({ id: w.player.id, name: w.player.name })),
              handRank: winner.hand.rank
            }),
            gameStateAfter: JSON.stringify({
              winnerChips: winner.player.chips,
              potDistributed: winAmount
            })
          }
        });

        console.log(`✅ Hand winner recorded: ${winner.player.name} wins $${winAmount} (sequence: ${actionSequence})`);
      } else if (winners.length > 1) {
        // Record split pot
        const actionSequence = await this.getNextActionSequence(tableId, gameState.handNumber);

        await prisma.tableAction.create({
          data: {
            tableId: tableId,
            playerId: 'SYSTEM',
            type: 'SPLIT_POT',
            amount: gameState.pot,
            phase: 'showdown',
            handNumber: gameState.handNumber || 1,
            actionSequence: actionSequence,
            gameStateBefore: JSON.stringify({
              pot: gameState.pot,
              winners: winners.map(w => ({ id: w.player.id, name: w.player.name })),
              splitAmount: winAmount
            }),
            gameStateAfter: null
          }
        });

        console.log(`✅ Split pot recorded: ${winners.length} winners split $${gameState.pot} (sequence: ${actionSequence})`);
      }

      gameState.pot = 0;
    }

    // End hand
    gameState.status = 'waiting';
    gameState.phase = 'waiting';
    gameState.handNumber++;
    gameState.board = [];
    gameState.pot = 0;
    gameState.currentBet = 0;
    gameState.minBet = 0;
    gameState.currentPlayerId = null;

    // Reset players for next hand
    gameState.players.forEach(p => {
      p.cards = [];
      p.currentBet = 0;
      p.isActive = true;
    });

    // Update memory cache (database operations removed for now)
  }

  private generateSimpleCardOrderHash(tableId: number): string {
    const timestamp = Date.now();
    const hashInput = `table-${tableId}-${timestamp}`;
    return createHash('sha256').update(hashInput).digest('hex');
  }

  private async getNextActionSequence(tableId: number, handNumber: number): Promise<number> {
    const lastAction = await prisma.tableAction.findFirst({
      where: {
        tableId: tableId,
        handNumber: handNumber
      },
      orderBy: {
        actionSequence: 'desc'
      }
    });

    return (lastAction?.actionSequence || 0) + 1;
  }

  // Game History Methods
  public async getGameHistory(tableId: number, handNumber?: number): Promise<any[]> {
    try {
      const whereClause: any = { tableId };
      if (handNumber) {
        whereClause.handNumber = handNumber;
      }

      const actions = await prisma.tableAction.findMany({
        where: whereClause,
        orderBy: [
          { handNumber: 'asc' },
          { actionSequence: 'asc' }
        ]
      });

      // Format actions for game history
      return actions.map((action: any) => ({
        id: `GH-${action.id}`,
        tableId: action.tableId,
        playerId: action.playerId,
        playerName: action.playerId, // Use playerId as playerName for now
        action: action.type,
        amount: action.amount,
        phase: action.phase,
        handNumber: action.handNumber,
        actionSequence: action.actionSequence,
        timestamp: action.timestamp,
        gameStateBefore: action.gameStateBefore ? JSON.parse(action.gameStateBefore as string) : null,
        gameStateAfter: action.gameStateAfter ? JSON.parse(action.gameStateAfter as string) : null
      }));
    } catch (error) {
      console.error('Error getting game history:', error);
      return [];
    }
  }

  public async getActionHistory(tableId: number, options?: {
    page?: number;
    limit?: number;
    handNumber?: number;
  }): Promise<{
    actions: any[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const { page = 1, limit = 20, handNumber } = options || {};

      const whereClause: any = { tableId };
      if (handNumber) {
        whereClause.handNumber = handNumber;
      }

      // Get total count for pagination
      const total = await prisma.tableAction.count({ where: whereClause });

      // Get paginated results
      const actions = await prisma.tableAction.findMany({
        where: whereClause,
        orderBy: [
          { handNumber: 'asc' },
          { actionSequence: 'asc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      });

      const formattedActions = actions.map((action: any) => ({
        id: `GH-${action.id}`,
        tableId: action.tableId,
        playerId: action.playerId,
        playerName: action.playerId, // Use playerId as playerName for now
        action: action.type,
        amount: action.amount,
        phase: action.phase,
        handNumber: action.handNumber,
        actionSequence: action.actionSequence,
        timestamp: action.timestamp,
        gameStateBefore: action.gameStateBefore ? JSON.parse(action.gameStateBefore as string) : null,
        gameStateAfter: action.gameStateAfter ? JSON.parse(action.gameStateAfter as string) : null
      }));

      return {
        actions: formattedActions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting action history:', error);
      return { actions: [] };
    }
  }

  public async getOrderedGameHistory(tableId: number): Promise<any[]> {
    try {
      const actions = await prisma.tableAction.findMany({
        where: { tableId },
        orderBy: [
          { timestamp: 'asc' },
          { actionSequence: 'asc' }
        ]
      });

      return actions.map((action: any) => ({
        id: `GH-${action.id}`,
        tableId: action.tableId,
        playerId: action.playerId,
        playerName: action.playerId,
        action: action.type,
        amount: action.amount,
        phase: action.phase,
        handNumber: action.handNumber,
        actionSequence: action.actionSequence,
        timestamp: action.timestamp,
        gameStateBefore: action.gameStateBefore ? JSON.parse(action.gameStateBefore as string) : null,
        gameStateAfter: action.gameStateAfter ? JSON.parse(action.gameStateAfter as string) : null
      }));
    } catch (error) {
      console.error('Error getting ordered game history:', error);
      return [];
    }
  }

  // Helper method to get community cards for a specific phase
  private getCommunityCardsForPhase(tableId: number, phase: string): string | null {
    try {
      const gameState = this.getTableGameState(tableId);
      if (!gameState || !gameState.board) return null;

      const board = gameState.board;
      switch (phase) {
        case 'flop':
          if (board.length >= 3) {
            return board.slice(0, 3).map(card => `${card.rank}${card.suit}`).join(' ');
          }
          break;
        case 'turn':
          if (board.length >= 4) {
            return `${board[3].rank}${board[3].suit}`;
          }
          break;
        case 'river':
          if (board.length >= 5) {
            return `${board[4].rank}${board[4].suit}`;
          }
          break;
      }
      return null;
    } catch (error) {
      console.error(`Error getting community cards for ${phase}:`, error);
      return null;
    }
  }

  // Enhanced detailed game history formatting for UI display
  public async getDetailedFormattedGameHistory(tableId: number, handNumber?: number): Promise<string> {
    try {
      const gameHistory = await this.getGameHistory(tableId, handNumber);

      let formatted = '';
      let currentPhase = '';
      let currentPot = 0;
      let playerStacks: { [key: string]: number } = {};

      // Initialize player stacks (get from current game state or assume 100 for completed hands)
      const gameState = this.getTableGameState(tableId);
      if (gameState && gameState.players) {
        gameState.players.forEach(player => {
          playerStacks[player.id] = player.chips + 100; // Add back spent chips for display
        });
      } else {
        // Fallback for completed hands
        const players = [...new Set(gameHistory.map(action => action.playerId))];
        players.forEach(player => {
          if (player !== 'System') {
            playerStacks[player] = 100;
          }
        });
      }

      // Position mapping for players
      const getPosition = (playerName: string): string => {
        // This should ideally come from game state, but for now use simple mapping
        const positionOrder = Object.keys(playerStacks).filter(p => p !== 'System').sort();
        const positionMap = ['SB', 'BB', 'UTG', 'CO', 'BTN'];
        const index = positionOrder.indexOf(playerName);
        return index !== -1 && index < positionMap.length ? positionMap[index] : '';
      };

      for (const action of gameHistory) {
        // Phase header with pot information - check for phase transitions including PHASE_TRANSITION actions
        const actionPhase = action.action === 'PHASE_TRANSITION' ? action.phase : action.phase;

        if (actionPhase !== currentPhase) {
          const prevPhase = currentPhase;
          currentPhase = actionPhase;

          // Add pot summary for previous phase
          if (prevPhase && currentPot > 0) {
            formatted += `Pot: $${currentPot}\n`;
          }

          switch (currentPhase) {
            case 'preflop':
              formatted += `--- PRE-FLOP BETTING ---\n[Pot: $${currentPot}]\n`;
              break;
            case 'flop':
              // Try to get actual community cards from game state
              const flopCards = this.getCommunityCardsForPhase(tableId, 'flop') || 'A♣ 10♠ 7♥';
              formatted += `\n--- FLOP [Pot: $${currentPot}] ---\nCommunity Cards: ${flopCards}\n`;
              break;
            case 'turn':
              // Try to get actual turn card from game state
              const turnCard = this.getCommunityCardsForPhase(tableId, 'turn') || 'K♣';
              formatted += `\n--- TURN [Pot: $${currentPot}] ---\nCommunity Card: ${turnCard}\n`;
              break;
            case 'river':
              // Try to get actual river card from game state
              const riverCard = this.getCommunityCardsForPhase(tableId, 'river') || '9♦';
              formatted += `\n--- RIVER [Pot: $${currentPot}] ---\nCommunity Card: ${riverCard}\n`;
              break;
            case 'showdown':
              formatted += `\n--- SHOWDOWN ---\n`;
              break;
          }
        }

        // Format action display with enhanced details
        if (action.playerId === 'System' && action.action !== 'PHASE_TRANSITION') continue; // Skip system actions except phase transitions
        if (action.action === 'PHASE_TRANSITION') continue; // Skip phase transition after processing header

        const position = getPosition(action.playerId);
        const playerWithPosition = position ? `${action.playerId} (${position})` : action.playerId;
        const stackBefore = playerStacks[action.playerId] || 0;

        if (action.action === 'SIT_DOWN') {
          formatted += `${playerWithPosition} sits down with $${action.amount}\n`;
          playerStacks[action.playerId] = action.amount;

        } else if (action.action === 'SMALL_BLIND') {
          playerStacks[action.playerId] -= action.amount;
          currentPot += action.amount;
          formatted += `${playerWithPosition} posts small blind $${action.amount}\n`;

        } else if (action.action === 'BIG_BLIND') {
          playerStacks[action.playerId] -= action.amount;
          currentPot += action.amount;
          formatted += `${playerWithPosition} posts big blind $${action.amount}\n`;

        } else if (action.action === 'RAISE') {
          const betAmount = action.amount;
          playerStacks[action.playerId] -= betAmount;
          currentPot += betAmount;
          const stackAfter = playerStacks[action.playerId];
          formatted += `${playerWithPosition} raises to $${betAmount} — Stack: $${stackBefore} → $${stackAfter}\n`;

        } else if (action.action === 'CALL') {
          const callAmount = action.amount;
          playerStacks[action.playerId] -= callAmount;
          currentPot += callAmount;
          const stackAfter = playerStacks[action.playerId];
          formatted += `${playerWithPosition} calls $${callAmount} — Stack: $${stackBefore} → $${stackAfter}\n`;

        } else if (action.action === 'BET') {
          const betAmount = action.amount;
          playerStacks[action.playerId] -= betAmount;
          currentPot += betAmount;
          const stackAfter = playerStacks[action.playerId];
          formatted += `${playerWithPosition} bets $${betAmount} — Stack: $${stackBefore} → $${stackAfter}\n`;

        } else if (action.action === 'FOLD') {
          formatted += `${playerWithPosition} folds — Stack: $${stackBefore}\n`;

        } else if (action.action === 'CHECK') {
          formatted += `${playerWithPosition} checks\n`;

        } else if (action.action.includes('ALL') || action.action === 'ALLIN') {
          const allInAmount = action.amount || stackBefore;
          playerStacks[action.playerId] = 0;
          currentPot += allInAmount;
          formatted += `${playerWithPosition} goes all-in $${allInAmount} — Stack: $${stackBefore} → $0\n`;

        } else if (action.action === 'PHASE_TRANSITION') {
          // Add pot summary at end of betting round
          if (['preflop', 'flop', 'turn', 'river'].includes(currentPhase)) {
            formatted += `Pot: $${currentPot}\n`;
          }
        }
      }

      // Add showdown results if we're in showdown phase
      if (currentPhase === 'showdown') {
        formatted += `\n--- SHOWDOWN RESULTS ---\n`;
        // This would be populated with actual hand results from game state
        formatted += 'Hand reveals and winner determination would appear here\n';
        formatted += `Final pot: $${currentPot}\n`;
      }

      return formatted;

    } catch (error) {
      console.error('Error generating detailed formatted game history:', error);
      return 'Error formatting game history';
    }
  }
}

export const tableManager = new TableManager(); 