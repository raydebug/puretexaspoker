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

  public async init(): Promise<void> {
    await this.initializeTables();
  }

  private async initializeTables(): Promise<void> {
    try {
      // Clear existing in-memory state first
      this.tables.clear();
      this.tablePlayers.clear();
      this.tableGameStates.clear();
      console.log('TableManager: Cleared existing in-memory state');
      
      // Load actual tables from database
      const dbTables = await prisma.table.findMany();
      console.log(`TableManager: Found ${dbTables.length} tables in database`);
      
      if (dbTables.length === 0) {
        console.log('TableManager: No tables found in database, creating default tables...');
        // Create default tables if none exist
        const defaultTables = [
          {
            name: 'No Limit $0.01/$0.02 Micro Table 1',
            maxPlayers: 9,
            smallBlind: 1,
            bigBlind: 2,
            minBuyIn: 40,
            maxBuyIn: 200
          },
          {
            name: 'Pot Limit $0.25/$0.50 Low Table 1',
            maxPlayers: 9,
            smallBlind: 25,
            bigBlind: 50,
            minBuyIn: 1000,
            maxBuyIn: 5000
          },
          {
            name: 'Fixed Limit $1/$2 Medium Table 1',
            maxPlayers: 9,
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
        const newDbTables = await prisma.table.findMany();
        dbTables.push(...newDbTables);
      }
      
      // Load player seating from database
      const playerTables = await prisma.playerTable.findMany({
        include: { player: true }
      });
      console.log(`TableManager: Found ${playerTables.length} player-table associations`);
      
      // Convert database tables to TableData format
      dbTables.forEach((dbTable, index) => {
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
        
        this.tables.set(tableData.id, tableData);
        this.tablePlayers.set(tableData.id, new Map());
        this.initializeTableGameState(tableData.id);
      });
      
      // Populate tablePlayers with seated players from database
      playerTables.forEach((pt) => {
        const tableId = Number(pt.tableId);
        const playerMap = this.tablePlayers.get(tableId);
        if (playerMap) {
          playerMap.set(pt.player.nickname, { // Use nickname as key instead of UUID
            id: pt.player.nickname, // Use nickname as ID for simple matching
            nickname: pt.player.nickname,
            role: 'player', // All seated players are 'player' role
            chips: pt.buyIn
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
      
      console.log(`TableManager: Initialized with ${this.tables.size} tables from database`);
      console.log(`TableManager: Loaded ${playerTables.length} seated players from database`);
    } catch (error) {
      console.error('TableManager: Error initializing tables:', error);
      // Fallback to hardcoded tables if database fails
      const initialTables = generateInitialTables();
      console.log(`TableManager: Fallback to ${initialTables.length} hardcoded tables`);
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
    console.log(`TableManager: getAllTables() returning ${tables.length} tables`);
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
      if (tablePlayers.has(playerId)) {
        return { success: false, error: 'Already joined another table' };
      }
    }

    // Add player as observer
    players.set(nickname, { // Use nickname as key instead of UUID
      id: nickname, // Use nickname as ID for simple matching
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
    return true;
  }

  public sitDown(
    tableId: number,
    playerId: string,
    buyIn: number
  ): { success: boolean; error?: string } {
    const table = this.tables.get(tableId);
    const players = this.tablePlayers.get(tableId);

    if (!table || !players) {
      return { success: false, error: 'Table not found' };
    }

    const player = players.get(playerId);
    if (!player) {
      return { success: false, error: 'Not joined as observer' };
    }

    if (player.role === 'player') {
      return { success: false, error: 'Already seated' };
    }

    if (table.players >= table.maxPlayers) {
      return { success: false, error: 'Table is full' };
    }

    // Basic validation: just ensure buyIn is a positive number
    if (buyIn <= 0) {
      return {
        success: false,
        error: 'Buy-in must be a positive number',
      };
    }

    // Update player
    player.role = 'player';
    player.chips = buyIn;
    players.set(playerId, player);

    // Update table
    const updatedTable = { ...table };
    updatedTable.players++;
    updatedTable.observers--;
    updatedTable.status = updatedTable.players === updatedTable.maxPlayers ? 'full' : 'active';
    this.tables.set(tableId, updatedTable);

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
    players.set(playerId, player);

    // Update table
    const updatedTable = { ...table };
    updatedTable.players--;
    updatedTable.observers++;
    updatedTable.status = updatedTable.players === 0 ? 'waiting' : 'active';
    this.tables.set(tableId, updatedTable);

    return true;
  }

  public getTablePlayers(tableId: number): TablePlayer[] {
    const players = this.tablePlayers.get(tableId);
    return players ? Array.from(players.values()) : [];
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

      // Initialize game state
      const newGameState: TableGameState = {
        ...gameState,
        status: 'playing',
        phase: 'preflop',
        pot: 0,
        deck: this.deckService.createNewDeck(),
        board: [],
        players: seatedPlayers.map((p, index) => ({
          id: p.nickname, // Use nickname as ID for simple matching
          name: p.nickname,
          seatNumber: index + 1,
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
        currentPlayerId: seatedPlayers[2]?.nickname || seatedPlayers[0]?.nickname || null, // Use nickname as ID
        dealerPosition: 0,
        smallBlindPosition: 1,
        bigBlindPosition: 2,
        currentBet: table.bigBlind,
        minBet: table.bigBlind,
        handNumber: gameState.handNumber,
        cardOrderHash: cardOrderHash
      };

      // Deal cards and post blinds
      this.deckService.shuffle(newGameState.deck);
      newGameState.players.forEach(player => {
        player.cards = this.deckService.dealCards(2, newGameState.deck);
      });

      // Post blinds
      const smallBlindPlayer = newGameState.players[newGameState.smallBlindPosition];
      const bigBlindPlayer = newGameState.players[newGameState.bigBlindPosition];
      
      if (smallBlindPlayer) {
        const smallBlindAmount = Math.min(table.smallBlind, smallBlindPlayer.chips);
        smallBlindPlayer.chips -= smallBlindAmount;
        smallBlindPlayer.currentBet = smallBlindAmount;
        newGameState.pot += smallBlindAmount;
      }
      
      if (bigBlindPlayer) {
        const bigBlindAmount = Math.min(table.bigBlind, bigBlindPlayer.chips);
        bigBlindPlayer.chips -= bigBlindAmount;
        bigBlindPlayer.currentBet = bigBlindAmount;
        newGameState.pot += bigBlindAmount;
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
        // Emit only to table-based rooms (table-only architecture)
        io.to(`table:${tableId}`).emit('gameState', newGameState);
        // Also emit to all clients for debugging/fallback
        io.emit('gameState', newGameState);
        // Emit game started event to table room only
        const gameStartedData = { 
          tableId,
          gameState: newGameState,
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
      // Record action in memory (database operations removed for now)

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
    gameState.phase = nextPhase as any;
    gameState.currentBet = 0;
    gameState.minBet = 0;

    // Reset player bets
    gameState.players.forEach(p => {
      p.currentBet = 0;
    });

    // Deal community cards
    if (nextPhase === 'flop') {
      gameState.board = this.deckService.dealCards(3, gameState.deck);
    } else if (nextPhase === 'turn' || nextPhase === 'river') {
      gameState.board.push(...this.deckService.dealCards(1, gameState.deck));
    }

    // Set first to act
    const activePlayers = gameState.players.filter(p => p.isActive);
    if (activePlayers.length > 0) {
      gameState.currentPlayerId = activePlayers[0].id;
    }

    // Update memory cache (database operations removed for now)
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
}

export const tableManager = new TableManager(); 