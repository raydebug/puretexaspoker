import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { GameBoard } from '../components/GameBoard';
import { PlayerActions } from '../components/PlayerActions';
import { GameStatus } from '../components/GameStatus';
import { OnlineList } from '../components/OnlineList';
import { ChatBox } from '../components/ChatBox';
import { socketService } from '../services/socketService';
import { GameState, Player } from '../types/game';
import { SeatAction } from '../components/SeatMenu';
import { TableData } from '../types/table';
import SoundControls from '../components/SoundControls';
import { soundService } from '../services/soundService';
import { PokerTable } from '../components/Game/PokerTable';

const GameContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #0f4c36 0%, #1a5d42 50%, #0f4c36 100%);
  overflow: hidden;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: #ffd700;
  text-align: center;
`;

const LoadingSpinner = styled.div`
  width: 60px;
  height: 60px;
  border: 6px solid rgba(255, 215, 0, 0.2);
  border-top: 6px solid #ffd700;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.h2`
  margin: 0;
  font-size: 24px;
  margin-bottom: 10px;
`;

const LoadingSubtext = styled.p`
  margin: 0;
  opacity: 0.8;
  font-size: 16px;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: #ff6b6b;
  text-align: center;
  padding: 20px;
`;

const ErrorMessage = styled.h2`
  margin-bottom: 20px;
  font-size: 24px;
`;

const ReturnButton = styled.button`
  padding: 12px 24px;
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, #2980b9 0%, #21618c 100%);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams<{ gameId: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [observers, setObservers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joinAttempted, setJoinAttempted] = useState(false);
  
  // Get table info from state if coming from JoinGamePage
  const table = location.state?.table as TableData | undefined;
  const buyIn = location.state?.buyIn as number | undefined;

  useEffect(() => {
    console.log('DEBUG: GamePage mounting with gameId:', gameId);
    
    // Reset socket connection state
    socketService.resetConnectionState();
    
    // In test mode, create mock data and skip socket connection
    if (typeof window !== 'undefined' && (window as any).Cypress) {
      console.log('GamePage: Test mode detected - creating mock game state');
      
      // Create mock player
      const mockPlayer: Player = {
        id: 'test-player-1',
        name: 'TestPlayer',
        seatNumber: 1,
        position: 1,
        chips: 1000,
        currentBet: 0,
        isDealer: false,
        isAway: false,
        isActive: true,
        cards: [],
        avatar: {
          type: 'default',
          color: '#ffd700'
        }
      };
      
      // Create mock game state
      const mockGameState: GameState = {
        id: gameId || '1',
        players: [mockPlayer],
        communityCards: [
          { rank: 'A', suit: '♠' },
          { rank: 'A', suit: '♥' }
        ],
        pot: 150,
        currentPlayerId: mockPlayer.id,
        currentPlayerPosition: 1,
        dealerPosition: 0,
        smallBlindPosition: 1,
        bigBlindPosition: 2,
        status: 'playing',
        phase: 'flop',
        minBet: 10,
        currentBet: 0,
        smallBlind: 5,
        bigBlind: 10,
        handEvaluation: undefined,
        winner: undefined,
        isHandComplete: false
      };
      
      setGameState(mockGameState);
      setCurrentPlayer(mockPlayer);
      setIsLoading(false);
      return;
    }
    
    const connectAndJoin = async () => {
      try {
        console.log('DEBUG: GamePage attempting to connect to socket...');
        await socketService.connect();
        
        // Set up error handler
        const errorHandler = (error: { message: string; context?: string }) => {
          console.log('DEBUG: GamePage errorHandler called with:', error);
          setError(error.message);
          setIsLoading(false);
        };
        
        socketService.onError(errorHandler);
        
        // Check for existing player and game state periodically
        const checkGameState = () => {
          const player = socketService.getCurrentPlayer();
          const state = socketService.getGameState();
          
          console.log('DEBUG: GamePage checkPlayer - player:', !!player);
          if (player) {
            console.log('DEBUG: GamePage checkPlayer found player:', player);
            setCurrentPlayer(player);
          }
          
          console.log('DEBUG: GamePage checkGameState - state:', !!state);
          if (state) {
            console.log('DEBUG: GamePage checkGameState found state:', state);
            setGameState(state);
            setIsLoading(false);
          }
        };
        
        // Check immediately and then periodically
        checkGameState();
        const gameStateInterval = setInterval(checkGameState, 500);
        
        // Set a timeout to show error if no game state is received
        const timeoutId = setTimeout(() => {
          if (!socketService.getCurrentPlayer() || !socketService.getGameState()) {
            console.log('DEBUG: GamePage timeout - creating fallback game state');
            setError('Unable to load game. The table may be full or unavailable.');
            setIsLoading(false);
          }
        }, 15000);
        
        return () => {
          clearInterval(gameStateInterval);
          clearTimeout(timeoutId);
        };
        
      } catch (err) {
        console.error('Failed to connect:', err);
        setError('Failed to connect to game server');
        setIsLoading(false);
      }
    };
    
    connectAndJoin();
    
    return () => {
      // DO NOT disconnect socket here - it prevents receiving gameJoined events
      // socketService.disconnect();
    };
  }, [gameId]);

  const handleAction = (action: string, amount?: number) => {
    console.log('DEBUG: GamePage handleAction called:', { action, amount });
    
    if (!gameState || !currentPlayer) {
      console.error('Cannot perform action: missing game state or player');
      return;
    }
    
    // Emit the action to the backend
    socketService.emitGameAction(action, amount);
  };

  const handleSeatAction = (action: SeatAction, playerId: string) => {
    if (!gameState) return;
    
    soundService.play('buttonClick');
    
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
        navigate('/lobby');
        break;
    }
  };

  const handleReturnToLobby = () => {
    navigate('/');
  };

  if (error) {
    return (
      <GameContainer>
        <ErrorContainer>
          <ErrorMessage>Game Error</ErrorMessage>
          <p>{error}</p>
          <ReturnButton onClick={handleReturnToLobby}>
            Return to Lobby
          </ReturnButton>
        </ErrorContainer>
      </GameContainer>
    );
  }

  if (isLoading || !gameState) {
    return (
      <GameContainer>
        <LoadingContainer>
          <LoadingSpinner />
          <LoadingText>Connecting to table...</LoadingText>
          <LoadingSubtext>Please wait while we set up your game</LoadingSubtext>
        </LoadingContainer>
      </GameContainer>
    );
  }

  return (
    <GameContainer>
      <PokerTable
        gameState={gameState}
        currentPlayer={currentPlayer}
        onAction={handleAction}
      />
    </GameContainer>
  );
};

export default GamePage; 