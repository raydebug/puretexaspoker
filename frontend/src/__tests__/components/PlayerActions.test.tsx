import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerActions from '../../components/PlayerActions';

describe('PlayerActions Component', () => {
  const mockOnAction = jest.fn();
  
  const dummyGameState = {
    phase: 'betting',
    currentPlayerId: 'player1',
    currentBet: 10,
    minBet: 5,
    players: [
      { id: 'player1', chips: 100, name: 'Player1' },
      { id: 'player2', chips: 80, name: 'Player2' },
      { id: 'player3', chips: 120, name: 'Player3' }
    ]
  };

  const dummyGameStateNoBet = {
    phase: 'betting',
    currentPlayerId: 'player1',
    currentBet: 0,
    minBet: 5,
    players: [
      { id: 'player1', chips: 100, name: 'Player1' },
      { id: 'player2', chips: 80, name: 'Player2' },
      { id: 'player3', chips: 120, name: 'Player3' }
    ]
  };

  beforeEach(() => {
    mockOnAction.mockClear();
  });

  describe('Test Mode Rendering', () => {
    it('should render action buttons in test mode with dummy data', () => {
      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={dummyGameState}
          onAction={mockOnAction}
          isTestMode={true}
        />
      );

      // Check that test mode debug info is displayed
      expect(screen.getByText('🧪 TEST MODE - Action Buttons (Debug)')).toBeInTheDocument();
      expect(screen.getByText('Debug Info:')).toBeInTheDocument();
      // Use flexible matcher for debug lines
      expect(screen.getByText(/Current Player:/)).toBeInTheDocument();
      expect(screen.getByText(/Current Player ID:/)).toBeInTheDocument();
      expect(screen.getByText(/Game Phase:/)).toBeInTheDocument();
      expect(screen.getByText(/Is Current Player:/)).toBeInTheDocument();
      expect(screen.getByText(/Players Count:/)).toBeInTheDocument();

      // Check that all action buttons are rendered
      expect(screen.getByTestId('raise-button')).toBeInTheDocument();
      expect(screen.getByTestId('call-button')).toBeInTheDocument();
      expect(screen.getByTestId('fold-button')).toBeInTheDocument();
      expect(screen.getByTestId('check-button')).toBeInTheDocument();
      expect(screen.getByTestId('bet-button')).toBeInTheDocument();

      // Check button text
      expect(screen.getByText('Raise to $6')).toBeInTheDocument();
      expect(screen.getByText('Call $6')).toBeInTheDocument();
      expect(screen.getByText('Fold')).toBeInTheDocument();
      expect(screen.getByText('Check')).toBeInTheDocument();
    });

    it('should handle action button clicks in test mode', () => {
      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={dummyGameState}
          onAction={mockOnAction}
          isTestMode={true}
        />
      );

      // Test raise button click
      fireEvent.click(screen.getByTestId('raise-button'));
      expect(mockOnAction).toHaveBeenCalledWith('raise', 6);

      // Test call button click
      fireEvent.click(screen.getByTestId('call-button'));
      expect(mockOnAction).toHaveBeenCalledWith('call', 6);

      // Test fold button click
      fireEvent.click(screen.getByTestId('fold-button'));
      expect(mockOnAction).toHaveBeenCalledWith('fold');

      // Test check button click
      fireEvent.click(screen.getByTestId('check-button'));
      expect(mockOnAction).toHaveBeenCalledWith('check');
    });

    it('should handle custom bet amount in test mode', () => {
      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={dummyGameState}
          onAction={mockOnAction}
          isTestMode={true}
        />
      );

      const betInput = screen.getByPlaceholderText('Bet amount');
      const betButton = screen.getByTestId('bet-button');

      // Set bet amount
      fireEvent.change(betInput, { target: { value: '25' } });
      expect(betInput).toHaveValue(25);

      // Click bet button
      fireEvent.click(betButton);
      expect(mockOnAction).toHaveBeenCalledWith('bet', 25);
    });
  });

  describe('Normal Mode Rendering', () => {
    it('should render action buttons for current player with current bet', () => {
      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={dummyGameState}
          onAction={mockOnAction}
          isTestMode={false}
        />
      );

      // Should show action container
      expect(screen.getByTestId('player-actions')).toBeInTheDocument();
      expect(screen.getByText('Your Turn - Choose Action')).toBeInTheDocument();

      // Should show call and fold buttons when there's a current bet
      expect(screen.getByTestId('call-button')).toBeInTheDocument();
      expect(screen.getByText('Call $10')).toBeInTheDocument();
      expect(screen.getByTestId('fold-button')).toBeInTheDocument();
      expect(screen.getByText('Fold')).toBeInTheDocument();

      // Should show betting controls
      expect(screen.getByTestId('bet-button')).toBeInTheDocument();
      expect(screen.getByTestId('allin-button')).toBeInTheDocument();
      expect(screen.getByText('All In ($100)')).toBeInTheDocument();
    });

    it('should render check/fold buttons when no current bet', () => {
      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={dummyGameStateNoBet}
          onAction={mockOnAction}
          isTestMode={false}
        />
      );

      // Should show check and fold buttons when no current bet
      expect(screen.getByTestId('check-button')).toBeInTheDocument();
      expect(screen.getByText('Check')).toBeInTheDocument();
      expect(screen.getByTestId('fold-button')).toBeInTheDocument();
      expect(screen.getByText('Fold')).toBeInTheDocument();
    });

    it('should not render actions for non-current player', () => {
      const { container } = render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player2" // Different player
          gameState={dummyGameState}
          onAction={mockOnAction}
          isTestMode={false}
        />
      );

      // Should not render any action buttons
      expect(container.firstChild).toBeNull();
    });

    it('should handle action button clicks in normal mode', () => {
      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={dummyGameState}
          onAction={mockOnAction}
          isTestMode={false}
        />
      );

      // Test call button click
      fireEvent.click(screen.getByTestId('call-button'));
      expect(mockOnAction).toHaveBeenCalledWith('call', 10);

      // Test fold button click
      fireEvent.click(screen.getByTestId('fold-button'));
      expect(mockOnAction).toHaveBeenCalledWith('fold');

      // Test all-in button click
      fireEvent.click(screen.getByTestId('allin-button'));
      expect(mockOnAction).toHaveBeenCalledWith('allIn');
    });

    it('should handle custom bet amount in normal mode', () => {
      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={dummyGameState}
          onAction={mockOnAction}
          isTestMode={false}
        />
      );

      const betInput = screen.getByPlaceholderText('Min bet: $5');
      const betButton = screen.getByTestId('bet-button');

      // Set valid bet amount
      fireEvent.change(betInput, { target: { value: '25' } });
      expect(betInput).toHaveValue(25);

      // Click bet button
      fireEvent.click(betButton);
      expect(mockOnAction).toHaveBeenCalledWith('bet', 25);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined props gracefully', () => {
      render(
        <PlayerActions
          currentPlayer={null}
          currentPlayerId={null}
          gameState={null}
          onAction={mockOnAction}
          isTestMode={false}
        />
      );

      // Should not render anything in normal mode with null props
      expect(screen.queryByTestId('player-actions')).not.toBeInTheDocument();
    });

    it('should handle empty game state', () => {
      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={{}}
          onAction={mockOnAction}
          isTestMode={false}
        />
      );

      // Should still render basic structure
      expect(screen.getByTestId('player-actions')).toBeInTheDocument();
      expect(screen.getByText('Your Turn - Choose Action')).toBeInTheDocument();
    });

    it('should handle missing players array', () => {
      const gameStateWithoutPlayers = {
        phase: 'betting',
        currentPlayerId: 'player1',
        currentBet: 0,
        minBet: 5
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameStateWithoutPlayers}
          onAction={mockOnAction}
          isTestMode={false}
        />
      );

      // Should still render basic structure
      expect(screen.getByTestId('player-actions')).toBeInTheDocument();
    });
  });
}); 