import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { TableData } from '../../types/table';
import { formatMoney } from '../../utils/formatUtils';

export interface JoinDialogProps {
  table: TableData;
  onClose: () => void;
  onJoin: (nickname: string, buyIn: number) => void;
}

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const DialogContent = styled.div`
  background: linear-gradient(135deg, #1b4d3e, #0d2c24);
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  max-width: 500px;
  width: 90%;
  border: 2px solid #ffd700;
  color: white;
`;

const DialogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 215, 0, 0.5);
`;

const Title = styled.h2`
  color: #ffd700;
  margin: 0;
  font-size: 1.5rem;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  transition: color 0.2s;

  &:hover {
    color: #ffd700;
  }
`;

const TableInfo = styled.div`
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

const InfoItem = styled.div`
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
`;

const InfoLabel = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.25rem;
`;

const InfoValue = styled.div`
  font-size: 1rem;
  color: #ffd700;
  font-weight: bold;
`;

const Form = styled.form`
  margin-top: 1.5rem;
`;

const InputGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #e0e0e0;
  font-size: 0.9rem;
`;

const TextInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 215, 0, 0.5);
  background-color: rgba(0, 0, 0, 0.2);
  color: white;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #ffd700;
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.3);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${props => props.$variant === 'primary' ? 'transparent' : '#ffd700'};
  background-color: ${props => props.$variant === 'primary' ? '#ffd700' : 'transparent'};
  color: ${props => props.$variant === 'primary' ? '#1b4d3e' : '#ffd700'};
  font-weight: ${props => props.$variant === 'primary' ? 'bold' : 'normal'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    background-color: ${props => props.$variant === 'primary' ? '#fff0a0' : 'rgba(255, 215, 0, 0.1)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const StatusBadge = styled.span<{ $status: TableData['status'] }>`
  background: ${({ $status }) => {
    switch ($status) {
      case 'active':
        return 'rgba(30, 142, 62, 0.9)';
      case 'waiting':
        return 'rgba(230, 81, 0, 0.9)';
      case 'full':
        return 'rgba(198, 40, 40, 0.9)';
      default:
        return 'rgba(102, 102, 102, 0.9)';
    }
  }};
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  text-transform: capitalize;
`;

export const JoinDialog: React.FC<JoinDialogProps> = ({ table, onClose, onJoin }) => {
  const [nickname, setNickname] = useState('');
  const [buyIn, setBuyIn] = useState(table.minBuyIn);

  useEffect(() => {
    // Load nickname from localStorage if available
    const savedNickname = localStorage.getItem('nickname');
    if (savedNickname) {
      setNickname(savedNickname);
    }

    // Handle escape key press
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim() && buyIn >= table.minBuyIn && buyIn <= table.maxBuyIn) {
      onJoin(nickname.trim(), buyIn);
    }
  };

  return (
    <DialogOverlay onClick={onClose}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <Title>Join Table: {table.name}</Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </DialogHeader>

        <TableInfo>
          <InfoItem>
            <InfoLabel>Game Type</InfoLabel>
            <InfoValue>{table.gameType} Hold'em</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Stakes</InfoLabel>
            <InfoValue>{table.stakes}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Players</InfoLabel>
            <InfoValue>
              {table.players}/{table.maxPlayers}
            </InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Table Status</InfoLabel>
            <InfoValue>
              <StatusBadge $status={table.status}>
                {table.status}
              </StatusBadge>
            </InfoValue>
          </InfoItem>
        </TableInfo>

        <div>
          <InfoLabel>Buy-in Range</InfoLabel>
          <InfoValue style={{ fontSize: '1.2rem' }}>
            {formatMoney(table.minBuyIn)} - {formatMoney(table.maxBuyIn)}
          </InfoValue>
        </div>

        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="nickname">Your Nickname</Label>
            <TextInput
              id="nickname"
              type="text"
              placeholder="Enter your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoFocus
              required
              maxLength={20}
              data-testid="nickname-input"
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="buyIn">Buy-in Amount</Label>
            <TextInput
              id="buyIn"
              type="number"
              placeholder={`${table.minBuyIn} - ${table.maxBuyIn}`}
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
              min={table.minBuyIn}
              max={table.maxBuyIn}
              required
              data-testid="buy-in-input"
            />
          </InputGroup>

          <ButtonGroup>
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              $variant="primary"
              disabled={!nickname.trim() || table.status === 'full' || buyIn < table.minBuyIn || buyIn > table.maxBuyIn}
              data-testid="confirm-buy-in"
            >
              {table.status === 'full' ? 'Table is Full' : 'Join Table'}
            </Button>
          </ButtonGroup>
        </Form>
      </DialogContent>
    </DialogOverlay>
  );
}; 