import React from 'react';
import styled from 'styled-components';
import { formatMoney } from '../../utils/formatUtils';
import { TableData } from '../../types/table';

interface TableCardProps {
  table: TableData;
  onClick: () => void;
}

const Card = styled.div`
  background: #2c8a3d;
  border-radius: 100px / 60px;
  padding: 1.5rem;
  box-shadow: 
    0 8px 16px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 8px solid #1b4d3e;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(0, 0, 0, 0.05) 10px,
      rgba(0, 0, 0, 0.05) 20px
    );
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 
      0 12px 24px rgba(0, 0, 0, 0.3),
      inset 0 2px 4px rgba(255, 255, 255, 0.1);
  }
`;

const TableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  background: rgba(0, 0, 0, 0.7);
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid #ffd700;
`;

const TableName = styled.h3`
  margin: 0;
  color: #ffd700;
  font-size: 1.1rem;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
`;

const Stakes = styled.div`
  font-weight: 600;
  color: #ffd700;
  font-size: 1.1rem;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
`;

const GameType = styled.div`
  font-size: 0.875rem;
  color: white;
  margin: 0.5rem 0;
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.5rem;
  border-radius: 4px;
`;

const StatusBadge = styled.span<{ $status: TableData['status'] }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
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
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  border: 1px solid ${({ $status }) => {
    switch ($status) {
      case 'active':
        return '#2ecc71';
      case 'waiting':
        return '#ff9800';
      case 'full':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  }};
`;

const Info = styled.div`
  margin-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  font-size: 0.875rem;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const BuyInInfo = styled.div`
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #ffd700;
  text-align: center;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  border: 1px solid #ffd700;
`;

export const TableCard: React.FC<TableCardProps> = ({ table, onClick }) => {
  return (
    <Card onClick={onClick}>
      <TableHeader>
        <TableName>{table.name}</TableName>
        <Stakes>{table.stakes}</Stakes>
      </TableHeader>
      <GameType>
        {table.gameType} Hold'em ({table.maxPlayers}-max)
      </GameType>
      <StatusBadge $status={table.status}>
        {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
      </StatusBadge>
      <Info>
        <span>Players: {table.players}/{table.maxPlayers}</span>
        <span>Observers: {table.observers}</span>
      </Info>
      <BuyInInfo>
        Buy-in: {formatMoney(table.minBuyIn)} - {formatMoney(table.maxBuyIn)}
      </BuyInInfo>
    </Card>
  );
}; 