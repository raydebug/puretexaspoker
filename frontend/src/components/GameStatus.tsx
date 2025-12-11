import React from 'react';
import styled from 'styled-components';
import { GameState } from '../types/game';

const StatusContainer = styled.div`
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 1rem 2rem;
  border-radius: 1rem;
  text-align: center;
  z-index: 100;
`;

const Phase = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
`;

const Message = styled.div`
  font-size: 1rem;
  color: #ffd700;
`;

interface GameStatusProps {
  gameState: GameState;
  currentPlayerId: string;
}

export const GameStatus: React.FC<GameStatusProps> = ({ gameState, currentPlayerId }) => {
  const getPhaseMessage = () => {
    switch (gameState.phase) {
      case 'preflop':
        return 'Pre-Flop';
      case 'flop':
        return 'Flop';
      case 'turn':
        return 'Turn';
      case 'river':
        return 'River';
      case 'showdown':
        return 'Showdown';
      default:
        return 'Waiting for players...';
    }
  };

  const getActionMessage = () => {
    if (gameState.phase === 'showdown') {
      return 'Show your cards!';
    }

    if (gameState.currentPlayerId === currentPlayerId) {
      return "It's your turn!";
    }

    const currentPlayer = (gameState.players || []).find(p => p && p.id === gameState.currentPlayerId);
    if (currentPlayer) {
      return `Waiting for ${currentPlayer.name} to act...`;
    }

    return 'Waiting for players...';
  };

  return (
    <StatusContainer>
      <Phase>{getPhaseMessage()}</Phase>
      <Message>{getActionMessage()}</Message>
    </StatusContainer>
  );
}; 