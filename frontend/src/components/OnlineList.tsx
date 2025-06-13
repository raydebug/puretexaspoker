import React from 'react';
import styled from 'styled-components';

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
  margin: 0;
  text-align: center;
  font-size: 1.2rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

interface OnlineListProps {
  onlineUsers: number;
}

export const OnlineList: React.FC<OnlineListProps> = ({ onlineUsers }) => {
  return (
    <ListContainer data-testid="online-users-list">
      <ListTitle>Online Users: {onlineUsers}</ListTitle>
    </ListContainer>
  );
}; 