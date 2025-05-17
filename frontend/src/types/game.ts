export interface Card {
  rank: string;
  suit: string;
  isVisible?: boolean;
}

export interface Player {
  id: string;
  position: number;
  name: string;
  chips: number;
  currentBet: number;
  isDealer: boolean;
  cards: Card[];
}

export interface GameState {
  id: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentPlayerId: string | null;
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  minBet: number;
  currentBet: number;
}

export interface Hand {
  name: string;
  rank: number;
  cards: Card[];
} 