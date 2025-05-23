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
        setError(err.message);
        setIsConnecting(false);
      };
      socketService.onError(errorHandler);
      
      console.log(`Joining table ${tableId} with buy-in ${buyIn}`);
      // Join the table with the data passed from JoinGamePage
      socketService.joinTable(tableId, buyIn);
      
      // Set a timeout to check if we've connected
      joinTimeoutId = setTimeout(() => {
        if (!socketService.getCurrentPlayer()) {
          setError("Connection timeout. Failed to join table. The backend might not be responding or there was an error joining the table.");
          setIsConnecting(false);
        }
      }, 10000);
    }
    
    // Check if we have a current player
    const checkPlayer = () => {
      const player = socketService.getCurrentPlayer();
      if (player) {
        setCurrentPlayer(player);
        setIsConnecting(false);
        clearTimeout(joinTimeoutId);
      }
    };
    
    // Check player initially and then every second
    checkPlayer();
    const intervalId = setInterval(checkPlayer, 1000);

    // Set up socket listeners
    const checkGameState = () => {
      const state = socketService.getGameState();
      if (state) {
        setGameState(state);
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