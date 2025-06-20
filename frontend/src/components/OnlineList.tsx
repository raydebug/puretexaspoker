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

const UserItem = styled.li.withConfig({
  shouldForwardProp: (prop) => !['isCurrentUser', 'isAway'].includes(prop),
})<{ isCurrentUser?: boolean; isAway?: boolean }>`
  color: ${props => props.isCurrentUser ? '#ffd700' : 'white'};
  background-color: ${props => props.isCurrentUser ? 'rgba(76, 175, 80, 0.2)' : 'transparent'};
  opacity: ${props => props.isAway ? '0.6' : '1'};
  padding: 0.5rem;
  margin: 0.25rem 0;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StatusIndicator = styled.span`
  font-size: 0.8rem;
  color: #ffd700;
`;

const EmptyMessage = styled.div`
  color: #888;
  font-style: italic;
  text-align: center;
  font-size: 0.85rem;
  margin-top: 0.5rem;
`;

const Section = styled.div`
  margin-bottom: 1.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
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
  players, 
  observers, 
  currentPlayerId,
  showMode = 'onlineUsers'
}) => {
  // Default to empty arrays if not provided
  const playersArray = players || [];
  const observersArray = observers || [];
  
  // If players or observers are explicitly provided (even empty arrays), or showMode is 'observers', display full lists
  const shouldShowDetailedView = showMode === 'observers' || players !== undefined || observers !== undefined;
  
  if (shouldShowDetailedView) {
    return (
      <ListContainer data-testid="online-list">
        <Section>
          <SectionTitle>Players ({playersArray.length})</SectionTitle>
          <UsersList>
            {playersArray.length > 0 ? (
              playersArray.map((player, index) => (
                <UserItem 
                  key={player.id || index}
                  isCurrentUser={player.id === currentPlayerId}
                  isAway={player.isAway}
                  role="listitem"
                >
                  <span>
                    {player.name} - Seat {(player.seatNumber || player.position || 0) + 1}
                  </span>
                  <span>
                    {player.id === currentPlayerId && <StatusIndicator>(You)</StatusIndicator>}
                    {player.isAway && <StatusIndicator>(Away)</StatusIndicator>}
                  </span>
                </UserItem>
              ))
            ) : (
              <EmptyMessage>No players seated</EmptyMessage>
            )}
          </UsersList>
        </Section>
        
        <Section>
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
        </Section>
      </ListContainer>
    );
  }

  // Default mode: show online users count (for lobby when no players/observers provided)
  const totalUsers = onlineUsers !== undefined 
    ? onlineUsers 
    : playersArray.length + observersArray.length;

  return (
    <ListContainer data-testid="online-list">
      <SectionTitle>Online Users: {totalUsers}</SectionTitle>
    </ListContainer>
  );
}; 