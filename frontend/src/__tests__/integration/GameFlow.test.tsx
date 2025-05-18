import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import GamePage from '../../pages/GamePage';
import { socketService } from '../../services/socketService';
import { GameState, Player } from '../../types/game';

// Mock socket service
jest.mock('../../services/socketService', () => ({
  socketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    getCurrentPlayer: jest.fn(),
    getGameState: jest.fn(),
    onOnlineUsersUpdate: jest.fn(),
    updatePlayerStatus: jest.fn(),
    standUp: jest.fn(),
    leaveTable: jest.fn(),
  },
}));

describe('Game Flow Integration Tests', () => {
  const mockPlayer: Player = {
    id: 'player1',
    name: 'Test Player',
    position: 0,
    seatNumber: 1,
    chips: 1000,
    currentBet: 0,
    isDealer: false,
    isAway: false,
    cards: [],
  };

  const mockGameState: GameState = {
    id: 'game1',
    players: [mockPlayer],
    communityCards: [],
    pot: 0,
    currentPlayerId: 'player1',
    phase: 'preflop',
    minBet: 10,
    currentBet: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (socketService.getCurrentPlayer as jest.Mock).mockReturnValue(mockPlayer);
    (socketService.getGameState as jest.Mock).mockReturnValue(mockGameState);
  });

  test('player can view game state and perform actions', async () => {
    render(
      <MemoryRouter>
        <GamePage />
      </MemoryRouter>
    );

    // Verify initial game state
    expect(screen.getByText('Test Player')).toBeInTheDocument();
    expect(screen.getByText('Chips: 1000')).toBeInTheDocument();

    // Test player seat interaction
    const playerSeat = screen.getByText('Test Player').closest('div');
    expect(playerSeat).toBeInTheDocument();
    
    if (playerSeat) {
      fireEvent.click(playerSeat);
      await waitFor(() => {
        expect(screen.getByText('Leave Midway')).toBeInTheDocument();
        expect(screen.getByText('Stand Up')).toBeInTheDocument();
        expect(screen.getByText('Leave Table')).toBeInTheDocument();
      });
    }
  });

  test('player can change status to away and back', async () => {
    render(
      <MemoryRouter>
        <GamePage />
      </MemoryRouter>
    );

    // Click on player seat to open menu
    const playerSeat = screen.getByText('Test Player').closest('div');
    if (playerSeat) {
      fireEvent.click(playerSeat);
      
      // Click "Leave Midway"
      const leaveButton = screen.getByText('Leave Midway');
      fireEvent.click(leaveButton);

      await waitFor(() => {
        expect(socketService.updatePlayerStatus).toHaveBeenCalledWith(
          'game1',
          'player1',
          true
        );
      });

      // Update mock player status
      const awayPlayer = { ...mockPlayer, isAway: true };
      (socketService.getCurrentPlayer as jest.Mock).mockReturnValue(awayPlayer);
      
      // Simulate status update
      act(() => {
        const mockGameStateWithAwayPlayer = {
          ...mockGameState,
          players: [awayPlayer],
        };
        (socketService.getGameState as jest.Mock).mockReturnValue(mockGameStateWithAwayPlayer);
      });

      // Verify away status is displayed
      await waitFor(() => {
        const pauseIcon = screen.getByText('⏸️');
        expect(pauseIcon).toBeInTheDocument();
      });
    }
  });

  test('player can stand up and become observer', async () => {
    render(
      <MemoryRouter>
        <GamePage />
      </MemoryRouter>
    );

    // Click on player seat to open menu
    const playerSeat = screen.getByText('Test Player').closest('div');
    if (playerSeat) {
      fireEvent.click(playerSeat);
      
      // Click "Stand Up"
      const standUpButton = screen.getByText('Stand Up');
      fireEvent.click(standUpButton);

      await waitFor(() => {
        expect(socketService.standUp).toHaveBeenCalledWith(
          'game1',
          'player1'
        );
      });
    }
  });
}); 