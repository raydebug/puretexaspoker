import React from 'react';
import { render, screen } from '@testing-library/react';
import { OnlineList } from '../../components/OnlineList';
import { Player } from '../../types/game';

describe('Online Users Integration Tests', () => {
  const mockPlayers: Player[] = [
    {
      id: 'player1',
      name: 'Active Player',
      position: 0,
      seatNumber: 1,
      chips: 1000,
      currentBet: 0,
      isDealer: false,
      isAway: false,
      cards: [],
    },
    {
      id: 'player2',
      name: 'Away Player',
      position: 1,
      seatNumber: 2,
      chips: 1000,
      currentBet: 0,
      isDealer: false,
      isAway: true,
      cards: [],
    },
  ];

  const mockObservers = ['Observer 1', 'Observer 2'];

  test('displays both players and observers correctly', () => {
    render(
      <OnlineList
        players={mockPlayers}
        observers={mockObservers}
        currentPlayerId="player1"
      />
    );

    // Check players section
    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.getByText(/Active Player \(Seat 2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Away Player \(Seat 3\)/)).toBeInTheDocument();
    expect(screen.getByText('(You)')).toBeInTheDocument();
    expect(screen.getByText('(Away)')).toBeInTheDocument();

    // Check observers section
    expect(screen.getByText('Observers')).toBeInTheDocument();
    expect(screen.getByText('Observer 1')).toBeInTheDocument();
    expect(screen.getByText('Observer 2')).toBeInTheDocument();
  });

  test('highlights current player correctly', () => {
    render(
      <OnlineList
        players={mockPlayers}
        observers={mockObservers}
        currentPlayerId="player1"
      />
    );

    const currentPlayerElement = screen.getByText(/Active Player \(Seat 2\)/).closest('li');
    expect(currentPlayerElement).toHaveStyle({
      backgroundColor: 'rgba(76, 175, 80, 0.2)',
      color: '#ffd700',
    });
  });

  test('shows away status indicator for away players', () => {
    render(
      <OnlineList
        players={mockPlayers}
        observers={mockObservers}
        currentPlayerId="player1"
      />
    );

    const awayPlayerElement = screen.getByText(/Away Player \(Seat 3\)/).closest('li');
    expect(awayPlayerElement).toHaveStyle({
      opacity: '0.6',
    });
    expect(screen.getByText('(Away)')).toBeInTheDocument();
  });

  test('updates when players change status', async () => {
    const { rerender } = render(
      <OnlineList
        players={mockPlayers}
        observers={mockObservers}
        currentPlayerId="player1"
      />
    );

    // Initially, Active Player is not away
    const initialPlayerElement = screen.getByText(/Active Player \(Seat 2\)/).closest('li');
    expect(initialPlayerElement).not.toHaveStyle({ opacity: '0.6' });
    
    // Update player status
    const updatedPlayers = mockPlayers.map(player =>
      player.id === 'player1' ? { ...player, isAway: true } : player
    );

    // Rerender with updated players
    rerender(
      <OnlineList
        players={updatedPlayers}
        observers={mockObservers}
        currentPlayerId="player1"
      />
    );

    // Check if the status is updated
    const updatedPlayerElement = screen.getByText(/Active Player \(Seat 2\)/).closest('li');
    expect(updatedPlayerElement).toHaveStyle({ opacity: '0.6' });
    expect(screen.getAllByText('(Away)')).toHaveLength(2);
  });

  test('handles empty observers list', () => {
    render(
      <OnlineList
        players={mockPlayers}
        observers={[]}
        currentPlayerId="player1"
      />
    );

    expect(screen.getByText('Observers')).toBeInTheDocument();
    expect(screen.queryByText('Observer 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Observer 2')).not.toBeInTheDocument();
  });

  test('handles empty players list', () => {
    render(
      <OnlineList
        players={[]}
        observers={mockObservers}
        currentPlayerId="player1"
      />
    );

    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.queryByText(/Active Player/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Away Player/)).not.toBeInTheDocument();
    expect(screen.getByText('No players seated')).toBeInTheDocument();
  });

  test('shows current player status correctly', () => {
    render(
      <OnlineList
        players={mockPlayers}
        observers={mockObservers}
        currentPlayerId="player1"
      />
    );

    const currentPlayerElement = screen.getByText(/Active Player \(Seat 2\)/).closest('li');
    expect(currentPlayerElement).toHaveStyle({
      backgroundColor: 'rgba(76, 175, 80, 0.2)',
      color: '#ffd700',
    });
    expect(screen.getByText('(You)')).toBeInTheDocument();
  });
}); 