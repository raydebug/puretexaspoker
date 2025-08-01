import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerActions from '../../components/PlayerActions';

describe('PlayerActions Component - Button Visibility and States', () => {
  const mockOnAction = jest.fn();
  
  beforeEach(() => {
    mockOnAction.mockClear();
  });

  describe('Component Visibility', () => {
    it('should render action buttons only for current player', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByTestId('player-actions')).toBeInTheDocument();
      expect(screen.getByText('Your Turn')).toBeInTheDocument();
    });

    it('should not render actions for non-current player', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      const { container } = render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player2" // Different player
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when currentPlayer is null', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      const { container } = render(
        <PlayerActions
          currentPlayer={null}
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when currentPlayerId is null', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      const { container } = render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId={null}
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Check vs Call Button Logic', () => {
    it('should show Check button when no bet to call', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByTestId('check-button')).toBeInTheDocument();
      expect(screen.getByText('Check')).toBeInTheDocument();
      expect(screen.queryByTestId('call-button')).not.toBeInTheDocument();
    });

    it('should show Call button when there is a bet to call', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 20,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByTestId('call-button')).toBeInTheDocument();
      expect(screen.getByText('Call $20')).toBeInTheDocument();
      expect(screen.queryByTestId('check-button')).not.toBeInTheDocument();
    });

    it('should show Call button when player has partial bet', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 20,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 10 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByTestId('call-button')).toBeInTheDocument();
      expect(screen.getByText('Call $10')).toBeInTheDocument(); // Difference between currentBet and playerCurrentBet
    });
  });

  describe('Button Active/Inactive States', () => {
    it('should activate Check button when allowed', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const checkButton = screen.getByTestId('check-button');
      expect(checkButton).toBeInTheDocument();
      expect(checkButton).not.toBeDisabled();
    });

    it('should activate Call button when player has enough chips', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 20,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const callButton = screen.getByTestId('call-button');
      expect(callButton).toBeInTheDocument();
      expect(callButton).not.toBeDisabled();
    });

    it('should deactivate Call button when player has insufficient chips', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 200, // More than player chips
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const callButton = screen.getByTestId('call-button');
      expect(callButton).toBeInTheDocument();
      // Check if button has disabled styling by checking computed styles or attributes
      expect(callButton).toHaveStyle('cursor: not-allowed');
    });

    it('should always activate Fold button', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const foldButton = screen.getByTestId('fold-button');
      expect(foldButton).toBeInTheDocument();
      expect(foldButton).not.toBeDisabled();
    });

    it('should always activate All In button', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const allinButton = screen.getByTestId('allin-button');
      expect(allinButton).toBeInTheDocument();
      expect(allinButton).not.toBeDisabled();
      expect(screen.getByText('All In ($100)')).toBeInTheDocument();
    });
  });

  describe('Bet vs Raise Button Logic', () => {
    it('should show Bet button when no current bet exists', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      // Set bet amount first
      const betInput = screen.getByTestId('bet-amount-input');
      fireEvent.change(betInput, { target: { value: '25' } });

      expect(screen.getByTestId('bet-button')).toBeInTheDocument();
      expect(screen.getByText('Bet $25')).toBeInTheDocument();
      expect(screen.queryByTestId('raise-button')).not.toBeInTheDocument();
    });

    it('should show Raise button when current bet exists', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 20,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      // Set raise amount
      const betInput = screen.getByTestId('bet-amount-input');
      fireEvent.change(betInput, { target: { value: '50' } });

      expect(screen.getByTestId('raise-button')).toBeInTheDocument();
      expect(screen.getByText('Raise to $50')).toBeInTheDocument();
      expect(screen.queryByTestId('bet-button')).not.toBeInTheDocument();
    });

    it('should activate Bet button with valid amount', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const betInput = screen.getByTestId('bet-amount-input');
      fireEvent.change(betInput, { target: { value: '25' } });

      const betButton = screen.getByTestId('bet-button');
      expect(betButton).not.toBeDisabled();
      expect(betButton).toHaveStyle('cursor: pointer');
    });

    it('should deactivate Bet button with invalid amount (too low)', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const betInput = screen.getByTestId('bet-amount-input');
      fireEvent.change(betInput, { target: { value: '2' } }); // Below minBet

      const betButton = screen.getByTestId('bet-button');
      expect(betButton).toHaveStyle('cursor: not-allowed');
    });

    it('should deactivate Bet button with invalid amount (too high)', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const betInput = screen.getByTestId('bet-amount-input');
      fireEvent.change(betInput, { target: { value: '150' } }); // Above player chips

      const betButton = screen.getByTestId('bet-button');
      expect(betButton).toHaveStyle('cursor: not-allowed');
    });

    it('should activate Raise button with valid amount', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 20,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const betInput = screen.getByTestId('bet-amount-input');
      fireEvent.change(betInput, { target: { value: '50' } }); // Valid raise amount

      const raiseButton = screen.getByTestId('raise-button');
      expect(raiseButton).not.toBeDisabled();
      expect(raiseButton).toHaveStyle('cursor: pointer');
    });

    it('should deactivate Raise button with insufficient raise amount', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 20,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const betInput = screen.getByTestId('bet-amount-input');
      fireEvent.change(betInput, { target: { value: '22' } }); // Below minimum raise (currentBet + minBet = 25)

      const raiseButton = screen.getByTestId('raise-button');
      expect(raiseButton).toHaveStyle('cursor: not-allowed');
    });
  });

  describe('Button Color Variants', () => {
    it('should apply correct color variant to Check button', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const checkButton = screen.getByTestId('check-button');
      expect(checkButton).toHaveStyle('background-color: #28a745'); // Green for check
    });

    it('should apply correct color variant to Call button', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 20,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const callButton = screen.getByTestId('call-button');
      expect(callButton).toHaveStyle('background-color: #28a745'); // Green for call
    });

    it('should apply correct color variant to Fold button', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const foldButton = screen.getByTestId('fold-button');
      expect(foldButton).toHaveStyle('background-color: #dc3545'); // Red for fold
    });

    it('should apply correct color variant to Bet button', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const betInput = screen.getByTestId('bet-amount-input');
      fireEvent.change(betInput, { target: { value: '25' } });

      const betButton = screen.getByTestId('bet-button');
      expect(betButton).toHaveStyle('background-color: #007bff'); // Blue for bet
    });

    it('should apply correct color variant to Raise button', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 20,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const betInput = screen.getByTestId('bet-amount-input');
      fireEvent.change(betInput, { target: { value: '50' } });

      const raiseButton = screen.getByTestId('raise-button');
      expect(raiseButton).toHaveStyle('background-color: #007bff'); // Blue for raise
    });

    it('should apply correct color variant to All In button', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const allinButton = screen.getByTestId('allin-button');
      expect(allinButton).toHaveStyle('background-color: #fd7e14'); // Orange for all-in
    });
  });

  describe('Button Actions', () => {
    it('should call onAction with correct parameters for Check', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      fireEvent.click(screen.getByTestId('check-button'));
      expect(mockOnAction).toHaveBeenCalledWith('check');
    });

    it('should call onAction with correct parameters for Call', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 20,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      fireEvent.click(screen.getByTestId('call-button'));
      expect(mockOnAction).toHaveBeenCalledWith('call', 20);
    });

    it('should call onAction with correct parameters for Fold', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      fireEvent.click(screen.getByTestId('fold-button'));
      expect(mockOnAction).toHaveBeenCalledWith('fold');
    });

    it('should call onAction with correct parameters for Bet', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const betInput = screen.getByTestId('bet-amount-input');
      fireEvent.change(betInput, { target: { value: '25' } });
      fireEvent.click(screen.getByTestId('bet-button'));

      expect(mockOnAction).toHaveBeenCalledWith('bet', 25);
    });

    it('should call onAction with correct parameters for Raise', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 20,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const betInput = screen.getByTestId('bet-amount-input');
      fireEvent.change(betInput, { target: { value: '50' } });
      fireEvent.click(screen.getByTestId('raise-button'));

      expect(mockOnAction).toHaveBeenCalledWith('raise', 50);
    });

    it('should call onAction with correct parameters for All In', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      fireEvent.click(screen.getByTestId('allin-button'));
      expect(mockOnAction).toHaveBeenCalledWith('allIn');
    });
  });

  describe('Input Placeholders', () => {
    it('should show correct placeholder for betting scenario', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const betInput = screen.getByTestId('bet-amount-input');
      expect(betInput).toHaveAttribute('placeholder', 'Min bet: $5');
    });

    it('should show correct placeholder for raising scenario', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 20,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const betInput = screen.getByTestId('bet-amount-input');
      expect(betInput).toHaveAttribute('placeholder', 'Min raise: $25'); // currentBet + minBet
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing player data gracefully', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [] // No players
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByTestId('player-actions')).toBeInTheDocument();
      expect(screen.getByText('All In ($0)')).toBeInTheDocument(); // Default to 0 chips
    });

    it('should handle missing gameState gracefully', () => {
      const { container } = render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={null}
          onAction={mockOnAction}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should handle zero bet amount input', () => {
      const gameState = {
        phase: 'betting',
        currentBet: 0,
        minBet: 5,
        players: [
          { id: 'player1', chips: 100, name: 'Player1', currentBet: 0 }
        ]
      };

      render(
        <PlayerActions
          currentPlayer="player1"
          currentPlayerId="player1"
          gameState={gameState}
          onAction={mockOnAction}
        />
      );

      const betInput = screen.getByTestId('bet-amount-input');
      fireEvent.change(betInput, { target: { value: '0' } });

      const betButton = screen.getByTestId('bet-button');
      expect(betButton).toHaveStyle('cursor: not-allowed');
    });
  });
});