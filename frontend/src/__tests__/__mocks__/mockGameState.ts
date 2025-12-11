import { GameState } from '../../types/shared';

export const mockGameState = {
  id: '1',
  players: [
    {
      id: 'player1',
      name: 'Test Player',
      seatNumber: 0,
      position: 0,
      chips: 1000,
      currentBet: 0,
      isDealer: false,
      isAway: false,
      isActive: true,
      cards: [],
      avatar: { type: 'initials', initials: 'TP', color: '#000' }
    }
  ],
  communityCards: [],
  pot: 0,
  currentPlayerId: null,
  currentPlayerPosition: 0,
  dealerPosition: 0,
  status: 'waiting',
  phase: 'waiting' as const,
  minBet: 10,
  currentBet: 0,
  smallBlind: 5,
  bigBlind: 10
};

describe('Mock Game State', () => {
  it('should have the correct structure', () => {
    expect(mockGameState).toHaveProperty('id');
    expect(mockGameState).toHaveProperty('players');
    expect(mockGameState).toHaveProperty('communityCards');
    expect(mockGameState).toHaveProperty('pot');
    expect(mockGameState).toHaveProperty('currentPlayerId');
    expect(mockGameState).toHaveProperty('currentPlayerPosition');
    expect(mockGameState).toHaveProperty('dealerPosition');
    expect(mockGameState).toHaveProperty('status');
    expect(mockGameState).toHaveProperty('phase');
    expect(mockGameState).toHaveProperty('minBet');
    expect(mockGameState).toHaveProperty('currentBet');
    expect(mockGameState).toHaveProperty('smallBlind');
    expect(mockGameState).toHaveProperty('bigBlind');
  });

  it('should have a valid player structure', () => {
    const player = mockGameState.players[0];
    expect(player).toHaveProperty('id');
    expect(player).toHaveProperty('name');
    expect(player).toHaveProperty('seatNumber');
    expect(player).toHaveProperty('position');
    expect(player).toHaveProperty('chips');
    expect(player).toHaveProperty('currentBet');
    expect(player).toHaveProperty('isDealer');
    expect(player).toHaveProperty('isAway');
    expect(player).toHaveProperty('isActive');
    expect(player).toHaveProperty('cards');
    expect(player).toHaveProperty('avatar');
  });

  it('should have valid initial values', () => {
    expect(mockGameState.id).toBe('1');
    expect(mockGameState.pot).toBe(0);
    expect(mockGameState.currentPlayerId).toBeNull();
    expect(mockGameState.status).toBe('waiting');
    expect(mockGameState.phase).toBe('waiting');
    expect(mockGameState.minBet).toBe(10);
    expect(mockGameState.smallBlind).toBe(5);
    expect(mockGameState.bigBlind).toBe(10);
  });
}); 