import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { OnlineList } from '../../components/OnlineList';
import { Player } from '../../types/game';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '../../styles/theme';

describe('Online Users Integration Tests', () => {
  const mockPlayers: Player[] = [
    {
      id: 'player1',
      name: 'Active Player',
      position: 0,
      seatNumber: 0,
      chips: 1000,
      currentBet: 0,
      isDealer: false,
      isAway: false,
      isActive: true,
      avatar: { type: 'initials', initials: 'AP', color: '#000' },
      cards: [],
    },
    {
      id: 'player2',
      name: 'Away Player',
      position: 1,
      seatNumber: 1,
      chips: 1000,
      currentBet: 0,
      isDealer: false,
      isAway: true,
      isActive: true,
      avatar: { type: 'initials', initials: 'AW', color: '#000' },
      cards: [],
    },
  ];

  const mockObservers = ['Observer 1', 'Observer 2'];

  test('displays both players and observers correctly', () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <OnlineList
            players={mockPlayers}
            observers={mockObservers}
            currentPlayerId="player1"
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    // Check players section with exact text match
    const playersTitle = screen.getByText(/^Players/, { exact: false });
    expect(playersTitle).toBeInTheDocument();
    expect(playersTitle.textContent).toBe('Players (2)');
    
    // Check player names and seats using data-testid
    const playerItems = screen.getAllByRole('listitem');
    const playerTexts = playerItems.map(item => item.textContent);
    expect(playerTexts.some(text => text?.includes('Active Player') && text?.includes('Seat 1'))).toBe(true);
    expect(playerTexts.some(text => text?.includes('Away Player') && text?.includes('Seat 2'))).toBe(true);
    
    // Check status indicators
    expect(screen.getByText('(You)')).toBeInTheDocument();
    expect(screen.getByText('(Away)')).toBeInTheDocument();

    // Check observers section with exact text match
    const observersTitle = screen.getByText(/^Observers/, { exact: false });
    expect(observersTitle).toBeInTheDocument();
    expect(observersTitle.textContent).toBe('Observers (2)');
    expect(screen.getByText('Observer 1')).toBeInTheDocument();
    expect(screen.getByText('Observer 2')).toBeInTheDocument();
  });

  test('highlights current player correctly', () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <OnlineList
            players={mockPlayers}
            observers={mockObservers}
            currentPlayerId="player1"
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    const playerItems = screen.getAllByRole('listitem');
    const currentPlayerItem = playerItems.find(item => 
      item.textContent?.includes('Active Player') && 
      item.textContent?.includes('Seat 1')
    );
    expect(currentPlayerItem).toBeTruthy();
    expect(currentPlayerItem).toHaveStyle({
      backgroundColor: 'rgba(76, 175, 80, 0.2)',
      color: '#ffd700',
    });
  });

  test('shows away status indicator for away players', () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <OnlineList
            players={mockPlayers}
            observers={mockObservers}
            currentPlayerId="player1"
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    const playerItems = screen.getAllByRole('listitem');
    const awayPlayerItem = playerItems.find(item => 
      item.textContent?.includes('Away Player') && 
      item.textContent?.includes('Seat 2')
    );
    expect(awayPlayerItem).toBeTruthy();
    expect(awayPlayerItem).toHaveStyle({
      opacity: '0.6',
    });
    expect(screen.getByText('(Away)')).toBeInTheDocument();
  });

  test('updates when players change status', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <OnlineList
            players={mockPlayers}
            observers={mockObservers}
            currentPlayerId="player1"
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    // Initially, Active Player is not away
    const playerItems = screen.getAllByRole('listitem');
    const initialPlayerItem = playerItems.find(item => 
      item.textContent?.includes('Active Player') && 
      item.textContent?.includes('Seat 1')
    );
    expect(initialPlayerItem).toBeTruthy();
    expect(initialPlayerItem).not.toHaveStyle({ opacity: '0.6' });
    
    // Update player status
    const updatedPlayers = mockPlayers.map(player =>
      player.id === 'player1' ? { ...player, isAway: true } : player
    );

    // Rerender with updated players
    rerender(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <OnlineList
            players={updatedPlayers}
            observers={mockObservers}
            currentPlayerId="player1"
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    // Check if the status is updated
    const updatedPlayerItems = screen.getAllByRole('listitem');
    const updatedPlayerItem = updatedPlayerItems.find(item => 
      item.textContent?.includes('Active Player') && 
      item.textContent?.includes('Seat 1')
    );
    expect(updatedPlayerItem).toBeTruthy();
    expect(updatedPlayerItem).toHaveStyle({ opacity: '0.6' });
    expect(screen.getAllByText('(Away)')).toHaveLength(2);
  });

  test('handles empty observers list', () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <OnlineList
            players={mockPlayers}
            observers={[]}
            currentPlayerId="player1"
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    const observersTitle = screen.getByText(/^Observers/, { exact: false });
    expect(observersTitle).toBeInTheDocument();
    expect(observersTitle.textContent).toBe('Observers (0)');
    expect(screen.queryByText('Observer 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Observer 2')).not.toBeInTheDocument();
  });

  test('handles empty players list', () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <OnlineList
            players={[]}
            observers={mockObservers}
            currentPlayerId="player1"
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    const playersTitle = screen.getByText(/^Players/, { exact: false });
    expect(playersTitle).toBeInTheDocument();
    expect(playersTitle.textContent).toBe('Players (0)');
    expect(screen.queryByText(/Active Player/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Away Player/)).not.toBeInTheDocument();
    expect(screen.getByText('No players seated')).toBeInTheDocument();
  });
}); 