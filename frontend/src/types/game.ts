import { Card, Player, GameState, Hand, Avatar, SidePot, ShowdownResult } from './shared';

export type { Card, Player, GameState, Hand, Avatar, SidePot, ShowdownResult };

export interface GameAction {
  type: 'bet' | 'call' | 'raise' | 'fold' | 'check';
  amount?: number;
  playerId: string;
  timestamp: number;
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

export interface PhaseInfo {
  phase: string;
  description: string;
  communityCardCount: number;
  canBet: boolean;
  canDeal: boolean;
}

export interface PlayerActionData {
  playerId: string;
  action: string;
  amount?: number;
  pot?: number;
}

export interface CommunityCardsDealtData {
  phase: string;
  prevPhase?: string;
  communityCards: Card[];
  message: string;
  winner?: string;
  handEvaluation?: string;
} 