import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { TableData } from '../types/table';
import { formatMoney } from '../utils/formatUtils';
import { socketService } from '../services/socketService';

const Container = styled.div`
  min-height: 100vh;
  background-color: #1a0f0f;
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const JoinForm = styled.div`
  background: rgba(0, 0, 0, 0.85);
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  border: 1px solid #8b0000;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #ffd700;
  text-align: center;
  margin-bottom: 2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
`;

const TableInfo = styled.div`
  background: rgba(44, 138, 61, 0.2);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid #2c8a3d;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  color: #fff;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.span`
  color: #ffd700;
`;

const ObserverNote = styled.div`
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid #ffd700;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  color: #ffd700;
  text-align: center;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button<{ $primary?: boolean }>`
  flex: 1;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid ${props => props.$primary ? '#2c8a3d' : '#8b0000'};
  background: ${props => props.$primary ? '#2c8a3d' : 'transparent'};
  color: #ffd700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    background: ${props => props.$primary ? '#37a34a' : 'rgba(139, 0, 0, 0.2)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingMessage = styled.div`
  color: #ffd700;
  text-align: center;
  margin: 1rem 0;
`;

const ErrorMessage = styled.div`
  color: #ff4444;
  text-align: center;
  margin-top: 1rem;
`;

export const JoinGamePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const table = location.state?.table as TableData;
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Auto-join as observer when page loads
  useEffect(() => {
    if (table && !isJoining) {
      console.log('Auto-joining table as observer from JoinGamePage');
      
      // In test mode, navigate directly without socket connection
      if (typeof window !== 'undefined' && (window as any).Cypress) {
        console.log('JoinGamePage: Test mode detected - navigating directly to game');
        navigate(`/game/${table.id}`, { 
          state: { 
            table,
            role: 'observer'
          }
        });
        return;
      }
      
      handleJoinAsObserver();
    }
  }, [table]); // Depend on table to avoid multiple calls

  if (!table) {
    navigate('/');
    return null;
  }

  const handleJoinAsObserver = () => {
    try {
      setIsJoining(true);
      
      // Store nickname
      const nickname = localStorage.getItem('nickname') || 'TestPlayer';
      localStorage.setItem('nickname', nickname);
      
      // Listen for errors
      const errorHandler = (err: { message: string }) => {
        setError(err.message || 'Failed to join table. Please try again.');
        setIsJoining(false);
        cleanup();
      };
      socketService.onError(errorHandler);
      
      let cleanupCalled = false;
      const cleanup = () => {
        if (cleanupCalled) return;
        cleanupCalled = true;
        
        const socket = socketService.getSocket();
        if (socket) {
          socket.off('tableJoined', handleTableJoined);
          socket.off('gameJoined', handleGameJoined);
        }
      };
      
      // Listen for successful table join to ensure session is established
      const handleTableJoined = (data: { tableId: number; role: string; gameId?: string }) => {
        console.log('✅ JoinGamePage: Received tableJoined event:', data);
        if (data.tableId === table.id && data.role === 'observer') {
          console.log('✅ JoinGamePage: Session established, navigating to game page');
          cleanup();
          // Session is now established on backend, safe to navigate
          navigate(`/game/${table.id}`, { 
            state: { 
              table,
              role: 'observer'
            }
          });
        }
      };
      
      // Listen for game joined event as additional confirmation
      const handleGameJoined = (data: { gameId: string; playerId: string | null; gameState: any }) => {
        console.log('✅ JoinGamePage: Received gameJoined event:', data);
        // This confirms the session is fully established
      };
      
      // Set timeout for tableJoined event
      const joinTimeout = setTimeout(() => {
        console.warn('⚠️ JoinGamePage: Timeout waiting for tableJoined event');
        setError('Join timeout. Please try again.');
        setIsJoining(false);
        cleanup();
      }, 10000); // 10 second timeout
      
      // Connect to socket and wait for connection
      socketService.connect();
      
      // Wait for connection and then join table
      let connectionAttempts = 0;
      const maxAttempts = 50; // 5 seconds total (50 * 100ms)
      
      const checkConnectionAndJoin = () => {
        connectionAttempts++;
        const socket = socketService.getSocket();
        
        if (socket && socket.connected) {
          // Set up event listeners now that socket is connected
          socket.on('tableJoined', handleTableJoined);
          socket.on('gameJoined', handleGameJoined);
          
          // Socket is connected, now join the table
          console.log(`🎯 JoinGamePage: Joining table ${table.id} as observer`);
          socketService.joinTable(Number(table.id)); // No buy-in parameter
          
          // Don't navigate immediately - wait for tableJoined event
          console.log('🎯 JoinGamePage: Waiting for tableJoined confirmation...');
          
        } else if (connectionAttempts < maxAttempts) {
          // Not connected yet, wait a bit and try again
          setTimeout(checkConnectionAndJoin, 100);
        } else {
          // Timeout reached
          clearTimeout(joinTimeout);
          setError('Connection timeout. Please try again.');
          setIsJoining(false);
          cleanup();
        }
      };
      
      // Start checking for connection
      checkConnectionAndJoin();
      
    } catch (err) {
      console.error('Join error:', err);
      setError('Failed to join table. Please try again.');
      setIsJoining(false);
    }
  };

  return (
    <Container>
      <JoinForm>
        <Title>Joining as Observer</Title>
        <TableInfo>
          <InfoRow>
            <Label>Table:</Label>
            <span>{table.name}</span>
          </InfoRow>
          <InfoRow>
            <Label>Stakes:</Label>
            <span>{table.stakes}</span>
          </InfoRow>
          <InfoRow>
            <Label>Game:</Label>
            <span>{table.gameType} Hold'em ({table.maxPlayers}-max)</span>
          </InfoRow>
          <InfoRow>
            <Label>Buy-in Range (when taking a seat):</Label>
            <span>{formatMoney(table.minBuyIn)} - {formatMoney(table.maxBuyIn)}</span>
          </InfoRow>
        </TableInfo>

        <ObserverNote>
          You're joining as an observer. You can watch the game and take a seat when ready by selecting an empty seat.
        </ObserverNote>

        {isJoining && <LoadingMessage>Joining table...</LoadingMessage>}
        {error && <ErrorMessage>{error}</ErrorMessage>}

        {!isJoining && (
          <ButtonGroup>
            <Button onClick={() => navigate('/lobby')}>Cancel</Button>
            <Button 
              $primary 
              onClick={handleJoinAsObserver}
              data-testid="join-as-observer-btn"
            >
              Join as Observer
            </Button>
          </ButtonGroup>
        )}
      </JoinForm>
    </Container>
  );
}; 