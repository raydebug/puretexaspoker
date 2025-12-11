export interface Player {
  id: string;
  name: string;
  chips: number;
  isAway?: boolean;
  seatNumber?: number;
  cards?: string[];
  bet?: number;
  hasFolded?: boolean;
  isAllIn?: boolean;
}

export interface GameState {
  id: string;
  players: Player[];
  pot: number;
  communityCards: string[];
  burnedCards?: string[];
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'waiting';
  minBet: number;
  currentBet: number;
  currentPlayerId: string | null;
  currentPlayerPosition: number;
  dealerPosition: number;
  status: 'waiting' | 'playing' | 'finished';
  smallBlind: number;
  bigBlind: number;
  smallBlindPosition: number;
  bigBlindPosition: number;
  isHandComplete: boolean;
  handEvaluation?: string;
  winner?: Player;
}

export interface TableData {
  id: number;
  name: string;
  maxPlayers: number;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export interface SeatState {
  [key: string]: string | null;
} 