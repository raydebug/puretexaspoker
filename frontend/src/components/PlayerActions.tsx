import React, { useState } from 'react';
import styled from 'styled-components';
import { GameState, Player } from '../types/game';

const ActionsContainer = styled.div`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
`;

const BetInput = styled.input`
  padding: 0.5rem;
  width: 100px;
  border: 2px solid #ffd700;
  border-radius: 5px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  text-align: center;

  &:focus {
    outline: none;
    border-color: #ffeb3b;
  }
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background-color: #ffd700;
          color: black;
          &:hover {
            background-color: #ffeb3b;
          }
        `;
      case 'secondary':
        return `
          background-color: #4caf50;
          color: white;
          &:hover {
            background-color: #66bb6a;
          }
        `;
      case 'danger':
        return `
          background-color: #f44336;
          color: white;
          &:hover {
            background-color: #ef5350;
          }
        `;
      default:
        return `
          background-color: #2196f3;
          color: white;
          &:hover {
            background-color: #42a5f5;
          }
        `;
    }
  }}

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

interface PlayerActionsProps {
  gameState: GameState;
  currentPlayer: Player;
  onAction: (action: string, amount?: number) => void;
}

export const PlayerActions: React.FC<PlayerActionsProps> = ({
  gameState,
  currentPlayer,
  onAction
}) => {
  const [betAmount, setBetAmount] = useState<number>(gameState.minBet);
  const isPlayerTurn = gameState.currentPlayerId === currentPlayer.id;
  const canCheck = gameState.currentBet === currentPlayer.currentBet;

  const handleBet = () => {
    if (betAmount >= gameState.minBet) {
      onAction('bet', betAmount);
    }
  };

  const handleCheck = () => {
    if (canCheck) {
      onAction('check');
    }
  };

  const handleFold = () => {
    onAction('fold');
  };

  return (
    <ActionsContainer data-testid="player-actions">
      <BetInput
        type="number"
        min={gameState.minBet}
        max={currentPlayer.chips}
        value={betAmount}
        onChange={(e) => setBetAmount(Number(e.target.value))}
        disabled={!isPlayerTurn}
        data-testid="bet-amount-input"
      />
      <ActionButton
        variant="primary"
        onClick={handleBet}
        disabled={!isPlayerTurn || betAmount < gameState.minBet}
        data-testid="bet-button"
      >
        Bet
      </ActionButton>
      <ActionButton
        variant="secondary"
        onClick={handleCheck}
        disabled={!isPlayerTurn || !canCheck}
        data-testid="check-button"
      >
        Check
      </ActionButton>
      <ActionButton
        variant="danger"
        onClick={handleFold}
        disabled={!isPlayerTurn}
        data-testid="fold-button"
      >
        Fold
      </ActionButton>
    </ActionsContainer>
  );
}; 