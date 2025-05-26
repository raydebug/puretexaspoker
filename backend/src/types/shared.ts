export interface Card {
  rank: string;
  suit: string;
  isVisible?: boolean;
}

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

export interface GameState {
  id: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
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
  isHandComplete?: boolean;
}

export interface Hand {
  name: string;
  rank: number;
  cards: Card[];
}

export interface Avatar {
  type: 'image' | 'initials' | 'default';
  imageUrl?: string;
  initials?: string;
  color: string;
} 