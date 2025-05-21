import { Card, Player, GameState, Hand, Avatar } from '../../../backend/src/types/shared';

export type { Card, Player, GameState, Hand, Avatar };

export interface GameAction {
  type: 'bet' | 'call' | 'raise' | 'fold' | 'check';
  amount?: number;
}

export interface GameSettings {
  minPlayers: number;
  maxPlayers: number;
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  timeBank: number;
  turnTime: number;
}

export interface GameStats {
  totalHands: number;
  totalPot: number;
  averagePot: number;
  biggestPot: number;
  playersJoined: number;
  playersLeft: number;
} 