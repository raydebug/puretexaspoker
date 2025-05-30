import { Card } from './card';

export type { Card };

export interface Player {
  id: string;
  name: string;
  seatNumber: number;
  position: number;
  chips: number;
  currentBet: number;
  isDealer: boolean;
  isAway: boolean;
  isActive: boolean;
  cards: Card[];
  avatar: Avatar;
}

export interface Avatar {
  type: 'image' | 'initials' | 'default';
  imageUrl?: string;
  initials?: string;
  color: string;
}

export interface SidePot {
  id: string;
  amount: number;
  eligiblePlayerIds: string[];
  winners?: string[];
  isResolved: boolean;
}

export interface ShowdownResult {
  playerId: string;
  playerName: string;
  hand: Hand;
  cards: Card[];
  winAmount: number;
  potType: 'main' | 'side';
  potId?: string;
}

export interface Hand {
  name: string;
  rank: number;
  cards: Card[];
  highCards?: number[];  // Kickers for tie-breaking
  detailedRank?: number; // More precise ranking
}

export interface GameState {
  id: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
  sidePots?: SidePot[];
  currentPlayerId: string | null;
  currentPlayerPosition: number;
  dealerPosition: number;
  smallBlindPosition: number;
  bigBlindPosition: number;
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';
  status: 'waiting' | 'playing' | 'finished';
  currentBet: number;
  minBet: number;
  smallBlind: number;
  bigBlind: number;
  handEvaluation?: string;
  winner?: string;
  winners?: string[]; // For split pots
  showdownResults?: ShowdownResult[];
  isHandComplete?: boolean;
} 