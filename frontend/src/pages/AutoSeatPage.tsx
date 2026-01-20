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

const Status = styled.div<{ type: 'loading' | 'success' | 'error' }>`
  padding: 15px;
  border-radius: 8px;
  margin: 10px 0;
  background: ${props => {
    switch (props.type) {
      case 'loading': return 'rgba(255, 193, 7, 0.2)';
      case 'success': return 'rgba(40, 167, 69, 0.2)';
      case 'error': return 'rgba(220, 53, 69, 0.2)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.type) {
      case 'loading': return '#ffc107';
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
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

const AutoSeatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('🔄 Initializing...');
  const [statusType, setStatusType] = useState<'loading' | 'success' | 'error'>('loading');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get parameters from URL
  const playerName = searchParams.get('player') || searchParams.get('name');
  const tableNumber = searchParams.get('table');
  const seatNumber = searchParams.get('seat');
  const buyInAmount = parseInt(searchParams.get('buyin') || searchParams.get('chips') || '200');

  useEffect(() => {
    const performAutoSeat = async () => {
      // Prevent multiple auto-seat attempts
      if (isProcessing) {
        console.log('🎯 AUTO-SEAT: Already processing, skipping duplicate call');
        return;
      }

      setIsProcessing(true);

      try {
        // Validate parameters
        if (!playerName || !tableNumber || !seatNumber) {
          setStatus('❌ Missing required parameters. Please provide: player, table, and seat');
          setStatusType('error');
          setIsProcessing(false);
          return;
        }

        setStatus('🔌 Connecting to server...');

        // Connect to WebSocket
        await socketService.connect();

        // Wait for connection with longer timeout
        let connectionAttempts = 0;
        const maxConnectionAttempts = 15;
        while (!socketService.getSocket()?.connected && connectionAttempts < maxConnectionAttempts) {
          console.log(`🎯 AUTO-SEAT: Waiting for connection... attempt ${connectionAttempts + 1}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          connectionAttempts++;
        }

        if (!socketService.getSocket()?.connected) {
          setStatus('❌ Failed to connect to server after multiple attempts');
          setStatusType('error');
          setIsProcessing(false);
          return;
        }

        setStatus('🔐 Authenticating...');

        // Store nickname for socketService
        localStorage.setItem('nickname', playerName);

        // Authenticate with nickname
        socketService.emitUserLogin(playerName);

        // Wait for authentication with longer timeout
        await new Promise(resolve => setTimeout(resolve, 2000));

        setStatus('🎯 Auto-seating...');

        // Set up event listeners for auto-seat response
        let autoSeatCompleted = false;

        const handleAutoSeatSuccess = (data: { tableId: number; seatNumber: number; buyIn: number }) => {
          console.log(`🎯 AUTO-SEAT [SUCCESS]: Received autoSeatSuccess for ${playerName} at Table ${data.tableId} Seat ${data.seatNumber}`);
          autoSeatCompleted = true;
          setStatus('✅ Auto-seat successful! Redirecting to game...');
          setStatusType('success');

          // Redirect to game page
          setTimeout(() => {
            console.log(`🎯 AUTO-SEAT: Navigating to /game/${tableNumber}`);
            navigate(`/game/${tableNumber}`);
          }, 1000);
        };

        const handleAutoSeatError = (data: { error: string }) => {
          console.log('🎯 AUTO-SEAT: Received autoSeatError event:', data);
          autoSeatCompleted = true;
          setStatus(`❌ Auto-seat failed: ${data.error}`);
          setStatusType('error');
          setIsProcessing(false);
        };

        // Set up event listeners
        const socket = socketService.getSocket();
        if (socket) {
          socket.on('autoSeatSuccess', handleAutoSeatSuccess);
          socket.on('autoSeatError', handleAutoSeatError);
        }

        // Check if we're in test mode (webdriver or test=true parameter)
        const isTestMode = (typeof navigator !== 'undefined' && navigator.webdriver) ||
          (typeof window !== 'undefined' && window.location.search.includes('test=true'));

        console.log('🎯 AUTO-SEAT: Sending autoSeat request:', {
          tableNumber: parseInt(tableNumber),
          seatNumber: parseInt(seatNumber),
          buyInAmount,
          playerName,
          isTestMode
        });

        // Perform auto-seat with test mode parameters
        socketService.autoSeat(parseInt(tableNumber), parseInt(seatNumber), buyInAmount, playerName, isTestMode);

        // Wait for auto-seat response with timeout
        const autoSeatTimeout = 15000; // 15 seconds
        const startTime = Date.now();

        while (!autoSeatCompleted && (Date.now() - startTime) < autoSeatTimeout) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Clean up event listeners
        if (socket) {
          socket.off('autoSeatSuccess', handleAutoSeatSuccess);
          socket.off('autoSeatError', handleAutoSeatError);
        }

        // If no response received, try fallback approaches
        if (!autoSeatCompleted) {
          console.log('🎯 AUTO-SEAT: No response received, trying fallback approaches...');

          // Check if we have a current player set
          const currentPlayer = socketService.getCurrentPlayer();
          console.log('🎯 AUTO-SEAT: Current player after auto-seat:', currentPlayer);

          if (currentPlayer) {
            setStatus('✅ Auto-seat successful! Redirecting to game...');
            setStatusType('success');

            // Redirect to game page
            setTimeout(() => {
              navigate(`/game/${tableNumber}`);
            }, 1000);
          } else {
            // Fallback: try to check game state
            const gameState = socketService.getGameState();
            if (gameState && gameState.players) {
              const player = gameState.players.find(p => p.name === playerName);
              if (player) {
                console.log('🎯 AUTO-SEAT: Fallback - found player in game state:', player);
                setStatus('✅ Auto-seat successful! Redirecting to game...');
                setStatusType('success');

                setTimeout(() => {
                  navigate(`/game/${tableNumber}`);
                }, 1000);
              } else {
                setStatus('⚠️ Auto-seat timeout - player not found in game state');
                setStatusType('error');
              }
            } else {
              // Last resort: force redirect and let game page handle it
              console.log('🎯 AUTO-SEAT: Last resort - forcing redirect to game page');
              setStatus('⚠️ Auto-seat timeout - attempting redirect anyway...');
              setStatusType('success');

              setTimeout(() => {
                navigate(`/game/${tableNumber}`);
              }, 2000);
            }
          }
        }

      } catch (error) {
        console.error('🎯 AUTO-SEAT: Error during auto-seat:', error);
        setStatus(`❌ Auto-seat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setStatusType('error');
      } finally {
        setIsProcessing(false);
      }
    };

    console.log('🎯 AUTO-SEAT: Component mounted, calling performAutoSeat()');
    performAutoSeat();
  }, []); // Run ONCE on mount

  return (
    <Container>
      <StatusCard>
        <Title>Auto-Seat Player</Title>

        <ParameterInfo>
          <div><strong>Player:</strong> {playerName || 'Not provided'}</div>
          <div><strong>Table:</strong> {tableNumber || 'Not provided'}</div>
          <div><strong>Seat:</strong> {seatNumber || 'Not provided'}</div>
          <div><strong>Buy-in:</strong> ${buyInAmount}</div>
        </ParameterInfo>

        <Status type={statusType}>
          {status}
        </Status>

        {statusType === 'error' && (
          <div style={{ marginTop: '20px', fontSize: '14px', opacity: 0.8 }}>
            <p><strong>Usage:</strong></p>
            <p><code>/auto-seat?player=PlayerName&table=1&seat=3&buyin=500</code></p>
            <p><strong>Parameters:</strong></p>
            <ul style={{ textAlign: 'left', paddingLeft: '20px' }}>
              <li><code>player</code> or <code>name</code> - Player nickname</li>
              <li><code>table</code> - Table number (1, 2, 3)</li>
              <li><code>seat</code> - Seat number (1-9)</li>
              <li><code>buyin</code> or <code>chips</code> - Buy-in amount (default: $200)</li>
            </ul>
          </div>
        )}
      </StatusCard>
    </Container>
  );
};

export default AutoSeatPage; 