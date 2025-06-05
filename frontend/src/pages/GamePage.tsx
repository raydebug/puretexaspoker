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

const ObserverContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
`;

const ObserverHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  
  h2 {
    color: #ffd700;
    margin-bottom: 0.5rem;
    font-size: 2rem;
  }
  
  p {
    color: #ffffff;
    opacity: 0.8;
    font-size: 1.1rem;
  }
`;

const ObserverControls = styled.div`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 1rem;
  z-index: 1000;
`;

const TakeSeatButton = styled.button`
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #2c8a3d 0%, #37a34a 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #37a34a 0%, #4caf50 100%);
    transform: translateY(-2px);
  }
  
  &:disabled {
    background: #666;
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SeatSelectionModal = styled.div`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border-radius: 1rem;
  padding: 2rem;
  border: 2px solid #ffd700;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
  max-width: 500px;
  width: 90%;
  z-index: 10000;
  position: relative;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  
  h3 {
    color: #ffd700;
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
  }
  
  p {
    color: #ffffff;
    opacity: 0.8;
  }
`;

const SeatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
`;

const SeatOption = styled.button`
  padding: 1rem;
  background: linear-gradient(135deg, #2c8a3d 0%, #37a34a 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, #37a34a 0%, #4caf50 100%);
    transform: translateY(-2px);
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: transparent;
  color: #ffd700;
  border: 2px solid #ffd700;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #ffd700;
    color: #000;
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
  const [isObserver, setIsObserver] = useState(true); // Start as observer
  const [availableSeats, setAvailableSeats] = useState<number[]>([]);
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  
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
      
      // Get the actual nickname from localStorage for test mode
      const testNickname = localStorage.getItem('nickname') || 'TestPlayer';
      
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
      
      // Create mock game state with proper flop cards (3 cards)
      const mockGameState: GameState = {
        id: gameId || '1',
        players: [mockPlayer],
        communityCards: [
          { rank: 'A', suit: '♠' },
          { rank: 'K', suit: '♥' },
          { rank: 'Q', suit: '♦' }
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
      setCurrentPlayer(null); // Start as observer, no player seat yet
      setIsLoading(false);
      // In test mode, start as observer with option to take a seat
      setIsObserver(true);
      setObservers([testNickname]); // Use actual test nickname from localStorage
      setAvailableSeats([0, 1, 2, 3, 4, 5, 6, 7, 8]); // All seats available for observers
      return;
    }
    
    const connectAndJoin = async () => {
      try {
        console.log('DEBUG: GamePage attempting to connect to socket...');
        await socketService.connect();
        
        // Get nickname from localStorage or use default
        const nickname = localStorage.getItem('nickname') || 'Player' + Math.floor(Math.random() * 1000);
        
        // Join as observer first
        socketService.joinAsObserver(nickname);
        setIsObserver(true);
        
        // Set up error handler
        const errorHandler = (error: { message: string; context?: string }) => {
          console.log('DEBUG: GamePage errorHandler called with:', error);
          setError(error.message);
          setIsLoading(false);
        };
        
        socketService.onError(errorHandler);
        
        // Listen for observer updates
        socketService.onOnlineUsersUpdate((players: Player[], observerList: string[]) => {
          setObservers(observerList);
          if (gameState) {
            const newGameState = { ...gameState, players };
            setGameState(newGameState);
          }
          
          // Calculate available seats (0-8, excluding occupied seats)
          const occupiedSeats = players.map(p => p.seatNumber);
          const available = Array.from({ length: 9 }, (_, i) => i).filter(seat => !occupiedSeats.includes(seat));
          setAvailableSeats(available);
        });
        
        // Check for existing player and game state periodically
        const checkGameState = () => {
          const player = socketService.getCurrentPlayer();
          const state = socketService.getGameState();
          
          console.log('DEBUG: GamePage checkPlayer - player:', !!player);
          if (player) {
            console.log('DEBUG: GamePage checkPlayer found player:', player);
            setCurrentPlayer(player);
            setIsObserver(false); // User has a seat, no longer observer
          }
          
          console.log('DEBUG: GamePage checkGameState - state:', !!state);
          if (state) {
            console.log('DEBUG: GamePage checkGameState found state:', state);
            setGameState(state);
            setIsLoading(false);
            
            // Calculate available seats
            const occupiedSeats = state.players.map(p => p.seatNumber);
            const available = Array.from({ length: 9 }, (_, i) => i).filter(seat => !occupiedSeats.includes(seat));
            setAvailableSeats(available);
          }
        };
        
        // Check immediately and then periodically
        checkGameState();
        const gameStateInterval = setInterval(checkGameState, 500);
        
        // Set a timeout to show the observer view if no game state is received
        const timeoutId = setTimeout(() => {
          console.log('DEBUG: GamePage timeout - showing observer view');
          setIsLoading(false);
        }, 5000);
        
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

  // Function to handle seat selection for observers
  const handleSeatSelection = (seatNumber: number) => {
    const nickname = localStorage.getItem('nickname') || 'Player' + Math.floor(Math.random() * 1000);
    const defaultBuyIn = buyIn || table?.minBuyIn || 100;
    
    // Request the seat with default buy-in
    socketService.requestSeat(nickname, seatNumber);
    setShowSeatSelection(false);
  };

  // Function to show seat selection modal
  const handleTakeSeat = () => {
    if (availableSeats.length === 0) {
      setError('No seats available at this table');
      return;
    }
    setShowSeatSelection(true);
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

  // Observer view - user is watching the table
  if (isObserver) {
    return (
      <GameContainer>
        <ObserverContainer data-testid="observer-view">
          <ObserverHeader>
            <h2>Observing Table {gameId}</h2>
            <p>You are currently watching this game. Select a seat to join the action!</p>
          </ObserverHeader>
          
          <PokerTable 
            gameState={gameState} 
            currentPlayer={null}
            onAction={handleAction}
          />
          
          <ObserverControls>
            <TakeSeatButton 
              data-testid="take-seat-button" 
              onClick={handleTakeSeat}
              disabled={availableSeats.length === 0}
            >
              {availableSeats.length === 0 ? 'No Seats Available' : `Take a Seat (${availableSeats.length} available)`}
            </TakeSeatButton>
            <ReturnButton onClick={handleReturnToLobby}>
              Leave Table
            </ReturnButton>
          </ObserverControls>
          
          <OnlineList 
            players={gameState?.players || []} 
            observers={observers}
            currentPlayerId={currentPlayer?.id}
          />
        </ObserverContainer>
        
        {/* Seat Selection Modal */}
        {showSeatSelection && (
          <>
            <ModalOverlay onClick={() => setShowSeatSelection(false)} />
            <SeatSelectionModal data-testid="seat-selection-modal">
              <ModalHeader>
                <h3>Choose Your Seat</h3>
                <p>Select an available seat to join the game</p>
              </ModalHeader>
              <SeatGrid>
                {availableSeats.map(seatNumber => (
                  <SeatOption 
                    key={seatNumber}
                    data-testid={`seat-option-${seatNumber}`}
                    onClick={() => handleSeatSelection(seatNumber)}
                  >
                    Seat {seatNumber + 1}
                  </SeatOption>
                ))}
              </SeatGrid>
              <ModalActions>
                <CancelButton onClick={() => setShowSeatSelection(false)}>
                  Cancel
                </CancelButton>
              </ModalActions>
            </SeatSelectionModal>
          </>
        )}
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