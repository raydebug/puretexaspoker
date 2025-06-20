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

const UsersList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const UserItem = styled.li`
  color: white;
  padding: 0.5rem;
  margin: 0.25rem 0;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  observers?: string[];
  showMode?: 'onlineUsers' | 'observers';
}

export const OnlineList: React.FC<OnlineListProps> = ({ 
  onlineUsers, 
  observers,
  showMode = 'onlineUsers'
}) => {
  // Default to empty arrays if not provided
  const observersArray = observers || [];
  
  // If observers are explicitly provided or showMode is 'observers', display observers list
  const shouldShowObservers = showMode === 'observers' || observers !== undefined;
  
  if (shouldShowObservers) {
    return (
      <ListContainer data-testid="online-list">
        <SectionTitle>Observers ({observersArray.length})</SectionTitle>
        <UsersList>
          {observersArray.length > 0 ? (
            observersArray.map((observer, index) => (
              <UserItem key={index} role="listitem" data-testid={`observer-${index}`}>
                <span>{observer}</span>
              </UserItem>
            ))
          ) : (
            <EmptyMessage>No observers</EmptyMessage>
          )}
        </UsersList>
      </ListContainer>
    );
  }

  // Default mode: show online users count (for lobby when no observers provided)
  const totalUsers = onlineUsers !== undefined ? onlineUsers : observersArray.length;

  return (
    <ListContainer data-testid="online-list">
      <SectionTitle>Online Users: {totalUsers}</SectionTitle>
    </ListContainer>
  );
}; 