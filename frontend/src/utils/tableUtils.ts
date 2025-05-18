import { TableData } from '../types/table';

/**
 * Generates the initial set of poker tables with various stakes and game types
 */
export function generateInitialTables(): TableData[] {
  const tables: TableData[] = [];
  
  // Table IDs start from 1
  let id = 1;
  
  // Generate tables for different stakes levels
  const stakesLevels = [
    { name: '$0.01/$0.02 Micro', smallBlind: 1, bigBlind: 2, minBuyIn: 40, maxBuyIn: 200 },
    { name: '$0.05/$0.10 Micro', smallBlind: 5, bigBlind: 10, minBuyIn: 200, maxBuyIn: 1000 },
    { name: '$0.10/$0.25 Low', smallBlind: 10, bigBlind: 25, minBuyIn: 500, maxBuyIn: 2500 },
    { name: '$0.25/$0.50 Low', smallBlind: 25, bigBlind: 50, minBuyIn: 1000, maxBuyIn: 5000 },
    { name: '$0.50/$1 Medium', smallBlind: 50, bigBlind: 100, minBuyIn: 2000, maxBuyIn: 10000 },
    { name: '$1/$2 Medium', smallBlind: 100, bigBlind: 200, minBuyIn: 4000, maxBuyIn: 20000 },
    { name: '$2/$5 High', smallBlind: 200, bigBlind: 500, minBuyIn: 10000, maxBuyIn: 50000 },
    { name: '$5/$10 High', smallBlind: 500, bigBlind: 1000, minBuyIn: 20000, maxBuyIn: 100000 }
  ];
  
  // Game types
  const gameTypes: ('No Limit' | 'Pot Limit' | 'Fixed Limit')[] = [
    'No Limit', 'Pot Limit', 'Fixed Limit'
  ];
  
  // Generate tables for each stakes level and game type
  stakesLevels.forEach(stakes => {
    gameTypes.forEach(gameType => {
      // Create multiple tables for each combination
      for (let i = 1; i <= 3; i++) {
        tables.push({
          id: id++,
          name: `${gameType} ${stakes.name} Table ${i}`,
          players: 0,
          maxPlayers: 9,
          observers: 0,
          status: 'waiting',
          stakes: `$${stakes.smallBlind/100}/$${stakes.bigBlind/100}`,
          gameType,
          smallBlind: stakes.smallBlind,
          bigBlind: stakes.bigBlind,
          minBuyIn: stakes.minBuyIn,
          maxBuyIn: stakes.maxBuyIn
        });
      }
    });
  });
  
  // Set some tables to have players to make the lobby look more realistic
  for (let i = 0; i < 15; i++) {
    const randomIndex = Math.floor(Math.random() * tables.length);
    const randomPlayers = Math.floor(Math.random() * 8) + 1; // 1-8 players
    
    tables[randomIndex].players = randomPlayers;
    tables[randomIndex].status = randomPlayers === 9 ? 'full' : 'active';
    
    // Add some observers too
    if (Math.random() > 0.5) {
      tables[randomIndex].observers = Math.floor(Math.random() * 5);
    }
  }
  
  return tables;
}

/**
 * Formats money amount in dollars
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount / 100);
} 