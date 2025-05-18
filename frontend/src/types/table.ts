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