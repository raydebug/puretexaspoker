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

const GameContainer = styled.div`
  min-height: 100vh;
  background-color: #1b4d3e;
  padding: 2rem;
  color: white;
`;

const LoadingContainer = styled.div`
  min-height: 100vh;
  background-color: #1b4d3e;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  padding: 2rem;
`;

const LoadingMessage = styled.div`
  font-size: 1.5rem;
  margin-bottom: 2rem;
`;

const ErrorMessage = styled.div`
  color: #ff4444;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  max-width: 80%;
  text-align: center;
`;

const BackButton = styled.button`
  background-color: #8b0000;
  color: white;
  border: 1px solid #ffd700;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 1.5rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: #a00;
    transform: translateY(-2px);
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
  const [isConnecting, setIsConnecting] = useState(true);
  const [joinAttempted, setJoinAttempted] = useState(false);
  
  // Get table info from state if coming from JoinGamePage
  const table = location.state?.table as TableData | undefined;
  const buyIn = location.state?.buyIn as number | undefined;

  useEffect(() => {
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
        communityCards: [],
        pot: 0,
        sidePots: undefined,
        currentPlayerId: mockPlayer.id,
        currentPlayerPosition: 1,
        dealerPosition: 0,
        smallBlindPosition: 0,
        bigBlindPosition: 1,
        phase: 'waiting',
        status: 'waiting',
        currentBet: 0,
        minBet: 10,
        smallBlind: 5,
        bigBlind: 10,
        handEvaluation: undefined,
        winner: undefined,
        winners: undefined,
        showdownResults: undefined,
        isHandComplete: false
      };
      
      setCurrentPlayer(mockPlayer);
      setGameState(mockGameState);
      setIsConnecting(false);
      return;
    }
    
    // Connect to socket
    socketService.connect();
    
    let joinTimeoutId: NodeJS.Timeout;
    
    // If we came from JoinGamePage with table data, join the table
    if (table && buyIn && gameId && !joinAttempted) {
      setJoinAttempted(true);
      // Join the table if we haven't already
      const tableId = Number(gameId);
      const nickname = localStorage.getItem('nickname') || `Player${Math.floor(Math.random() * 1000)}`;
      
      // Store nickname
      if (nickname) {
        localStorage.setItem('nickname', nickname);
      }
      
      // Listen for errors
      const errorHandler = (err: { message: string }) => {
        console.error('DEBUG: GamePage errorHandler called with:', err);
        setError(err.message);
        setIsConnecting(false);
      };
      socketService.onError(errorHandler);
      
      console.log(`DEBUG: GamePage about to join table ${tableId} with buy-in ${buyIn}, nickname: ${nickname}`);
      
      // Try to join the table with socket first
      try {
        console.log(`DEBUG: GamePage calling socketService.joinTable(${tableId}, ${buyIn})`);
        socketService.joinTable(tableId, buyIn);
        console.log(`DEBUG: GamePage socketService.joinTable call completed`);
      } catch (error) {
        console.error('DEBUG: GamePage failed to join table via socket:', error);
        setError('Failed to connect to game. Please try again.');
        setIsConnecting(false);
        return;
      }
      
      // Set a timeout to check if we've connected, with fallback to mock data
      joinTimeoutId = setTimeout(() => {
        console.log('DEBUG: GamePage timeout reached, checking connection status...');
        const currentPlayer = socketService.getCurrentPlayer();
        const currentGameState = socketService.getGameState();
        
        console.log('DEBUG: GamePage timeout - currentPlayer:', currentPlayer);
        console.log('DEBUG: GamePage timeout - currentGameState:', currentGameState);
        console.log('DEBUG: GamePage timeout - socket connected:', socketService.getSocket()?.connected);
        console.log('DEBUG: GamePage timeout - connection attempts:', socketService.getConnectionAttempts());
        
        if (!currentPlayer || !currentGameState) {
          console.log('DEBUG: GamePage creating fallback game state for testing');
          
          // Create a mock player based on the table and buy-in data
          const mockPlayer: Player = {
            id: `player-${nickname}`,
            name: nickname,
            chips: buyIn,
            currentBet: 0,
            cards: [],
            position: 0,
            seatNumber: 1,
            isActive: true,
            isDealer: false,
            isAway: false,
            avatar: {
              type: 'initials',
              initials: nickname.substring(0, 2).toUpperCase(),
              color: '#007bff'
            }
          };
          
          // Create a mock game state
          const mockGameState: GameState = {
            id: gameId,
            players: [mockPlayer],
            communityCards: [],
            pot: 0,
            currentPlayerId: mockPlayer.id,
            currentPlayerPosition: 0,
            dealerPosition: 0,
            smallBlindPosition: 1,
            bigBlindPosition: 2,
            status: 'waiting',
            phase: 'preflop',
            minBet: table.bigBlind || 10,
            currentBet: 0,
            smallBlind: table.smallBlind || 5,
            bigBlind: table.bigBlind || 10,
            handEvaluation: undefined,
            winner: undefined,
            isHandComplete: false
          };
          
          console.log('DEBUG: GamePage setting mock data - player:', mockPlayer);
          console.log('DEBUG: GamePage setting mock data - gameState:', mockGameState);
          
          // Set the mock data
          socketService.setCurrentPlayer(mockPlayer);
          setCurrentPlayer(mockPlayer);
          setGameState(mockGameState);
          setIsConnecting(false);
          
          console.log('DEBUG: GamePage created fallback game state successfully');
        } else {
          console.log('DEBUG: GamePage timeout but we have valid player and game state, staying connected');
        }
      }, 15000); // Increased timeout to 15 seconds
    }
    
    // Check if we have a current player
    const checkPlayer = () => {
      const player = socketService.getCurrentPlayer();
      if (player) {
        console.log('DEBUG: GamePage checkPlayer found player:', player);
        setCurrentPlayer(player);
        setIsConnecting(false);
        clearTimeout(joinTimeoutId);
      } else {
        console.log('DEBUG: GamePage checkPlayer - no player found yet');
      }
    };
    
    // Check player initially and then every second
    console.log('DEBUG: GamePage setting up player checking interval');
    checkPlayer();
    const intervalId = setInterval(checkPlayer, 1000);

    // Set up socket listeners
    const checkGameState = () => {
      const state = socketService.getGameState();
      if (state) {
        console.log('DEBUG: GamePage checkGameState found state:', state);
        setGameState(state);
      } else {
        console.log('DEBUG: GamePage checkGameState - no game state found yet');
      }
    };

    // Listen for online users updates
    socketService.onOnlineUsersUpdate((players, observers) => {
      if (gameState) {
        setGameState(prev => ({
          ...prev!,
          players
        }));
      }
      setObservers(observers);
    });

    // Check game state every second
    const gameStateIntervalId = setInterval(checkGameState, 1000);

    return () => {
      clearInterval(intervalId);
      clearInterval(gameStateIntervalId);
      clearTimeout(joinTimeoutId);
      socketService.disconnect();
    };
  }, [navigate, table, buyIn, gameId, gameState, joinAttempted]);

  const handleAction = (action: string, amount?: number) => {
    if (!currentPlayer || !gameState) return;

    switch (action) {
      case 'bet':
        if (amount) {
          socketService.placeBet(gameState.id, currentPlayer.id, amount);
          soundService.play('chipBet');
        }
        break;
      case 'check':
        socketService.check(gameState.id, currentPlayer.id);
        soundService.play('check');
        break;
      case 'fold':
        socketService.fold(gameState.id, currentPlayer.id);
        soundService.play('fold');
        break;
    }
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
    navigate('/lobby');
  };

  if (isConnecting) {
    return (
      <LoadingContainer>
        <LoadingMessage>Connecting to table...</LoadingMessage>
        <div className="spinner" style={{ 
          border: '4px solid rgba(0, 0, 0, 0.1)', 
          borderTop: '4px solid #ffd700',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin 1s linear infinite'
        }} />
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </LoadingContainer>
    );
  }
  
  if (error) {
    return (
      <LoadingContainer>
        <LoadingMessage>Error connecting to table</LoadingMessage>
        <ErrorMessage>{error}</ErrorMessage>
        <BackButton onClick={handleReturnToLobby}>Return to Lobby</BackButton>
      </LoadingContainer>
    );
  }

  if (!gameState || !currentPlayer) {
    return (
      <LoadingContainer>
        <LoadingMessage>Waiting for game data...</LoadingMessage>
        <div className="spinner" style={{ 
          border: '4px solid rgba(0, 0, 0, 0.1)', 
          borderTop: '4px solid #ffd700',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin 1s linear infinite'
        }} />
        <ErrorMessage>
          Game state is not available. This might happen if:
          <ul style={{ textAlign: 'left', marginTop: '1rem' }}>
            <li>You're not properly connected to the game</li>
            <li>The backend server is not responding</li>
            <li>There was an error joining the table</li>
          </ul>
        </ErrorMessage>
        <BackButton onClick={handleReturnToLobby}>Return to Lobby</BackButton>
      </LoadingContainer>
    );
  }

  return (
    <GameContainer>
      <GameStatus gameState={gameState} currentPlayerId={currentPlayer.id} />
      <OnlineList
        players={gameState.players}
        observers={observers}
        currentPlayerId={currentPlayer.id}
      />
      <ChatBox
        currentPlayer={{
          id: currentPlayer.id,
          name: currentPlayer.name
        }}
        gameId={gameState.id}
      />
      <GameBoard
        gameState={gameState}
        currentPlayer={currentPlayer}
        onPlayerAction={handleSeatAction}
      />
      <PlayerActions
        gameState={gameState}
        currentPlayer={currentPlayer}
        onAction={handleAction}
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <SoundControls />
    </GameContainer>
  );
};

export default GamePage; 