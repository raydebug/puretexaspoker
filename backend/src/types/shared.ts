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
  // ENHANCED BLIND SYSTEM: Late entry and dead blind tracking
  handsPlayed?: number;
  missedBlinds?: number;
  hasPostedDeadBlind?: boolean;
  joinedHandNumber?: number;
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

// ENHANCED BLIND SYSTEM: Blind schedule configuration for tournaments
export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante?: number;
  duration: number; // Duration in minutes
}

export interface BlindSchedule {
  id: string;
  name: string;
  type: 'tournament' | 'cash' | 'sit-and-go';
  levels: BlindLevel[];
  startingLevel: number;
  isBreakAfterLevel?: number[];
  breakDuration?: number; // Break duration in minutes
}

// ENHANCED BLIND SYSTEM: Dead blind tracking and late entry rules
export interface DeadBlindInfo {
  playerId: string;
  blindType: 'small' | 'big' | 'both';
  amount: number;
  handNumber: number;
  reason: 'seat_change' | 'missed_blind' | 'late_entry';
}

export interface GameState {
  id: string;
  players: Player[];
  communityCards: Card[];
  burnedCards?: Card[];
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
  
  // ENHANCED BLIND SYSTEM: Advanced blind management
  blindSchedule?: BlindSchedule;
  currentBlindLevel?: number;
  blindLevelStartTime?: number;
  handNumber?: number;
  deadBlinds?: DeadBlindInfo[];
  ante?: number;
  isOnBreak?: boolean;
  breakEndTime?: number;
  lateEntryDeadline?: number;
}

export interface Hand {
  name: string;
  rank: number;
  cards: Card[];
  highCards?: number[];  // Kickers for tie-breaking
  detailedRank?: number; // More precise ranking
}

export interface Avatar {
  type: 'image' | 'initials' | 'default';
  imageUrl?: string;
  initials?: string;
  color: string;
} 