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
        
        // Set up authentication success listener
        let authSuccess = false;
        const authSuccessHandler = () => {
          authSuccess = true;
          console.log(`🎯 AUTO-SEAT: Authentication successful for ${playerName}`);
        };
        
        const socket = socketService.getSocket();
        console.log(`🎯 AUTO-SEAT: Socket state - exists: ${!!socket}, connected: ${socket?.connected}`);
        
        socket?.on('authenticated', authSuccessHandler);
        
        // Add error listeners to catch any issues
        const errorHandler = (error: any) => {
          console.error(`🎯 AUTO-SEAT: WebSocket error during authentication:`, error);
          setStatus('❌ Authentication error: ' + (error.message || 'Unknown error'));
          setStatusType('error');
        };
        
        socket?.on('error', errorHandler);
        socket?.on('tableError', errorHandler);
        socket?.on('seatError', errorHandler);
        
        // Authenticate with the player name
        socketService.emitUserLogin(playerName);
        
        // Wait for authentication to complete
        let authAttempts = 0;
        const maxAuthAttempts = 10;
        while (!authSuccess && authAttempts < maxAuthAttempts) {
          console.log(`🎯 AUTO-SEAT: Waiting for authentication... attempt ${authAttempts + 1}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          authAttempts++;
        }
        
        // Clean up auth listener
        socket?.off('authenticated', authSuccessHandler);
        
        if (!authSuccess) {
          throw new Error('Authentication failed - timeout');
        }
        
        setStatus('🎯 Auto-seating at table ' + tableNumber + ', seat ' + seatNumber + '...');
        
        // Use the table ID from URL parameter directly
        const actualTableId = parseInt(tableNumber);
        console.log(`🎯 Using table ID from URL: ${actualTableId}`);
        
        if (!actualTableId || isNaN(actualTableId)) {
          throw new Error('Invalid table ID provided');
        }
        
        // Set up auto-seat success listener
        let autoSeatSuccess = false;
        const autoSeatSuccessHandler = (data: any) => {
          autoSeatSuccess = true;
          console.log(`🎯 AUTO-SEAT: Auto-seat successful:`, data);
        };
        
        socket?.on('autoSeatSuccess', autoSeatSuccessHandler);
        
        // Add error listeners for auto-seat
        const autoSeatErrorHandler = (error: any) => {
          console.error(`🎯 AUTO-SEAT: WebSocket error during auto-seat:`, error);
          setStatus('❌ Auto-seat error: ' + (error.error || 'Unknown error'));
          setStatusType('error');
        };
        
        socket?.on('autoSeatError', autoSeatErrorHandler);
        
        // Call the new autoSeat method that combines join and seat
        console.log(`🎯 AUTO-SEAT: Calling autoSeat with table ${actualTableId}, seat ${seatNumber}, buyIn ${buyInAmount}`);
        socketService.autoSeat(actualTableId, parseInt(seatNumber), buyInAmount);
        
        // Wait for auto-seat to complete
        let autoSeatAttempts = 0;
        const maxAutoSeatAttempts = 10;
        while (!autoSeatSuccess && autoSeatAttempts < maxAutoSeatAttempts) {
          console.log(`🎯 AUTO-SEAT: Waiting for auto-seat confirmation... attempt ${autoSeatAttempts + 1}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          autoSeatAttempts++;
        }
        
        // Clean up auto-seat listener
        socket?.off('autoSeatSuccess', autoSeatSuccessHandler);
        
        if (!autoSeatSuccess) {
          throw new Error('Auto-seat failed - timeout');
        }

        setStatus('✅ Successfully seated! Redirecting to game...');
        setStatusType('success');
        
        // Wait a moment and then redirect to the game using actual table ID
        setTimeout(() => {
          // Use actual table ID for redirection in table-only architecture
          console.log(`🎯 AUTO-SEAT: Redirecting to game page /game/${actualTableId}`);
          navigate(`/game/${actualTableId}`);
        }, 2000);
        
      } catch (error) {
        console.error('🎯 AUTO-SEAT: Error during auto-seat process:', error);
        setStatus('❌ Auto-seat failed: ' + (error as Error).message);
        setStatusType('error');
      } finally {
        setIsProcessing(false);
      }
    };

    performAutoSeat();
  }, [playerName, tableNumber, seatNumber, buyInAmount, navigate, isProcessing]);

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