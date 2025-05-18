export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // Numeric value for comparison (2-14, where 14 is Ace)
}

export interface Hand {
  cards: Card[];
  rank: number; // Hand rank for comparison
  name: string; // Name of the hand (e.g., "Royal Flush", "Full House")
}

export interface Avatar {
  type: 'image' | 'initials' | 'default';
  imageUrl?: string;
  initials?: string;
  color?: string;
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
  cards: string[];
  avatar: Avatar;
}

export interface GameState {
  id: string;
  players: Player[];
  pot: number;
  communityCards: string[];
  currentPlayerId: string | null;
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
} 