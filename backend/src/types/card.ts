export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Value = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

// Re-export types from shared.ts to maintain backwards compatibility
export { Card, Hand, Player, GameState, Avatar } from './shared'; 