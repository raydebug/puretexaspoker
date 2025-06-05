export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Value = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Avatar = 'default' | 'player1' | 'player2' | 'player3' | 'player4' | 'player5' | 'player6' | 'player7' | 'player8' | 'player9';

export interface Card {
  rank: string;
  suit: string;
  isVisible?: boolean;
}

export interface Hand {
  name: string;
  rank: number;
  cards: Card[];
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  isActive: boolean;
  isDealer: boolean;
  currentBet: number;
  position: number;
  seatNumber: number;
  isAway: boolean;
  cards: Card[];
  hand: Card[];
  avatar: Avatar;
}

export interface GameState {
  id: string;
  players: Player[];
  communityCards: Card[];
  burnedCards?: Card[];
  pot: number;
  currentBet: number;
  dealerPosition: number;
  currentPlayerPosition: number;
  currentPlayerId: string | null;
  phase: 'preflop' | 'flop' | 'turn' | 'river';
  status: 'waiting' | 'playing' | 'finished';
  smallBlind: number;
  bigBlind: number;
} 