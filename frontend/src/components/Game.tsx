import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { GameBoard } from './GameBoard';
import { GameStatus } from './GameStatus';
import { PlayerActions } from './PlayerActions';
import { ChatBox } from './ChatBox';
import { socketService } from '../services/socketService';
import { cookieService } from '../services/cookieService';
import { GameState, Player } from '../types/game';
import { SeatAction } from './SeatMenu';

const GameContainer = styled.div`
  min-height: 100vh;
  background-color: #1b4d3e;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: white;
  position: relative;
`;

export const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(() => {
    const initialState = socketService.getGameState();
    return initialState || null;
  });
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(() => {
    const initialPlayer = socketService.getCurrentPlayer();
    return initialPlayer || null;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get player info from cookies
    const nickname = cookieService.getNickname();
    const seatNumber = cookieService.getSeatNumber();

    if (!nickname || seatNumber === null) {
      setError('Player information not found');
      return;
    }

    // Connect to socket
    socketService.connect();

    // Set up game state listener
    const unsubGameState = socketService.onGameState((newState: GameState) => {
      setGameState(newState);
      // Find current player in the new state
      const player = newState.players.find(p => p.name === nickname);
      if (player) {
        setCurrentPlayer(player);
      }
    });

    // Listen for errors
    const unsubError = socketService.onError((err: { message: string }) => {
      setError(err.message);
    });

    return () => {
      // Unsubscribe from events
      unsubGameState();
      unsubError();
      socketService.disconnect();
    };
  }, []);

  const handlePlayerAction = (action: string, amount?: number) => {
    if (!gameState || !currentPlayer) return;

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
      default:
        console.warn('Unknown action:', action);
    }
  };

  if (error) {
    return (
      <GameContainer data-testid="game-container">
        <div data-testid="error-message">Error: {error}</div>
      </GameContainer>
    );
  }

  if (!gameState || !currentPlayer) {
    return (
      <GameContainer data-testid="game-container">
        <div data-testid="loading-message">Waiting for game data...</div>
      </GameContainer>
    );
  }

  return (
    <GameContainer data-testid="game-container">
      <GameStatus 
        gameState={gameState} 
        currentPlayerId={currentPlayer.id} 
        data-testid="game-status"
      />
      <GameBoard
        gameState={gameState}
        currentPlayer={currentPlayer}
        onPlayerAction={(action: SeatAction, playerId: string) => {
          switch (action) {
            case 'leaveMidway':
              socketService.updatePlayerStatus(gameState.id, playerId, true);
              break;
            case 'comeBack':
              socketService.updatePlayerStatus(gameState.id, playerId, false);
              break;
            case 'standUp':
              socketService.standUp(gameState.id, playerId);
              break;
            case 'leaveTable':
              socketService.leaveTable(gameState.id, playerId);
              break;
            default:
              console.warn('Unknown player action:', action);
          }
        }}
        data-testid="game-board"
      />
      <PlayerActions
        gameState={gameState}
        currentPlayer={currentPlayer}
        onAction={handlePlayerAction}
        data-testid="player-actions"
      />
      <ChatBox
        currentPlayer={{
          id: currentPlayer.id,
          name: currentPlayer.name
        }}
        gameId={gameState.id}
        data-testid="chat-box"
      />
    </GameContainer>
  );
}; 