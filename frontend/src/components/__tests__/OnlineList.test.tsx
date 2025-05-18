import React from 'react';
import { render, screen } from '@testing-library/react';
import { OnlineList } from '../OnlineList';
import { Player } from '../../types/game';

describe('OnlineList', () => {
  const mockPlayers: Player[] = [
    {
      id: '1',
      name: 'Player 1',
      seatNumber: 0,
      position: 0,
      chips: 1000,
      currentBet: 0,
      isDealer: false,
      isAway: false,
      cards: []
    },
    {
      id: '2',
      name: 'Player 2',
      seatNumber: 1,
      position: 1,
      chips: 1000,
      currentBet: 0,
      isDealer: false,
      isAway: false,
      cards: []
    }
  ];

  const mockObservers = ['Observer 1', 'Observer 2'];

  it('renders both players and observers sections', () => {
    render(
      <OnlineList
        players={mockPlayers}
        observers={mockObservers}
        currentPlayerId="1"
      />
    );

    // Check section titles
    expect(screen.getByText('Players (2)')).toBeInTheDocument();
    expect(screen.getByText('Observers (2)')).toBeInTheDocument();
  });

  it('displays player names with seat numbers', () => {
    render(
      <OnlineList
        players={mockPlayers}
        observers={mockObservers}
        currentPlayerId="1"
      />
    );

    // Check player entries
    expect(screen.getByText('Player 1 - Seat 1')).toBeInTheDocument();
    expect(screen.getByText('Player 2 - Seat 2')).toBeInTheDocument();
  });

  it('displays observer names', () => {
    render(
      <OnlineList
        players={mockPlayers}
        observers={mockObservers}
        currentPlayerId="1"
      />
    );

    // Check observer entries
    expect(screen.getByText('Observer 1')).toBeInTheDocument();
    expect(screen.getByText('Observer 2')).toBeInTheDocument();
  });

  it('highlights current user', () => {
    const { container } = render(
      <OnlineList
        players={mockPlayers}
        observers={mockObservers}
        currentPlayerId="1"
      />
    );

    // Find all user items
    const userItems = container.querySelectorAll('li');
    
    // Check that the current user's item has the highlight color
    const currentUserItem = Array.from(userItems).find(
      item => item.textContent === 'Player 1 - Seat 1'
    );
    expect(currentUserItem).toHaveStyle({ color: '#ffd700' });

    // Check that other items don't have the highlight color
    const otherUserItem = Array.from(userItems).find(
      item => item.textContent === 'Player 2 - Seat 2'
    );
    expect(otherUserItem).toHaveStyle({ color: 'white' });
  });

  it('handles empty lists gracefully', () => {
    render(
      <OnlineList
        players={[]}
        observers={[]}
        currentPlayerId="1"
      />
    );

    expect(screen.getByText('Players (0)')).toBeInTheDocument();
    expect(screen.getByText('Observers (0)')).toBeInTheDocument();
  });

  it('shows "You" indicator for current player', () => {
    render(
      <OnlineList
        players={mockPlayers}
        observers={mockObservers}
        currentPlayerId="1"
      />
    );

    expect(screen.getByText('(You)')).toBeInTheDocument();
  });

  it('shows "Away" indicator for away players', () => {
    const playersWithAway = mockPlayers.map(p => 
      p.id === '1' ? { ...p, isAway: true } : p
    );

    render(
      <OnlineList
        players={playersWithAway}
        observers={mockObservers}
        currentPlayerId="1"
      />
    );

    expect(screen.getByText('(Away)')).toBeInTheDocument();
    const awayPlayerItem = screen.getByText('Player 1 - Seat 1').closest('li');
    expect(awayPlayerItem).toHaveStyle({ opacity: '0.6' });
  });
}); 