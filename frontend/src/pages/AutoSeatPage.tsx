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
  const [status, setStatus] = useState<string>('Initializing...');
  const [statusType, setStatusType] = useState<'loading' | 'success' | 'error'>('loading');

  // Get parameters from URL
  const playerName = searchParams.get('player') || searchParams.get('name');
  const tableNumber = searchParams.get('table');
  const seatNumber = searchParams.get('seat');

  useEffect(() => {
    const autoSeatPlayer = async () => {
      try {
        // Validate parameters
        if (!playerName || !tableNumber || !seatNumber) {
          setStatus('❌ Missing required parameters. Please provide: player, table, and seat');
          setStatusType('error');
          return;
        }

        setStatus('🔄 Connecting to server...');
        setStatusType('loading');

        // Store nickname for socketService
        localStorage.setItem('nickname', playerName);

        // Connect to socket service
        socketService.connect();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for connection

        setStatus('🔐 Logging in as ' + playerName + '...');
        
        // Login with the provided player name
        socketService.emitUserLogin(playerName);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for login

        setStatus('🏃 Joining table ' + tableNumber + '...');
        
        // Join the specified table as observer first
        socketService.joinTable(parseInt(tableNumber));
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for table join

        setStatus('💺 Taking seat ' + seatNumber + '...');
        
        // Take the specified seat with default buy-in
        socketService.takeSeat(parseInt(seatNumber), 100);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for seat taken

        setStatus('✅ Successfully seated! Redirecting to game...');
        setStatusType('success');
        
        // Wait a moment and then redirect to the game using the actual game ID received from backend
        setTimeout(() => {
          // Get the game ID from navigationService which should have been set during navigation
          const actualGameId = navigationService.getCurrentGameId();
          if (actualGameId) {
            navigate(`/game/${actualGameId}`);
          } else {
            // Fallback to table-based URL if no game ID available
            navigate(`/game/${tableNumber}`);
          }
        }, 2000);

      } catch (error: any) {
        console.error('Auto-seat failed:', error);
        setStatus('❌ Failed: ' + error.message);
        setStatusType('error');
      }
    };

    // Set up error listener
    const errorHandler = (error: { message: string }) => {
      setStatus('❌ Error: ' + error.message);
      setStatusType('error');
    };
    socketService.onError(errorHandler);

    autoSeatPlayer();

    // Cleanup is handled by socketService internally
    return () => {
      // No manual cleanup needed for public API
    };
  }, [playerName, tableNumber, seatNumber, navigate]);

  return (
    <Container>
      <StatusCard>
        <Title>Auto-Seat Player</Title>
        
        <ParameterInfo>
          <div><strong>Player:</strong> {playerName || 'Not provided'}</div>
          <div><strong>Table:</strong> {tableNumber || 'Not provided'}</div>
          <div><strong>Seat:</strong> {seatNumber || 'Not provided'}</div>
        </ParameterInfo>

        <Status type={statusType}>
          {status}
        </Status>

        {statusType === 'error' && (
          <div style={{ marginTop: '20px', fontSize: '14px', opacity: 0.8 }}>
            <p><strong>Usage:</strong></p>
            <p><code>/auto-seat?player=PlayerName&table=1&seat=3</code></p>
            <p>Or: <code>/auto-seat?name=PlayerName&table=1&seat=3</code></p>
          </div>
        )}
      </StatusCard>
    </Container>
  );
};

export default AutoSeatPage; 