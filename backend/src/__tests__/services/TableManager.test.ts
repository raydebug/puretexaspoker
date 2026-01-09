import { tableManager, TableData } from '../../services/TableManager';
import { prisma } from '../../db';

describe('TableManager', () => {
  beforeEach(async () => {
    // Reset the table manager before each test
    (tableManager as any).tables.clear();
    (tableManager as any).tablePlayers.clear();

    // Clear database tables to ensure clean state - delete in correct order due to foreign keys
    await prisma.playerTable.deleteMany({});
    await prisma.table.deleteMany({});

    // Initialize tables (this will create the default 3 tables)
    await (tableManager as any).initializeTables();
  });

  describe('getAllTables', () => {
    it('returns all tables', () => {
      const tables = tableManager.getAllTables();
      expect(tables.length).toBeGreaterThan(0);
      expect(tables[0]).toHaveProperty('id');
      expect(tables[0]).toHaveProperty('name');
      expect(tables[0]).toHaveProperty('players');
      expect(tables[0]).toHaveProperty('maxPlayers');
    });
  });

  describe('joinTable', () => {
    it('allows a player to join as observer', () => {
      const tables = tableManager.getAllTables();
      const result = tableManager.joinTable(tables[0].id, 'player1', 'TestPlayer');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const updatedTable = tableManager.getTable(tables[0].id);
      expect(updatedTable?.observers).toBe(tables[0].observers + 1);
    });

    it('prevents joining multiple tables', () => {
      const tables = tableManager.getAllTables();
      expect(tables.length).toBeGreaterThanOrEqual(2); // Ensure we have at least 2 tables

      tableManager.joinTable(tables[0].id, 'player1', 'TestPlayer');
      const result = tableManager.joinTable(tables[1].id, 'player1', 'TestPlayer');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Already joined another table');
    });

    it('handles invalid table ID', () => {
      const result = tableManager.joinTable(999999, 'player1', 'TestPlayer');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Table not found');
    });
  });

  describe('sitDown', () => {
    it('allows observer to become player', async () => {
      const tables = tableManager.getAllTables();
      const table = tables[0];

      tableManager.joinTable(table.id, 'player1', 'TestPlayer');
      const result = await tableManager.sitDown(table.id, 'player1', table.minBuyIn);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const updatedTable = tableManager.getTable(table.id);
      expect(updatedTable?.players).toBe(table.players + 1);
      expect(updatedTable?.observers).toBe(table.observers);
    });

    it('prevents sitting at full table', async () => {
      const tables = tableManager.getAllTables();
      const fullTable = tables.find(t => t.status === 'full');

      if (fullTable) {
        tableManager.joinTable(fullTable.id, 'player1', 'TestPlayer');
        const result = await tableManager.sitDown(fullTable.id, 'player1', fullTable.minBuyIn);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Table is full');
      }
    });

    it('validates buy-in amount', async () => {
      const tables = tableManager.getAllTables();
      const table = tables[0];

      tableManager.joinTable(table.id, 'player1', 'TestPlayer');
      const result = await tableManager.sitDown(table.id, 'player1', table.minBuyIn - 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        `Buy-in must be between ${table.minBuyIn} and ${table.maxBuyIn}`
      );
    });
  });

  describe('standUp', () => {
    it('allows player to become observer', async () => {
      const tables = tableManager.getAllTables();
      const table = tables[0];

      tableManager.joinTable(table.id, 'player1', 'TestPlayer');
      await tableManager.sitDown(table.id, 'player1', table.minBuyIn);

      const initialPlayers = tableManager.getTable(table.id)?.players;
      const result = tableManager.standUp(table.id, 'player1');

      expect(result).toBe(true);

      const updatedTable = tableManager.getTable(table.id);
      expect(updatedTable?.players).toBe((initialPlayers || 0) - 1);
      expect(updatedTable?.observers).toBe(table.observers + 1);
    });

    it('updates table status when last player stands up', async () => {
      const tables = tableManager.getAllTables();
      const table = tables.find(t => t.players === 1);

      if (table) {
        tableManager.joinTable(table.id, 'player1', 'TestPlayer');
        await tableManager.sitDown(table.id, 'player1', table.minBuyIn);
        tableManager.standUp(table.id, 'player1');

        const updatedTable = tableManager.getTable(table.id);
        expect(updatedTable?.status).toBe('active');
      }
    });
  });

  describe('leaveTable', () => {
    it('removes player from table', async () => {
      const tables = tableManager.getAllTables();
      const table = tables[0];

      tableManager.joinTable(table.id, 'player1', 'TestPlayer');
      const result = tableManager.leaveTable(table.id, 'player1');

      expect(result).toBe(true);

      const updatedTable = tableManager.getTable(table.id);
      expect(updatedTable?.observers).toBe(table.observers);
    });

    it('updates table status when player leaves', async () => {
      const tables = tableManager.getAllTables();
      const table = tables.find(t => t.players === 1);

      if (table) {
        tableManager.joinTable(table.id, 'player1', 'TestPlayer');
        await tableManager.sitDown(table.id, 'player1', table.minBuyIn);
        tableManager.leaveTable(table.id, 'player1');

        const updatedTable = tableManager.getTable(table.id);
        expect(updatedTable?.status).toBe('active');
      }
    });
  });

  describe('getTablePlayers', () => {
    it('returns all players at table', async () => {
      const tables = tableManager.getAllTables();
      const table = tables[0];

      tableManager.joinTable(table.id, 'player1', 'TestPlayer1');
      tableManager.joinTable(table.id, 'player2', 'TestPlayer2');
      await tableManager.sitDown(table.id, 'player1', table.minBuyIn);

      const players = tableManager.getTablePlayers(table.id);
      expect(players.length).toBe(2);
      expect(players.find(p => p.role === 'player')).toBeTruthy();
      expect(players.find(p => p.role === 'observer')).toBeTruthy();
    });
  });
}); 