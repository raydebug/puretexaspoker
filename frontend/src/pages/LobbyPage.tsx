import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { TableGrid } from '../components/Lobby/TableGrid';
import { TableFilters } from '../components/Lobby/TableFilters';
import { socketService } from '../services/socketService';

const LobbyContainer = styled.div`
  min-height: 100vh;
  background-color: #8b0000;
  background-image: repeating-linear-gradient(
    45deg,
    rgba(0, 0, 0, 0.2),
    rgba(0, 0, 0, 0.2) 10px,
    rgba(0, 0, 0, 0.3) 10px,
    rgba(0, 0, 0, 0.3) 20px
  );
  padding: 2rem;
  color: white;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 3rem;
  color: #ffd700;
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.6);
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: #e0e0e0;
  margin-top: 0.5rem;
`;

const Content = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const UserInfo = styled.div`
  position: fixed;
  top: 2rem;
  right: 2rem;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #ffd700;
  z-index: 100;
`;

const UserName = styled.div`
  color: #ffd700;
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
`;

const LogoutButton = styled.button`
  background-color: #8b0000;
  color: white;
  border: 1px solid #ffd700;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:hover {
    background-color: #a00;
    transform: translateY(-2px);
  }
`;

const LobbyPage: React.FC = () => {
  const [userName, setUserName] = useState<string>('');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    players: 'all',
    gameType: 'all',
  });

  useEffect(() => {
    // Connect to socket
    socketService.connect();

    // Get saved nickname
    const nickname = localStorage.getItem('nickname') || '';
    setUserName(nickname);

    // Request tables data
    socketService.requestLobbyTables();

    return () => {
      // No need to disconnect here as users might navigate to a game
    };
  }, []);

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('nickname');
    // Redirect to login page
    window.location.href = '/login';
  };

  return (
    <LobbyContainer>
      <Header>
        <Title>Texas Hold'em Poker Lobby</Title>
        <Subtitle>Choose a table to join or observe</Subtitle>
      </Header>

      {userName && (
        <UserInfo>
          <UserName>Welcome, {userName}</UserName>
          <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
        </UserInfo>
      )}

      <Content>
        <TableFilters
          filters={filters}
          onFilterChange={handleFilterChange}
        />
        <TableGrid filters={filters} />
      </Content>
    </LobbyContainer>
  );
};

export default LobbyPage; 