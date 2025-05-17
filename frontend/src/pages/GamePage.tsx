import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { GameBoard } from '../components/GameBoard';
import { PlayerActions } from '../components/PlayerActions';
import { GameStatus } from '../components/GameStatus';
import { socketService } from '../services/socketService';
import { GameState, Player } from '../types/game';

const GameContainer = styled.div`
  min-height: 100vh;
  background-color: #1b4d3e;
  padding: 2rem;
  color: white;
`;

const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have a current player
    const player = socketService.getCurrentPlayer();
    if (!player) {
      navigate('/');
      return;
    }

    setCurrentPlayer(player);

    // Set up socket listeners
    const checkGameState = () => {
      const state = socketService.getGameState();
      if (state) {
        setGameState(state);
      }
    };

    // Check game state every second
    const interval = setInterval(checkGameState, 1000);

    return () => {
      clearInterval(interval);
      socketService.disconnect();
    };
  }, [navigate]);

  const handleAction = (action: string, amount?: number) => {
    if (!currentPlayer || !gameState) return;

    switch (action) {
      case 'bet':
        if (amount) {
          socketService.placeBet(gameState.id, currentPlayer.id, amount);
        }
        break;
      case 'check':
        socketService.check(gameState.id, currentPlayer.id);
        break;
      case 'fold':
        socketService.fold(gameState.id, currentPlayer.id);
        break;
    }
  };

  if (!gameState || !currentPlayer) {
    return <div>Loading...</div>;
  }

  return (
    <GameContainer>
      <GameStatus gameState={gameState} currentPlayerId={currentPlayer.id} />
      <GameBoard
        gameState={gameState}
        currentPlayer={currentPlayer}
      />
      <PlayerActions
        gameState={gameState}
        currentPlayer={currentPlayer}
        onAction={handleAction}
      />
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </GameContainer>
  );
};

export default GamePage; 