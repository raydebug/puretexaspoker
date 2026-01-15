import React, { useEffect, useState, startTransition } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import { OnlineList } from '../components/OnlineList';
import { ActionHistory } from '../components/ActionHistory';
import PlayerActions from '../components/PlayerActions';
import { socketService } from '../services/socketService';
import { GameState, Player } from '../types/game';
import { TableData } from '../types/table';
import { PokerTable } from '../components/Game/PokerTable';
import { SeatSelectionDialog } from '../components/Game/SeatSelectionDialog';

const GameContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #0f4c36 0%, #1a5d42 50%, #0f4c36 100%);
  overflow: hidden;
  display: flex;
  padding: 0;
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

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoadingSpinner = styled.div`
  width: 60px;
  height: 60px;
  border: 6px solid rgba(255, 215, 0, 0.2);
  border-top: 6px solid #ffd700;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 20px;
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

const GameLayout = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  gap: 1rem;
`;

const LeftSidebar = styled.div`
  width: 300px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  background: rgba(0, 0, 0, 0.2);
  min-height: 0;
`;

const TableContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
`;

const TableHeader = styled.div`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
`;

const TableNumberDisplay = styled.div`
  background: rgba(0, 0, 0, 0.8);
  color: #ffd700;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
  border: 2px solid #ffd700;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
  backdrop-filter: blur(10px);
  text-align: center;
  min-width: 120px;
  
  &::before {
    content: '🎰 ';
    margin-right: 4px;
  }
`;

const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tableId } = useParams<{ tableId: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [observers, setObservers] = useState<string[]>([]);
  
  // Add effect to log observer changes
  useEffect(() => {
    console.log('🎯 GamePage: Observers state updated:', observers);
  }, [observers]);
  const [isLoading, setIsLoading] = useState(true);
  const [isObserver, setIsObserver] = useState(true); // Start as observer
  const [availableSeats, setAvailableSeats] = useState<number[]>([]);
  const [showSeatDialog, setShowSeatDialog] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [currentTableNumber, setCurrentTableNumber] = useState<number | null>(null);
  const [pageReady, setPageReady] = useState(false);

  
  // Get table info from state if coming from JoinGamePage
  const table = location.state?.table as TableData | undefined;

  // Helper function to determine table number from various sources
  const getTableNumber = (): number | null => {
    // 1. Try socketService first
    let tableNumber = socketService.getCurrentTable();
    console.log('DEBUG: getTableNumber - from socketService:', tableNumber);
    
    if (tableNumber) return tableNumber;
    
    // 2. Try location state
    if (table?.id) {
      console.log('DEBUG: getTableNumber - from location state:', table.id);
      return table.id;
    }
    
    // 3. Try URL search params (for auto-seat flow)
    const urlParams = new URLSearchParams(window.location.search);
    const tableParam = urlParams.get('table');
    if (tableParam) {
      const num = parseInt(tableParam);
      console.log('DEBUG: getTableNumber - from URL params:', num);
      return num;
    }
    
    // 4. Try tableId if it's numeric
    if (tableId && /^\d+$/.test(tableId)) {
      const num = parseInt(tableId);
      console.log('DEBUG: getTableNumber - from tableId:', num);
      return num;
    }
    
    // 5. Try extracting from current URL path
    const pathParts = window.location.pathname.split('/');
    const tableIndex = pathParts.findIndex(part => part === 'game');
    if (tableIndex >= 0 && pathParts[tableIndex + 1] && /^\d+$/.test(pathParts[tableIndex + 1])) {
      const num = parseInt(pathParts[tableIndex + 1]);
      console.log('DEBUG: getTableNumber - from URL path:', num);
      return num;
    }
    
    console.log('DEBUG: getTableNumber - no table number found');
    return null;
  };

  // Effect to update table number when URL or location changes
  useEffect(() => {
    const tableNumber = getTableNumber();
    console.log('DEBUG: URL/location changed, checking table number:', tableNumber);
    if (tableNumber && tableNumber !== currentTableNumber) {
      console.log('DEBUG: Setting table number from URL change:', tableNumber);
      setCurrentTableNumber(tableNumber);
    }
  }, [location.pathname, location.search, tableId, table?.id, currentTableNumber]);

  // CRITICAL FIX: Check socketService player/observer status
  useEffect(() => {
    const checkPlayerStatus = () => {
      // Check if socketService indicates we're a player
      const socket = socketService.getSocket();
      if (socket && socket.connected) {
        // Check if we have a current player from socketService
        const socketCurrentPlayer = socketService.getCurrentPlayer();
        if (socketCurrentPlayer) {
          console.log('🎯 GamePage: SocketService indicates we are a player:', socketCurrentPlayer);
          setIsObserver(false);
          setCurrentPlayer(socketCurrentPlayer);
        } else {
          console.log('🎯 GamePage: SocketService indicates we are an observer');
          setIsObserver(true);
        }
      }
    };

    // Check immediately
    checkPlayerStatus();

    // Set up interval to check periodically
    const interval = setInterval(checkPlayerStatus, 2000);

    return () => clearInterval(interval);
  }, []);



  useEffect(() => {
    console.log('DEBUG: GamePage mounting with tableId:', tableId);
    
    // Reset socket connection state
    socketService.resetConnectionState();
    
    
    
    const connectAndJoin = async () => {
      try {
        console.log('DEBUG: GamePage attempting to connect to socket...');
        await socketService.connect();
        
        // CRITICAL FIX: Authenticate first before any other socket operations
        const nickname = localStorage.getItem('nickname') || 'Player' + Math.floor(Math.random() * 1000);
        console.log('🔐 GamePage: Authenticating with nickname:', nickname);
        
        // Emit authenticate event and wait for confirmation
        const socket = socketService.getSocket();
        if (!socket) {
          throw new Error('Socket not available for authentication');
        }
        
        // Wait for authentication to complete
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Authentication timeout'));
          }, 5000);
          
          socket.once('authenticated', (data: { nickname: string }) => {
            clearTimeout(timeout);
            console.log('✅ GamePage: Authentication successful:', data.nickname);
            resolve();
          });
          
          socket.once('error', (error: any) => {
            if (error.context === 'authenticate') {
              clearTimeout(timeout);
              console.error('❌ GamePage: Authentication failed:', error.message);
              reject(new Error(`Authentication failed: ${error.message}`));
            }
          });
          
          // Emit the authenticate event
          socket.emit('authenticate', { nickname });
        });
        
        // Get the table number to join
        const tableNumber = getTableNumber();
        console.log('DEBUG: GamePage joining table number:', tableNumber);
        
        // CRITICAL FIX: Wait a moment after authentication before joining table
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Join the table as observer first (this will trigger the backend joinTable logic)
        if (tableNumber) {
          console.log('DEBUG: GamePage calling joinTable with table number:', tableNumber);
          
          // Set up one-time listener for joinTable success/error before making the call
          const joinTablePromise = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Join table timeout'));
            }, 5000);
            
            socket.once('tableJoined', (data: any) => {
              clearTimeout(timeout);
              console.log('✅ GamePage: Successfully joined table:', data);
              resolve();
            });
            
            socket.once('error', (error: any) => {
              if (error.context === 'joinTable') {
                clearTimeout(timeout);
                console.error('❌ GamePage: Failed to join table:', error.message);
                reject(new Error(`Failed to join table: ${error.message}`));
              }
            });
          });
          
          // Emit the joinTable event
          socketService.joinTable(tableNumber);
          
          // Wait for joinTable to complete
          await joinTablePromise;
          
        } else {
          console.log('DEBUG: GamePage no table number found, cannot join table');
        }
        setIsObserver(true);
        
        // Set up error handler
        const errorHandler = (error: { message: string; context?: string }) => {
          console.log('DEBUG: GamePage errorHandler called with:', error);
          setError(error.message);
          setIsLoading(false);
        };
        
        socketService.onError(errorHandler);
        
        // Set up seat error handler
        const seatErrorHandler = (error: string) => {
          console.log('DEBUG: GamePage seatErrorHandler called with:', error);
          setError(`Seat Error: ${error}`);
          setIsObserver(true); // Reset to observer state on seat error
        };
        
        socketService.onSeatError(seatErrorHandler);
        
        // Listen for observer updates
        socketService.onOnlineUsersUpdate((playersOrTotal: Player[] | number, observerList?: string[]) => {
          console.log('🎯 GamePage: Received online users update:', { playersOrTotal, observerList });
          
          // Handle different callback signatures safely
          if (typeof playersOrTotal === 'number') {
            // Single parameter callback - total count only
            console.log('🎯 GamePage: Received total user count:', playersOrTotal);
            return;
          }
          
          // Two parameter callback - players array and observers array
          const players = Array.isArray(playersOrTotal) ? playersOrTotal : [];
          const observers = Array.isArray(observerList) ? observerList : [];
          
          console.log('🎯 GamePage: Observers state updated:', observers);
          console.log('🎯 GamePage: Players state updated:', players);
          
          setObservers(observers);
          
          if (gameState) {
            const newGameState = { ...gameState, players };
            setGameState(newGameState);
          }
          
          // Calculate available seats (1-9, excluding occupied seats) - only if players is an array
          if (Array.isArray(players)) {
            const occupiedSeats = players.map(p => p.seatNumber).filter(seat => typeof seat === 'number');
          const available = Array.from({ length: 9 }, (_, i) => i + 1).filter(seat => !occupiedSeats.includes(seat));
          setAvailableSeats(available);
          }
          
          // Update table number when user location changes
          const tableNumber = getTableNumber();
          if (tableNumber !== currentTableNumber) {
            console.log('DEBUG: Updating table number from', currentTableNumber, 'to', tableNumber);
            setCurrentTableNumber(tableNumber);
          }
        });
        
        // Set up event-driven listeners for game state instead of polling
        const gameStateUnsubscriber = socketService.onGameState((state: GameState) => {
          console.log('🎮 GamePage: Received game state update via WebSocket:', {
            id: state.id,
            phase: state.phase,
            status: state.status,
            playersCount: state.players?.length || 0,
            currentPlayerId: state.currentPlayerId
          });
          setGameState(state);
          setIsLoading(false);
          
          // Calculate available seats (1-9, excluding occupied seats)
          const occupiedSeats = (state.players || []).map(p => p.seatNumber);
          const available = Array.from({ length: 9 }, (_, i) => i + 1).filter(seat => !occupiedSeats.includes(seat));
          setAvailableSeats(available);
        });
        
        // Check for existing state immediately (no polling)
        const existingPlayer = socketService.getCurrentPlayer();
        const existingState = socketService.getGameState();
        
        console.log('DEBUG: GamePage existingPlayer from socketService:', existingPlayer);
        console.log('DEBUG: GamePage existingState from socketService:', existingState);
        
        // Only set currentPlayer from existing state if it matches the current game state
        if (existingPlayer && existingState && existingState.players) {
          const matchingPlayer = existingState.players.find(p => 
            p.name === existingPlayer.name || p.id === existingPlayer.id
          );
          if (matchingPlayer) {
            console.log('DEBUG: GamePage found matching existing player:', matchingPlayer);
            setCurrentPlayer(matchingPlayer);
            setIsObserver(false);
          } else {
            console.log('DEBUG: GamePage existing player does not match current game state, will wait for update');
          }
        }
        
        // Get current table number
        console.log('DEBUG: Final table number to set:', tableNumber);
        if (tableNumber) {
          setCurrentTableNumber(tableNumber);
          
          // CRITICAL FIX: Set loading to false immediately if we have a table number
          // This ensures the page renders even if game state is delayed
          setTimeout(() => {
            if (isLoading) {
              console.log('DEBUG: GamePage - forcing loading to false after table number set');
              setIsLoading(false);
            }
          }, 500);
        }
        
        // Set a timeout to show the observer view if no game state is received
        const timeoutId = setTimeout(() => {
          console.log('DEBUG: GamePage timeout - showing observer view as fallback');
          
          // If we still don't have game state, create a minimal one for observers
          if (!socketService.getGameState()) {
            console.log('DEBUG: Creating minimal game state for observer view');
            const minimalGameState = {
              id: tableId || 'unknown',
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
            
            // CRITICAL FIX: Only add user to observers list if they are truly not seated at any table
            const nickname = localStorage.getItem('nickname');
            if (nickname && isObserver) {
              // Double-check: make sure the user is not actually seated at this table
              const socketCurrentPlayer = socketService.getCurrentPlayer();
              const isSeatedPlayer = gameState?.players?.some(p => p.id === socketCurrentPlayer?.id || (p as any).nickname === nickname);
              
              if (!isSeatedPlayer) {
                console.log('DEBUG: Adding current user to observers list (confirmed not seated):', nickname);
                setObservers([nickname]);
              } else {
                console.log('DEBUG: User is actually seated - not adding to observers list:', nickname);
                setIsObserver(false); // Fix the state
                setObservers([]); // Clear observers list
              }
            }
          }
          
          setIsLoading(false);
        }, 1000); // Reduced timeout for faster loading
        
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
  }, [tableId]);

  // Listen for game state updates
  useEffect(() => {
    const handleGameStateUpdate = (gameState: GameState) => {
      console.log('🎯 GamePage: Received game state update:', gameState);
      setGameState(gameState);
      
      // CRITICAL FIX: Always update observer state based on actual game state
      const nickname = localStorage.getItem('nickname');
      if (nickname && gameState.players) {
        // Check if current user is actually seated at this table
        const isUserSeated = gameState.players.some(p => 
          p.name === nickname || 
          (p as any).nickname === nickname ||
          p.id === nickname
        );
        
        console.log('🎯 GamePage: Observer state check - user seated:', isUserSeated);
        
        if (isUserSeated) {
          console.log('🎯 GamePage: User is seated - setting isObserver to false');
          setIsObserver(false);
          setObservers([]); // Clear observers list since user is playing
        } else {
          console.log('🎯 GamePage: User is not seated - remaining as observer');
          setIsObserver(true);
        }
      }
      
      // Always try to set the current player from the game state
      if (gameState.players && gameState.currentPlayerId) {
        console.log('🎯 GamePage: Looking for current player');
        console.log('🎯 GamePage: Nickname from localStorage:', nickname);
        console.log('🎯 GamePage: Current player ID from game state:', gameState.currentPlayerId);
        console.log('🎯 GamePage: Available players:', (gameState.players || []).map(p => ({ name: p.name, id: p.id })));
        
        if (nickname) {
          // Try multiple matching strategies
          let player = null;
          
          // Strategy 1: Match by exact name
          player = gameState.players.find(p => p.name === nickname);
          if (player) {
            console.log('🎯 GamePage: Found player by exact name match:', player);
            setCurrentPlayer(player);
            return;
          }
          
          // Strategy 2: Match by exact ID
          player = gameState.players.find(p => p.id === nickname);
          if (player) {
            console.log('🎯 GamePage: Found player by exact ID match:', player);
            setCurrentPlayer(player);
            return;
          }
          
          // Strategy 3: Match current player ID from game state
          player = gameState.players.find(p => p.id === gameState.currentPlayerId);
          if (player) {
            console.log('🎯 GamePage: Found player by current player ID match:', player);
            setCurrentPlayer(player);
            return;
          }
          
          // Strategy 4: Match current player name from game state
          player = gameState.players.find(p => p.name === gameState.currentPlayerId);
          if (player) {
            console.log('🎯 GamePage: Found player by current player name match:', player);
            setCurrentPlayer(player);
            return;
          }
          
          console.log('🎯 GamePage: Could not find current player with any strategy');
        } else {
          console.log('🎯 GamePage: No nickname in localStorage');
        }
      }
    };

    const unsubscribe = socketService.onGameState(handleGameStateUpdate);
    return unsubscribe;
  }, []); // Remove currentPlayer dependency to avoid circular dependency

  // Fallback effect to set currentPlayer from socketService state if not set from game state
  useEffect(() => {
    if (!currentPlayer && gameState?.players) {
      const nickname = localStorage.getItem('nickname');
      if (nickname) {
        // Try to find player in game state by nickname
        const player = gameState.players.find(p => p.name === nickname);
        if (player) {
          console.log('🎯 GamePage: Fallback - setting currentPlayer from gameState:', player);
          setCurrentPlayer(player);
        }
      }
    }
  }, [gameState, currentPlayer]);

  // Debug effect to log current state
  useEffect(() => {
    console.log('🎯 GamePage DEBUG - Current state:', {
      currentPlayer,
      gameState: gameState ? {
        currentPlayerId: gameState.currentPlayerId,
        status: gameState.status,
        phase: gameState.phase,
        playersCount: gameState.players?.length
      } : null,
      nickname: localStorage.getItem('nickname')
    });
  }, [currentPlayer, gameState]);

  const handleAction = (action: string, amount?: number) => {
    console.log('DEBUG: GamePage handleAction called:', { action, amount });
    
    if (!gameState || !currentPlayer) {
      console.error('Cannot perform action: missing game state or player');
      return;
    }
    
    // Emit the action to the backend
    socketService.emitGameAction(action, amount);
  };

  // Function to handle seat selection for observers
  const handleSeatSelection = (seatNumber: number) => {
    setSelectedSeat(seatNumber);
    setShowSeatDialog(true);
  };

  // Function to handle buy-in confirmation from dialog
  const handleSeatConfirm = async (buyInAmount: number) => {
    if (selectedSeat === null) return;
    
    const nickname = localStorage.getItem('nickname') || 'Player' + Math.floor(Math.random() * 1000);
    
    // Close dialog
    setShowSeatDialog(false);
    setSelectedSeat(null);
    
    try {
      // Ensure user is authenticated before taking seat
      const socket = socketService.getSocket();
      if (!socket || !socket.connected) {
        throw new Error('Socket not connected');
      }
      
      // Re-authenticate if needed (in case session was lost)
      console.log('🔐 GamePage: Re-authenticating before taking seat with nickname:', nickname);
      socket.emit('authenticate', { nickname });
      
      // Wait a moment for authentication
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if user is already at a table (has session data)
      const currentUserSeat = socketService.getCurrentSeat();
      
      console.log(`🎯 GamePage: handleSeatConfirm - currentUserSeat: ${currentUserSeat}`);
      console.log(`🎯 GamePage: handleSeatConfirm - attempting to take seat ${selectedSeat} with buyIn ${buyInAmount}`);
      
      // Only try to join table if user is not already at any table AND we have a valid table reference
      // Since users clicking seats are typically already joined as observers, skip the rejoin attempt
      console.log(`🎯 GamePage: User appears to be at table, proceeding directly to takeSeat`);
      
      // Set isObserver to false immediately when taking a seat
      setIsObserver(false);
      
      // Request the seat with selected buy-in
      console.log(`🎯 GamePage: Calling takeSeat with seat ${selectedSeat}, buyIn ${buyInAmount}`);
      socketService.takeSeat(selectedSeat, buyInAmount);
      
    } catch (error) {
      console.error('🎯 GamePage: Error in handleSeatConfirm:', error);
      setError(`Failed to take seat: ${error}`);
      setIsObserver(true); // Reset to observer if seat taking fails
      return;
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
      <GameContainer data-testid="observer-view">
        {/* Page ready indicator for screenshots */}
        {pageReady && <div data-testid="page-ready" style={{ display: 'none' }}>Page Ready</div>}
        <GameLayout>
          <LeftSidebar>
            <ActionHistory 
              tableId={currentTableNumber || undefined}
              gameState={gameState}
              currentPlayerId={currentPlayer?.id}
            />
            
            <OnlineList 
              observers={observers}
              showMode="observers"
              compact={true}
            />
          </LeftSidebar>
          
          <TableContainer>
            <TableHeader>
              <TableNumberDisplay>
                {currentTableNumber ? `Table ${currentTableNumber}` : 'Loading...'}
              </TableNumberDisplay>
            </TableHeader>
            
            <PokerTable 
              gameState={gameState} 
              currentPlayer={null}
              onAction={handleAction}
              isObserver={true}
              availableSeats={availableSeats}
              onSeatSelect={handleSeatSelection}
            />
            
            {/* PlayerActions component positioned at bottom under the table (Observer View) */}
            <PlayerActions
              currentPlayer={null} // Not used - component uses localStorage directly
              currentPlayerId={gameState?.currentPlayerId || null}
              gameState={gameState}
              onAction={handleAction}
              isTestMode={false}
            />
          </TableContainer>
        </GameLayout>

        {/* Seat Selection Dialog */}
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
  }

  return (
    <GameContainer>
      {/* Page ready indicator for screenshots */}
      {pageReady && <div data-testid="page-ready" style={{ display: 'none' }}>Page Ready</div>}
      <LeftSidebar>
        <ActionHistory 
          tableId={currentTableNumber || undefined}
          gameState={gameState}
          currentPlayerId={currentPlayer?.id}
        />
        
        <OnlineList 
          observers={observers}
          showMode="observers"
          compact={true}
        />
      </LeftSidebar>
      
      <TableContainer>
        <TableHeader>
          <TableNumberDisplay>
            {currentTableNumber ? `Table ${currentTableNumber}` : 'Loading...'}
          </TableNumberDisplay>
        </TableHeader>
        
        <PokerTable
          gameState={gameState}
          currentPlayer={currentPlayer}
          onAction={handleAction}
          isObserver={false}
          availableSeats={availableSeats}
          onSeatSelect={handleSeatSelection}
        />
        
        {/* PlayerActions component positioned at bottom under the table */}
        <PlayerActions
          currentPlayer={currentPlayer?.name || ''} // Not used - component uses localStorage directly
          currentPlayerId={gameState?.currentPlayerId || null}
          gameState={gameState}
          onAction={handleAction}
          isTestMode={false}
        />
      </TableContainer>



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