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
  const buyInAmount = parseInt(searchParams.get('buyin') || searchParams.get('chips') || '200');

  useEffect(() => {
    const performAutoSeat = async () => {
      try {
        // Validate parameters
        if (!playerName || !tableNumber || !seatNumber) {
          setStatus('❌ Missing required parameters. Please provide: player, table, and seat');
          setStatusType('error');
          return;
        }

        setStatus('🔌 Connecting to server...');
        
        // Connect to WebSocket
        socketService.connect();
        
        // Wait for connection
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setStatus('🔐 Authenticating as ' + playerName + '...');
        
        // Store nickname for socketService
        localStorage.setItem('nickname', playerName);
        
        // Authenticate with the player name
        socketService.emitUserLogin(playerName);
        
        // Wait for authentication
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setStatus('🏃 Joining table...');
        
        // Get the actual table ID from the database
        try {
          const response = await fetch('http://localhost:3001/api/tables');
          const tables = await response.json();
          
          if (tables.length === 0) {
            throw new Error('No tables available');
          }
          
          // Use the first table (or you could add logic to select specific table)
          const actualTableId = tables[0].id;
          console.log(`🎯 Using actual table ID: ${actualTableId} instead of table number: ${tableNumber}`);
          
          // Join the table
          socketService.joinTable(actualTableId, buyInAmount);
          
          // Wait for table join
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          setStatus('💺 Taking seat ' + seatNumber + ' with $' + buyInAmount + ' buy-in...');
          
          // Take the specified seat with specified buy-in amount
          console.log(`🎯 AUTO-SEAT: Attempting to take seat ${seatNumber} with buy-in ${buyInAmount}`);
          socketService.takeSeat(parseInt(seatNumber), buyInAmount);
          
          // Wait longer for seat taken and add debug logging
          console.log(`🎯 AUTO-SEAT: Waiting for seat confirmation...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait longer for seat taken
          
          // Check if we're still connected
          const socket = socketService.getSocket();
          console.log(`🎯 AUTO-SEAT: Socket status - exists: ${!!socket}, connected: ${socket?.connected}, id: ${socket?.id}`);

          // Check if we received any error events
          let seatError = false;
          const errorTimeout = setTimeout(() => {
            seatError = true;
            console.log(`🎯 AUTO-SEAT: Seat taking timed out or failed`);
          }, 3000);

          // Listen for seat taken event
          const seatTakenHandler = () => {
            clearTimeout(errorTimeout);
            console.log(`🎯 AUTO-SEAT: Seat taken successfully`);
          };
          
          const seatErrorHandler = (error: any) => {
            clearTimeout(errorTimeout);
            seatError = true;
            console.log(`🎯 AUTO-SEAT: Seat taking error:`, error);
          };

          socket?.on('seatTaken', seatTakenHandler);
          socket?.on('error', seatErrorHandler);

          // Wait for seat confirmation or error
          await new Promise(resolve => {
            setTimeout(() => {
              socket?.off('seatTaken', seatTakenHandler);
              socket?.off('error', seatErrorHandler);
              resolve(true);
            }, 3000);
          });

          if (seatError) {
            throw new Error('Failed to take seat - timeout or error occurred');
          }

          setStatus('✅ Successfully seated! Redirecting to game...');
          setStatusType('success');
          
          // Wait a moment and then redirect to the game using actual table ID
          setTimeout(() => {
            // Use actual table ID for redirection in table-only architecture
            navigate(`/game/${actualTableId}`);
          }, 2000);
          
        } catch (error) {
          console.error('🎯 AUTO-SEAT: Error getting tables or joining:', error);
          setStatus('❌ Failed to join table: ' + (error as Error).message);
          setStatusType('error');
        }
        
      } catch (error) {
        console.error('🎯 AUTO-SEAT: Error during auto-seat process:', error);
        setStatus('❌ Auto-seat failed: ' + (error as Error).message);
        setStatusType('error');
      }
    };

    performAutoSeat();
  }, [playerName, tableNumber, seatNumber, buyInAmount, navigate]);

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