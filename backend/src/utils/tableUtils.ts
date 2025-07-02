import { TableData } from '../services/TableManager';

/**
 * Generates a simplified set of 3 poker tables for monitoring
 */
export function generateInitialTables(): TableData[] {
  const tables: TableData[] = [
    {
      id: 1,
      name: 'No Limit $0.01/$0.02 Micro Table 1',
      players: 0,
      maxPlayers: 9,
      observers: 0,
      status: 'waiting',
      stakes: '$0.01/$0.02',
      gameType: 'No Limit',
      smallBlind: 1,
      bigBlind: 2,
      minBuyIn: 40,
      maxBuyIn: 200
    },
    {
      id: 2,
      name: 'Pot Limit $0.25/$0.50 Low Table 1',
      players: 0,
      maxPlayers: 9,
      observers: 0,
      status: 'waiting',
      stakes: '$0.25/$0.50',
      gameType: 'Pot Limit',
      smallBlind: 25,
      bigBlind: 50,
      minBuyIn: 1000,
      maxBuyIn: 5000
    },
    {
      id: 3,
      name: 'Fixed Limit $1/$2 Medium Table 1',
      players: 0,
      maxPlayers: 9,
      observers: 0,
      status: 'waiting',
      stakes: '$1/$2',
      gameType: 'Fixed Limit',
      smallBlind: 100,
      bigBlind: 200,
      minBuyIn: 4000,
      maxBuyIn: 20000
    }
  ];
  
  return tables;
} 