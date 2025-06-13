import React from 'react';
import styled from 'styled-components';

const ListContainer = styled.div`
  position: fixed;
  right: 2rem;
  top: 12rem;
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 1rem;
  padding: 1.5rem;
  min-width: 200px;
  max-width: 300px;
  border: 2px solid #1b4d3e;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 100;
`;

const SectionTitle = styled.h3`
  color: #ffd700;
  margin: 0 0 1rem 0;
  text-align: center;
  font-size: 1.2rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ObserversList = styled.div`
  margin-top: 0.5rem;
`;

const ObserverItem = styled.div`
  color: #e0e0e0;
  padding: 0.25rem 0;
  font-size: 0.9rem;
  text-align: center;
`;

const EmptyMessage = styled.div`
  color: #888;
  font-style: italic;
  text-align: center;
  font-size: 0.85rem;
  margin-top: 0.5rem;
`;

interface OnlineListProps {
  onlineUsers?: number;
  players?: any[];
  observers?: string[];
  currentPlayerId?: string;
  showMode?: 'onlineUsers' | 'observers';
}

export const OnlineList: React.FC<OnlineListProps> = ({ 
  onlineUsers, 
  players = [], 
  observers = [], 
  currentPlayerId,
  showMode = 'onlineUsers'
}) => {
  // If showMode is 'observers', display observers list
  if (showMode === 'observers') {
    return (
      <ListContainer data-testid="online-users-list">
        <SectionTitle>Observers ({observers.length})</SectionTitle>
        <ObserversList>
          {observers.length > 0 ? (
            observers.map((observer, index) => (
              <ObserverItem key={index} data-testid={`observer-${index}`}>
                {observer}
              </ObserverItem>
            ))
          ) : (
            <EmptyMessage>No observers</EmptyMessage>
          )}
        </ObserversList>
      </ListContainer>
    );
  }

  // Default mode: show online users count (for lobby)
  const totalUsers = onlineUsers !== undefined 
    ? onlineUsers 
    : players.length + observers.length;

  return (
    <ListContainer data-testid="online-users-list">
      <SectionTitle>Online Users: {totalUsers}</SectionTitle>
    </ListContainer>
  );
}; 