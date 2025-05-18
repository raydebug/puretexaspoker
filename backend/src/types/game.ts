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
  phase: 'waiting' | 'betting' | 'showdown' | 'finished';
} 