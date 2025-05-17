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

export interface Player {
  id: string;
  name: string;
  chips: number;
  hand: Card[];
  isActive: boolean;
  isDealer: boolean;
  currentBet: number;
  position: number; // Position at the table (0-8)
}

export interface GameState {
  id: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  dealerPosition: number;
  currentPlayerPosition: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  status: 'waiting' | 'playing' | 'finished';
  smallBlind: number;
  bigBlind: number;
} 