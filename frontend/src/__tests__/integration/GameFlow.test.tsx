import '@testing-library/jest-dom';
import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { Game } from '../../components/Game';
import { socketService } from '../../services/socketService';
import { cookieService } from '../../services/cookieService';
import { soundService } from '../../services/soundService';
import { theme } from '../../styles/theme';
import { mockGameState } from '../__mocks__/mockGameState';

jest.mock('../../services/socketService', () => ({
  socketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    getGameState: jest.fn(),
    getCurrentPlayer: jest.fn(),
    setCurrentPlayer: jest.fn(),
    onGameState: jest.fn(() => jest.fn()), // Return cleanup function
    onError: jest.fn(() => jest.fn()), // Return cleanup function
    onSeatUpdate: jest.fn(),
    onSeatError: jest.fn(),
    onOnlineUsersUpdate: jest.fn(),
    onChatMessage: jest.fn(() => jest.fn()), // Return cleanup function
    onSystemMessage: jest.fn(() => jest.fn()), // Return cleanup function
    offChatMessage: jest.fn(),
    offSystemMessage: jest.fn(),
    updatePlayerStatus: jest.fn(),
    standUp: jest.fn(),
    joinAsObserver: jest.fn(),
    requestSeat: jest.fn(),
    placeBet: jest.fn(),
    check: jest.fn(),
    fold: jest.fn(),
    leaveTable: jest.fn(),
    getSocket: jest.fn(() => ({
      connected: true,
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    }))
  }
}));

jest.mock('../../services/cookieService');
jest.mock('../../services/soundService', () => ({
  play: jest.fn(),
  init: jest.fn(),
  setVolume: jest.fn()
}));

describe('Game Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cookieService.getNickname as jest.Mock).mockReturnValue('Test Player');
    (cookieService.getSeatNumber as jest.Mock).mockReturnValue('0');

    // Mock socket connection status
    (socketService.getSocket as jest.Mock).mockReturnValue({
      connected: true,
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    });

    // Set up initial game state
    const initialGameState = {
      ...mockGameState,
      players: [mockGameState.players[0]],
      status: 'active'
    };

    // Mock game state and player immediately
    (socketService.getGameState as jest.Mock).mockReturnValue(initialGameState);
    (socketService.getCurrentPlayer as jest.Mock).mockReturnValue(initialGameState.players[0]);

    // Set up onGameState callback to return cleanup function
    (socketService.onGameState as jest.Mock).mockImplementation((callback) => {
      callback(initialGameState);
      return jest.fn(); // Return cleanup function
    });

    // Mock other socket event handlers
    (socketService.onError as jest.Mock).mockImplementation(() => () => { });
    (socketService.onSeatUpdate as jest.Mock).mockImplementation(() => () => { });
    (socketService.onSeatError as jest.Mock).mockImplementation(() => () => { });
    (socketService.onOnlineUsersUpdate as jest.Mock).mockImplementation(() => () => { });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          {ui}
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  it('player can view game state and perform actions', async () => {
    const { container } = render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <Game />
        </ThemeProvider>
      </MemoryRouter>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(socketService.connect).toHaveBeenCalled();
    });

    // Get game state callback
    const gameStateCallback = (socketService.onGameState as jest.Mock).mock.calls[0][0];

    // Update game state
    await act(async () => {
      gameStateCallback(mockGameState);
    });

    // Verify game state is displayed
    expect(screen.getByText(mockGameState.players[0].name)).toBeInTheDocument();
    expect(container.querySelector(`[data-is-me="true"]`)).toBeInTheDocument();
  });

  it('player can change status to away and back', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <Game />
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(socketService.connect).toHaveBeenCalled();
    });

    const gameStateCallback = (socketService.onGameState as jest.Mock).mock.calls[0][0];
    await act(async () => {
      gameStateCallback(mockGameState);
    });

    // Find and click the player seat
    const playerSeat = screen.getByText(mockGameState.players[0].name).closest('[data-is-me="true"]');
    expect(playerSeat).toBeInTheDocument();

    if (playerSeat) {
      await act(async () => {
        fireEvent.click(playerSeat);
      });
    }

    // Find and click "Leave Midway" option
    const leaveButton = screen.getByText('Leave Midway');
    await act(async () => {
      fireEvent.click(leaveButton);
    });

    // Simulate the player becoming away
    const awayGameState = {
      ...mockGameState,
      players: [{ ...mockGameState.players[0], isAway: true }]
    };

    await act(async () => {
      gameStateCallback(awayGameState);
    });

    // Verify away status using data attribute
    const awaySeat = screen.getByText(mockGameState.players[0].name).closest('[data-away="true"]');
    expect(awaySeat).toBeInTheDocument();
  });

  it('player can stand up and become observer', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <Game />
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(socketService.connect).toHaveBeenCalled();
    });

    const gameStateCallback = (socketService.onGameState as jest.Mock).mock.calls[0][0];
    await act(async () => {
      gameStateCallback(mockGameState);
    });

    // Find and click the player seat
    const playerSeat = screen.getByText(mockGameState.players[0].name).closest('[data-is-me="true"]');
    expect(playerSeat).toBeInTheDocument();

    if (playerSeat) {
      await act(async () => {
        fireEvent.click(playerSeat);
      });
    }

    // Find and click "Stand Up" option
    const standUpButton = screen.getByText('Stand Up');
    await act(async () => {
      fireEvent.click(standUpButton);
    });

    // Verify player becomes observer
    expect(socketService.standUp).toHaveBeenCalled();
  });
}); 