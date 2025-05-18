import React from 'react';
import styled from 'styled-components';
import { Player } from '../types/game';
import { Avatar } from './Avatar';

const ListContainer = styled.div`
  position: fixed;
  right: 2rem;
  top: 2rem;
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 1rem;
  padding: 1.5rem;
  min-width: 200px;
  max-width: 300px;
  border: 2px solid #1b4d3e;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 100;
`;

const ListTitle = styled.h3`
  color: #ffd700;
  margin: 0 0 1.5rem 0;
  text-align: center;
  font-size: 1.2rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ListSection = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  color: #4caf50;
  margin: 0 0 0.8rem 0;
  font-size: 1rem;
  border-bottom: 1px solid #4caf50;
  padding-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;

  span {
    font-size: 0.9rem;
    opacity: 0.8;
  }
`;

const UserList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #4caf50;
    border-radius: 3px;
  }
`;

const UserItem = styled.li<{ $isCurrentUser?: boolean; $isAway?: boolean }>`
  color: ${props => props.$isCurrentUser ? '#ffd700' : 'white'};
  padding: 0.5rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
  opacity: ${props => props.$isAway ? 0.6 : 1};
  background-color: ${props => props.$isCurrentUser ? 'rgba(76, 175, 80, 0.2)' : 'transparent'};

  &:hover {
    background-color: ${props => props.$isCurrentUser ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  }
`;

const UserInfo = styled.div`
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PlayerStatus = styled.span`
  font-size: 0.8rem;
  color: #ffd700;
`;

interface OnlineListProps {
  players: Player[];
  observers: string[];
  currentPlayerId?: string;
}

export const OnlineList: React.FC<OnlineListProps> = ({
  players,
  observers,
  currentPlayerId
}) => {
  // Create a basic avatar for observers
  const createObserverAvatar = (name: string) => {
    return {
      type: 'initials' as const,
      initials: name.substring(0, 2).toUpperCase(),
      color: '#1b4d3e'
    };
  };

  return (
    <ListContainer>
      <ListTitle>Online Users</ListTitle>
      
      {/* Players Section */}
      <ListSection>
        <SectionTitle>
          Players <span>({players.length})</span>
        </SectionTitle>
        <UserList>
          {players.map(player => (
            <UserItem 
              key={player.id}
              $isCurrentUser={player.id === currentPlayerId}
              $isAway={player.isAway}
            >
              <Avatar 
                avatar={player.avatar}
                size="small"
                isActive={player.id === currentPlayerId}
                isAway={player.isAway}
              />
              <UserInfo>
                {player.name} - Seat {player.seatNumber + 1}
                <div>
                  {player.isAway && <PlayerStatus>(Away)</PlayerStatus>}
                  {player.id === currentPlayerId && <PlayerStatus>(You)</PlayerStatus>}
                </div>
              </UserInfo>
            </UserItem>
          ))}
          {players.length === 0 && (
            <UserItem>No players seated</UserItem>
          )}
        </UserList>
      </ListSection>

      {/* Observers Section */}
      <ListSection>
        <SectionTitle>
          Observers <span>({observers.length})</span>
        </SectionTitle>
        <UserList>
          {observers.map(observer => (
            <UserItem key={observer}>
              <Avatar 
                avatar={createObserverAvatar(observer)}
                size="small"
              />
              <span>{observer}</span>
            </UserItem>
          ))}
          {observers.length === 0 && (
            <UserItem>No observers</UserItem>
          )}
        </UserList>
      </ListSection>
    </ListContainer>
  );
}; 