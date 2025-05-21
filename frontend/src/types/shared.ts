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
  cards: string[];
  avatar: Avatar;
}

export interface Avatar {
  type: 'image' | 'initials';
  imageUrl?: string;
  initials?: string;
  color: string;
}

export interface GameState {
  id: string;
  players: Player[];
  pot: number;
  communityCards: string[];
  currentPlayerId: string | null;
  currentPlayerPosition: number;
  dealerPosition: number;
  status: 'waiting' | 'playing' | 'finished';
  currentBet: number;
  minBet: number;
  smallBlind: number;
  bigBlind: number;
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
} 