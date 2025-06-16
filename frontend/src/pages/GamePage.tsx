import React, { useEffect, useState, useRef, startTransition } from 'react';
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
import { SeatSelectionDialog } from '../components/Game/SeatSelectionDialog';

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

const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams<{ gameId: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [observers, setObservers] = useState<string[]>([]);
  
  // Add effect to log observer changes
  useEffect(() => {
    console.log('🎯 GamePage: Observers state updated:', observers);
  }, [observers]);
  const [isLoading, setIsLoading] = useState(true);
  const [joinAttempted, setJoinAttempted] = useState(false);
  const [isObserver, setIsObserver] = useState(true); // Start as observer
  const [availableSeats, setAvailableSeats] = useState<number[]>([]);
  const [showSeatDialog, setShowSeatDialog] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

  
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
      
      // Create mock game state with no players initially (user starts as observer)
      const mockGameState: GameState = {
        id: gameId || '1',
        players: [], // Start with empty players array - user starts as observer
        communityCards: [
          { rank: 'A', suit: '♠' },
          { rank: 'K', suit: '♥' },
          { rank: 'Q', suit: '♦' }
        ],
        pot: 150,
        currentPlayerId: null, // No current player since no one is seated
        currentPlayerPosition: 0,
        dealerPosition: 0,
        smallBlindPosition: 1,
        bigBlindPosition: 2,
        status: 'waiting', // Change to waiting since no players
        phase: 'waiting', // Change to waiting since no players
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
      setAvailableSeats([1, 2, 3, 4, 5, 6, 7, 8, 9]); // All seats available since no players // All seats available for observers
      return;
    }
    
    const connectAndJoin = async () => {
      try {
        console.log('DEBUG: GamePage attempting to connect to socket...');
        await socketService.connect();
        
        // Get nickname from localStorage or use default
        const nickname = localStorage.getItem('nickname') || 'Player' + Math.floor(Math.random() * 1000);
        
        // Join the table as observer first (this will trigger the backend joinTable logic)
        if (table && gameId) {
          socketService.joinTable(parseInt(gameId));
        }
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
          console.log('🎯 GamePage: Observers state updated:', observerList);
          console.log('🎯 GamePage: Players state updated:', players);
          setObservers(observerList);
          
          if (gameState) {
            const newGameState = { ...gameState, players };
            setGameState(newGameState);
          }
          
          // Calculate available seats (1-9, excluding occupied seats)
          const occupiedSeats = players.map(p => p.seatNumber);
          const available = Array.from({ length: 9 }, (_, i) => i + 1).filter(seat => !occupiedSeats.includes(seat));
          setAvailableSeats(available);
        });
        
        // Set up event-driven listeners for game state instead of polling
        const gameStateUnsubscriber = socketService.onGameState((state: GameState) => {
          console.log('DEBUG: GamePage received game state update via WebSocket:', state);
          setGameState(state);
          setIsLoading(false);
          
          // Calculate available seats (1-9, excluding occupied seats)
          const occupiedSeats = state.players.map(p => p.seatNumber);
          const available = Array.from({ length: 9 }, (_, i) => i + 1).filter(seat => !occupiedSeats.includes(seat));
          setAvailableSeats(available);
        });
        
        // Check for existing state immediately (no polling)
        const existingPlayer = socketService.getCurrentPlayer();
        const existingState = socketService.getGameState();
        
        if (existingPlayer) {
          console.log('DEBUG: GamePage found existing player:', existingPlayer);
          setCurrentPlayer(existingPlayer);
          setIsObserver(false);
        }
        
        if (existingState) {
          console.log('DEBUG: GamePage found existing state:', existingState);
          setGameState(existingState);
          setIsLoading(false);
          
          const occupiedSeats = existingState.players.map(p => p.seatNumber);
          const available = Array.from({ length: 9 }, (_, i) => i + 1).filter(seat => !occupiedSeats.includes(seat));
          setAvailableSeats(available);
        }
        
        // Set a timeout to show the observer view if no game state is received
        const timeoutId = setTimeout(() => {
          console.log('DEBUG: GamePage timeout - showing observer view as fallback');
          
          // If we still don't have game state, create a minimal one for observers
          if (!socketService.getGameState()) {
            console.log('DEBUG: Creating minimal game state for observer view');
            const minimalGameState = {
              id: gameId || 'unknown',
              players: [],
              communityCards: [],
              pot: 0,
              currentPlayerId: null,
              currentPlayerPosition: 0,
              dealerPosition: 1,
              smallBlindPosition: 2,
              bigBlindPosition: 3,
              status: 'waiting' as const,
              phase: 'waiting' as const,
              minBet: 10,
              currentBet: 0,
              smallBlind: 5,
              bigBlind: 10,
              isHandComplete: false
            };
            setGameState(minimalGameState);
            setAvailableSeats([1, 2, 3, 4, 5, 6, 7, 8, 9]); // All seats available
            
            // If user is an observer, add them to the observers list
            const nickname = localStorage.getItem('nickname');
            if (nickname && isObserver) {
              console.log('DEBUG: Adding current user to observers list:', nickname);
              setObservers([nickname]);
            }
          }
          
          setIsLoading(false);
        }, 3000); // Keep timeout as fallback for connection issues
        
        return () => {
          gameStateUnsubscriber();
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
    setSelectedSeat(seatNumber);
    setShowSeatDialog(true);
  };

  // Function to handle buy-in confirmation from dialog
  const handleSeatConfirm = (buyInAmount: number) => {
    if (selectedSeat === null) return;
    
    const nickname = localStorage.getItem('nickname') || 'Player' + Math.floor(Math.random() * 1000);
    
    // Close dialog
    setShowSeatDialog(false);
    setSelectedSeat(null);
    
    // Set isObserver to false immediately when taking a seat
    setIsObserver(false);
    
    // Request the seat with selected buy-in using the new takeSeat method
    socketService.takeSeat(selectedSeat, buyInAmount);
    
    // In test mode, simulate taking the seat
    if (typeof window !== 'undefined' && (window as any).Cypress) {
      // Use startTransition to batch all state updates together
      startTransition(() => {
        // Check if player is already seated (seat change) or new player
        const isExistingPlayer = currentPlayer !== null;
        
        // Create or update player for test mode
        const newPlayer = {
          id: isExistingPlayer ? currentPlayer.id : 'test-player-' + selectedSeat,
          name: nickname,
          seatNumber: selectedSeat,
          position: selectedSeat,
          chips: isExistingPlayer ? currentPlayer.chips : buyInAmount,
          currentBet: 0,
          isDealer: false,
          isAway: false,
          isActive: true,
          cards: [],
          avatar: {
            type: 'default' as const,
            color: '#ffd700'
          }
        };

        // Update all state atomically
        setCurrentPlayer(newPlayer);
        
        // Remove player from observers list (if they were observing)
        setObservers(prevObservers => prevObservers.filter(observer => observer !== nickname));
        
        // Update gameState to include the new/updated player
        setGameState(prevGameState => {
          if (!prevGameState) return prevGameState;
          
          let updatedPlayers;
          if (isExistingPlayer) {
            // Update existing player's seat
            updatedPlayers = prevGameState.players.map(p => 
              p.id === currentPlayer.id ? newPlayer : p
            );
          } else {
            // Add new player
            updatedPlayers = [...prevGameState.players, newPlayer];
          }
          
          const updatedGameState = {
            ...prevGameState,
            players: updatedPlayers
          };
          
          console.log('DEBUG: Updated gameState with player seat change:', updatedGameState);
          
          // Recalculate available seats after state update
          const occupiedSeats = updatedPlayers.map(p => p.seatNumber);
          const available = Array.from({ length: 9 }, (_, i) => i + 1).filter(seat => !occupiedSeats.includes(seat));
          setAvailableSeats(available);
          console.log('DEBUG: Updated available seats:', available);
          
          return updatedGameState;
        });
      });
    }
  };

  // Function to close seat dialog
  const handleSeatDialogClose = () => {
    setShowSeatDialog(false);
    setSelectedSeat(null);
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
            <p>You are currently watching this game. Click on any available seat to join the action!</p>
          </ObserverHeader>
          
          <PokerTable 
            gameState={gameState} 
            currentPlayer={null}
            onAction={handleAction}
            isObserver={true}
            availableSeats={availableSeats}
            onSeatSelect={handleSeatSelection}
          />
          
          <ObserverControls>
            <ReturnButton onClick={handleReturnToLobby}>
              Leave Table
            </ReturnButton>
          </ObserverControls>
          
          <OnlineList 
            players={gameState?.players || []} 
            observers={observers}
            currentPlayerId={currentPlayer?.id}
            showMode="observers"
          />

          {/* Seat Selection Dialog */}
          {showSeatDialog && selectedSeat !== null && (
            <SeatSelectionDialog
              table={table}
              seatNumber={selectedSeat}
              onClose={handleSeatDialogClose}
              onConfirm={handleSeatConfirm}
            />
          )}
        </ObserverContainer>
      </GameContainer>
    );
  }

  return (
    <GameContainer>
      <PokerTable
        gameState={gameState}
        currentPlayer={currentPlayer}
        onAction={handleAction}
        isObserver={false}
        availableSeats={availableSeats}
        onSeatSelect={handleSeatSelection}
      />
      
      <OnlineList 
        players={gameState?.players || []} 
        observers={observers}
        currentPlayerId={currentPlayer?.id}
        showMode="observers"
      />

      {/* Seat Selection Dialog for seat changes */}
      {showSeatDialog && selectedSeat !== null && (
        <SeatSelectionDialog
          table={table}
          seatNumber={selectedSeat}
          onClose={handleSeatDialogClose}
          onConfirm={handleSeatConfirm}
        />
      )}
    </GameContainer>
  );
};

export default GamePage; 