import React, { useState } from 'react';
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

const BuyInSection = styled.div`
  margin-bottom: 2rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  border: 1px solid #ffd700;
  background: rgba(0, 0, 0, 0.8);
  color: #ffd700;
  font-size: 1rem;
  margin-top: 0.5rem;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.2);
  }
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

const ErrorMessage = styled.div`
  color: #ff4444;
  text-align: center;
  margin-top: 1rem;
`;

export const JoinGamePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const table = location.state?.table as TableData;
  const [buyIn, setBuyIn] = useState(table?.minBuyIn || 0);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  if (!table) {
    navigate('/lobby');
    return null;
  }

  const handleBuyInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setBuyIn(value);
    setError('');
  };

  const handleJoin = () => {
    if (buyIn < table.minBuyIn || buyIn > table.maxBuyIn) {
      setError(`Buy-in must be between ${formatMoney(table.minBuyIn)} and ${formatMoney(table.maxBuyIn)}`);
      return;
    }

    try {
      setIsJoining(true);
      // Connect to socket and initialize the game session
      socketService.connect();
      
      // Listen for errors
      const errorHandler = (err: { message: string }) => {
        setError(err.message || 'Failed to join table. Please try again.');
        setIsJoining(false);
      };
      socketService.onError(errorHandler);
      
      // Join the table - ensure tableId is a number
      socketService.joinTable(Number(table.id), buyIn);
      
      // Navigate to the game page with table and buy-in info after a short delay
      // to give the socket time to connect
      setTimeout(() => {
        navigate(`/game/${table.id}`, { 
          state: { 
            table,
            buyIn
          }
        });
      }, 1000);
    } catch (err) {
      setError('Failed to join table. Please try again.');
      setIsJoining(false);
    }
  };

  return (
    <Container>
      <JoinForm>
        <Title>Join Table</Title>
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
            <Label>Buy-in Range:</Label>
            <span>{formatMoney(table.minBuyIn)} - {formatMoney(table.maxBuyIn)}</span>
          </InfoRow>
        </TableInfo>

        <BuyInSection>
          <Label>Buy-in Amount</Label>
          <Input
            type="number"
            value={buyIn}
            onChange={handleBuyInChange}
            min={table.minBuyIn}
            max={table.maxBuyIn}
            step={table.bigBlind}
            disabled={isJoining}
          />
        </BuyInSection>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ButtonGroup>
          <Button onClick={() => navigate('/lobby')} disabled={isJoining}>Cancel</Button>
          <Button 
            $primary 
            onClick={handleJoin} 
            disabled={isJoining}
          >
            {isJoining ? 'Joining...' : 'Join Table'}
          </Button>
        </ButtonGroup>
      </JoinForm>
    </Container>
  );
}; 