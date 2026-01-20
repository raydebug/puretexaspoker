import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { socketService } from '../services/socketService';
import { navigationService } from '../services/navigationService';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
`;

const StatusCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 30px;
  max-width: 500px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const Title = styled.h1`
  margin-bottom: 20px;
  color: #fff;
`;

const Status = styled.div<{ type: 'loading' | 'success' | 'error' | 'info' }>`
  padding: 15px;
  border-radius: 8px;
  margin: 10px 0;
  background: ${props => {
    switch (props.type) {
      case 'loading': return 'rgba(255, 193, 7, 0.2)';
      case 'success': return 'rgba(40, 167, 69, 0.2)';
      case 'error': return 'rgba(220, 53, 69, 0.2)';
      case 'info': return 'rgba(23, 162, 184, 0.2)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.type) {
      case 'loading': return '#ffc107';
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      case 'info': return '#17a2b8';
      default: return 'rgba(255, 255, 255, 0.2)';
    }
  }};
`;

const ParameterInfo = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  margin: 15px 0;
  text-align: left;
`;

const PlayersList = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin: 15px 0;
  text-align: left;
`;

const PlayerItem = styled.div`
  padding: 5px 0;
  font-family: monospace;
`;

const AutoStartGamePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('Initializing...');
  const [statusType, setStatusType] = useState<'loading' | 'success' | 'error' | 'info'>('loading');
  const [players, setPlayers] = useState<any[]>([]);
  const [gameState, setGameState] = useState<any>(null);

  // Get parameters from URL
  const tableNumber = searchParams.get('table') || '1';
  const minPlayers = parseInt(searchParams.get('min') || '2');
  const maxWait = parseInt(searchParams.get('wait') || '30'); // seconds to wait for players

  useEffect(() => {
    const autoStartGame = async () => {
      try {
        // Validate parameters
        if (!tableNumber) {
          setStatus('❌ Missing required parameter: table');
          setStatusType('error');
          return;
        }

        setStatus('🔄 Connecting to server...');
        setStatusType('loading');

        // Connect to socket service
        socketService.connect();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for connection

        setStatus(`🔍 Checking players at table ${tableNumber}...`);
        setStatusType('info');

        // Listen for game state updates
        const gameStateHandler = (state: any) => {
          console.log('🎮 AutoStart: Received game state:', state);
          setGameState(state);
          setPlayers(state.players || []);

          const seatedPlayers = state.players?.filter((p: any) => p && p.seatNumber) || [];
          console.log('🎮 AutoStart: Seated players:', seatedPlayers.length);

          if (seatedPlayers.length >= minPlayers) {
            if (state.status === 'playing') {
              setStatus('🎮 Game is already in progress! Redirecting...');
              setStatusType('success');

              setTimeout(() => {
                navigate(`/game/${state.tableId || state.id}`);
              }, 2000);
            } else {
              setStatus(`✅ Found ${seatedPlayers.length} players! Starting game...`);
              setStatusType('success');

              // Start the game via API call
              startGameViaAPI(state.tableId || state.id);
            }
          } else {
            setStatus(`⏳ Waiting for players... (${seatedPlayers.length}/${minPlayers} seated)`);
            setStatusType('info');
          }
        };

        socketService.onGameState(gameStateHandler);

        // Join table as observer to get game state updates
        setStatus(`🏃 Joining table ${tableNumber} as observer...`);
        socketService.emitUserLogin('AutoStartBot');
        await new Promise(resolve => setTimeout(resolve, 1000));

        socketService.joinTable(parseInt(tableNumber));
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Set up timeout to stop waiting
        setTimeout(() => {
          if (statusType === 'loading' || statusType === 'info') {
            setStatus(`⏰ Timeout: Not enough players after ${maxWait} seconds`);
            setStatusType('error');
          }
        }, maxWait * 1000);

      } catch (error: any) {
        console.error('Auto-start failed:', error);
        setStatus('❌ Failed: ' + error.message);
        setStatusType('error');
      }
    };

    const startGameViaAPI = async (gameId: string) => {
      try {
        setStatus('🚀 Starting game via API...');
        setStatusType('loading');

        // Call the backend API to start the game
        const response = await fetch(`http://localhost:3001/api/tables/${gameId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          setStatus('🎮 Game started successfully! Redirecting...');
          setStatusType('success');

          // Wait a moment and then redirect to the game
          setTimeout(() => {
            const actualGameId = navigationService.getCurrentGameId();
            if (actualGameId) {
              navigate(`/game/${actualGameId}`);
            } else {
              navigate(`/game/${gameId}`);
            }
          }, 2000);
        } else {
          const errorData = await response.json();
          setStatus('❌ Failed to start game: ' + errorData.error);
          setStatusType('error');
        }
      } catch (error: any) {
        setStatus('❌ API error: ' + error.message);
        setStatusType('error');
      }
    };

    // Set up error listener
    const errorHandler = (error: { message: string }) => {
      setStatus('❌ Error: ' + error.message);
      setStatusType('error');
    };
    socketService.onError(errorHandler);

    autoStartGame();

    // Cleanup is handled by socketService internally
    return () => {
      // No manual cleanup needed for public API
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableNumber, minPlayers, maxWait, navigate]);

  return (
    <Container>
      <StatusCard>
        <Title>Auto-Start Game</Title>

        <ParameterInfo>
          <div><strong>Table:</strong> {tableNumber}</div>
          <div><strong>Min Players:</strong> {minPlayers}</div>
          <div><strong>Max Wait:</strong> {maxWait} seconds</div>
        </ParameterInfo>

        <Status type={statusType} data-testid="status">
          {status}
        </Status>

        {players.length > 0 && (
          <PlayersList>
            <div><strong>Seated Players ({players.length}):</strong></div>
            {players.map((player, index) => (
              <PlayerItem key={index}>
                🎯 {player.name} - Seat {player.seatNumber} - ${player.chips}
              </PlayerItem>
            ))}
          </PlayersList>
        )}

        {gameState && (
          <ParameterInfo>
            <div><strong>Game Status:</strong> {gameState.status}</div>
            <div><strong>Phase:</strong> {gameState.phase}</div>
            <div><strong>Pot:</strong> ${gameState.pot || 0}</div>
          </ParameterInfo>
        )}

        {statusType === 'error' && (
          <div style={{ marginTop: '20px', fontSize: '14px', opacity: 0.8 }}>
            <p><strong>Usage:</strong></p>
            <p><code>/start-game?table=1&min=2&wait=30</code></p>
            <p><strong>Parameters:</strong></p>
            <ul style={{ textAlign: 'left', paddingLeft: '20px' }}>
              <li><code>table</code> - Table number (default: 1)</li>
              <li><code>min</code> - Minimum players to start (default: 2)</li>
              <li><code>wait</code> - Max wait time in seconds (default: 30)</li>
            </ul>
          </div>
        )}
      </StatusCard>
    </Container>
  );
};

export default AutoStartGamePage; 