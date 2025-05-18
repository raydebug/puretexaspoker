import { TableData } from '../types/table';

const STAKES_LEVELS = [
  { small: 0.01, big: 0.02 },
  { small: 0.02, big: 0.05 },
  { small: 0.05, big: 0.10 },
  { small: 0.10, big: 0.25 },
  { small: 0.25, big: 0.50 },
  { small: 0.50, big: 1.00 }
];

const GAME_TYPES = ['No Limit', 'Pot Limit', 'Fixed Limit'] as const;
const TABLE_SIZES = [6, 9];

export const generateDevTables = (): TableData[] => {
  const tables: TableData[] = [];
  let id = 1;

  // Generate 2 tables for each combination of stakes and game type
  STAKES_LEVELS.forEach(({ small, big }) => {
    GAME_TYPES.forEach(gameType => {
      // Create one 6-max and one 9-max table for each combination
      TABLE_SIZES.forEach(maxPlayers => {
        tables.push({
          id,
          name: `Table ${id}`,
          players: 0, // All tables start empty
          maxPlayers,
          observers: 0, // No observers initially
          status: 'waiting', // All tables start in waiting status
          stakes: `$${small.toFixed(2)}/$${big.toFixed(2)}`,
          gameType,
          smallBlind: small,
          bigBlind: big,
          minBuyIn: big * 40, // Standard min buy-in (40 big blinds)
          maxBuyIn: big * 100 // Standard max buy-in (100 big blinds)
        });
        id++; // Increment id after using it
      });
    });
  });

  return tables;
}; 