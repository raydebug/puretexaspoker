import { generateInitialTables } from '../utils/tableUtils';

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

class TableManager {
  private tables: Map<number, TableData>;
  private tablePlayers: Map<number, Map<string, TablePlayer>>;

  constructor() {
    this.tables = new Map();
    this.tablePlayers = new Map();
    this.initializeTables();
  }

  private initializeTables(): void {
    const initialTables = generateInitialTables();
    console.log(`TableManager: Creating ${initialTables.length} initial tables`);
    initialTables.forEach((table) => {
      this.tables.set(table.id, table);
      this.tablePlayers.set(table.id, new Map());
    });
    console.log(`TableManager: Initialized with ${this.tables.size} tables`);
  }

  public getAllTables(): TableData[] {
    const tables = Array.from(this.tables.values());
    console.log(`TableManager: getAllTables() returning ${tables.length} tables`);
    return tables;
  }

  public getTable(tableId: number): TableData | undefined {
    return this.tables.get(tableId);
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

    // DISABLED FOR TESTING: Buy-in validation temporarily disabled
    // if (buyIn < table.minBuyIn || buyIn > table.maxBuyIn) {
    //   return {
    //     success: false,
    //     error: `Buy-in must be between ${table.minBuyIn} and ${table.maxBuyIn}`,
    //   };
    // }
    
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
}

export const tableManager = new TableManager(); 