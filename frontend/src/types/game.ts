export interface Card {
  rank: string;
  suit: string;
  isVisible?: boolean;
}

export interface Avatar {
  type: 'image' | 'initials' | 'default';
  imageUrl?: string;
  initials?: string;
  color?: string;
}

export interface Player {
  id: string;
  position: number;
  seatNumber: number;
  name: string;
  chips: number;
  currentBet: number;
  isDealer: boolean;
  isAway: boolean;
  cards: Card[];
  avatar: Avatar;
}

export interface GameState {
  id: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentPlayerId: string | null;
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  minBet: number;
  currentBet: number;
}

export interface Hand {
  name: string;
  rank: number;
  cards: Card[];
} 