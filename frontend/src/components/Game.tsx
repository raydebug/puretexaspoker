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

const AdminControls = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 15px;
  border-radius: 10px;
  border: 1px solid #ffd700;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;

  h3 {
    margin: 0 0 10px 0;
    color: #ffd700;
    font-size: 1rem;
  }

  button {
    padding: 8px 12px;
    border: 1px solid #ffd700;
    border-radius: 5px;
    background: rgba(255, 215, 0, 0.1);
    color: #ffd700;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 215, 0, 0.2);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
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
      console.log('🎮 GAME: Received gameState update:', {
        players: newState.players?.length || 0,
        phase: newState.phase,
        pot: newState.pot
      });
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

    // CRITICAL FIX: Listen for UI sync events to ensure consistent state across browser instances
    const handleForceUISync = (event: CustomEvent) => {
      console.log('🔄 GAME: Received forceUISync event:', event.detail);
      const { gameState: syncedGameState, players, observers, timestamp } = event.detail;
      
      if (syncedGameState) {
        console.log('🔄 GAME: Applying forced UI sync:', {
          players: syncedGameState.players?.length || 0,
          observers: observers?.length || 0,
          timestamp
        });
        
        setGameState(syncedGameState);
        
        // Update current player if found in synced state
        const player = syncedGameState.players?.find((p: Player) => p.name === nickname);
        if (player) {
          setCurrentPlayer(player);
          console.log('🔄 GAME: Updated current player from sync:', player.name);
        }
        
        // Force component re-render
        setGameState((prev) => ({ ...syncedGameState }));
      }
    };

    // Add event listener for UI sync
    window.addEventListener('forceUISync', handleForceUISync as EventListener);

    return () => {
      // Unsubscribe from events
      unsubGameState();
      unsubError();
      window.removeEventListener('forceUISync', handleForceUISync as EventListener);
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
      case 'call':
        if (amount) {
          socketService.call(gameState.id, currentPlayer.id, amount);
        }
        break;
      case 'raise':
        if (amount) {
          socketService.raise(gameState.id, currentPlayer.id, amount);
        }
        break;
      case 'allIn':
        socketService.allIn(gameState.id, currentPlayer.id);
        break;
      case 'check':
        socketService.check(gameState.id, currentPlayer.id);
        break;
      case 'fold':
        socketService.fold(gameState.id, currentPlayer.id);
        break;
      case 'startNewHand':
        socketService.startNewHand(gameState.id);
        break;
      case 'dealCommunityCards':
        socketService.dealCommunityCards(gameState.id);
        break;
      case 'getPhaseInfo':
        socketService.getPhaseInfo(gameState.id);
        break;
      case 'forceCompletePhase':
        socketService.forceCompletePhase(gameState.id);
        break;
      default:
        console.warn('Unknown action:', action);
    }
  };

  return (
    <GameContainer data-testid="game-container">
      {/* Admin Controls for Testing */}
      {gameState && (
        <AdminControls>
          <h3>Admin Controls</h3>
          <button 
            onClick={() => handlePlayerAction('dealCommunityCards')}
            disabled={!gameState}
          >
            Deal Cards
          </button>
          <button 
            onClick={() => handlePlayerAction('forceCompletePhase')}
            disabled={!gameState}
          >
            Force Phase
          </button>
          <button 
            onClick={() => handlePlayerAction('startNewHand')}
            disabled={!gameState}
          >
            New Hand
          </button>
          <button 
            onClick={() => handlePlayerAction('getPhaseInfo')}
            disabled={!gameState}
          >
            Phase Info
          </button>
          <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>
            Phase: {gameState.phase}<br/>
            Players: {gameState.players.length}<br/>
            Turn: {gameState.currentPlayerId ? gameState.players.find(p => p && p.id === gameState.currentPlayerId)?.name : 'None'}
          </div>
        </AdminControls>
      )}

      {error ? (
        <div data-testid="error-message">Error: {error}</div>
      ) : !gameState || !currentPlayer ? (
        <div data-testid="loading-message">Waiting for game data...</div>
      ) : (
        <>
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
        </>
      )}
    </GameContainer>
  );
}; 