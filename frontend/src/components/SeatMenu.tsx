import React from 'react';
import styled from 'styled-components';

const MenuContainer = styled.div`
  position: absolute;
  background-color: rgba(0, 0, 0, 0.95);
  border-radius: 8px;
  border: 1px solid #4caf50;
  padding: 0.5rem;
  min-width: 150px;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

interface MenuItemProps {
  'data-warning'?: boolean;
}

const MenuItem = styled.button<MenuItemProps>`
  width: 100%;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  color: ${props => props['data-warning'] ? '#ff4444' : 'white'};
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background-color: ${props => props['data-warning'] ? 'rgba(255, 68, 68, 0.2)' : 'rgba(76, 175, 80, 0.2)'};
  }

  &:not(:last-child) {
    margin-bottom: 0.2rem;
  }
`;

const MenuIcon = styled.span`
  font-size: 1rem;
  opacity: 0.8;
`;

export type SeatAction = 'leaveMidway' | 'standUp' | 'leaveTable' | 'comeBack' | 'check' | 'bet' | 'fold' | 'start';

interface SeatMenuProps {
  position: { x: number; y: number };
  isAway: boolean;
  onAction: (action: SeatAction) => void;
  onClose: () => void;
}

export const SeatMenu: React.FC<SeatMenuProps> = ({
  position,
  isAway,
  onAction,
  onClose
}) => {
  const handleAction = (action: SeatAction) => {
    onAction(action);
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} />
      <MenuContainer style={{ top: position.y, left: position.x }}>
        {isAway ? (
          <MenuItem onClick={() => handleAction('comeBack')} data-testid="come-back-button">
            <MenuIcon>↩️</MenuIcon>
            I Am Back
          </MenuItem>
        ) : (
          <MenuItem onClick={() => handleAction('leaveMidway')} data-testid="leave-midway-button">
            <MenuIcon>⏸️</MenuIcon>
            Leave Midway
          </MenuItem>
        )}
        <MenuItem onClick={() => handleAction('standUp')} data-testid="stand-up-button">
          <MenuIcon>🪑</MenuIcon>
          Stand Up
        </MenuItem>
        <MenuItem data-warning onClick={() => handleAction('leaveTable')} data-testid="leave-table-button">
          <MenuIcon>🚪</MenuIcon>
          Leave Table
        </MenuItem>
      </MenuContainer>
    </>
  );
}; 