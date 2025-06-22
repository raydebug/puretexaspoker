import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { TableGrid } from '../components/Lobby/TableGrid';
import { TableFilters } from '../components/Lobby/TableFilters';
import { socketService } from '../services/socketService';
import { OnlineList } from '../components/OnlineList';
import { LoginModal } from '../components/LoginModal';
import Cookies from 'js-cookie';

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

const PlayerList = styled.div`
  margin-top: 1rem;
`;

const PlayerItem = styled.div<{ $highlighted?: boolean }>`
  padding: 0.5rem;
  color: ${props => props.$highlighted ? '#ffd700' : 'white'};
  background-color: ${props => props.$highlighted ? 'rgba(255, 215, 0, 0.1)' : 'transparent'};
  border-radius: 4px;
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
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>('');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    players: 'all',
    gameType: 'all',
  });
  const [showModal, setShowModal] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    const nickname = Cookies.get('playerNickname');
    if (nickname) {
      setUserName(nickname);
    }
    // No need to show modal automatically - let users browse anonymously
    
    // Connect socket and set up listeners (works for both authenticated and anonymous users)
    const connectAndSetup = async () => {
      try {
        await socketService.connect();
        
        // Clear any existing table session when returning to lobby
        // This ensures backend session data is cleared
        socketService.leaveTable();
        
        socketService.requestLobbyTables();
        socketService.onOnlineUsersUpdate((total: number) => {
          console.log(`🔍 FRONTEND: Received online users update: ${total}`);
          setOnlineUsers(total);
        });

        // If user is already authenticated (has cookie), emit login event
        if (nickname) {
          console.log(`🔍 FRONTEND: Emitting user login for existing user: ${nickname}`);
          socketService.emitUserLogin(nickname);
        }
      } catch (error) {
        console.error('Failed to connect socket in lobby:', error);
      }
    };
    
    connectAndSetup();

    // Cleanup on unmount
    return () => {
      // Don't disconnect socket here - it should persist across page navigation
      // socketService.disconnect();
    };
  }, []);

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogout = () => {
    // Emit user logout event to update online users count
    socketService.emitUserLogout();
    Cookies.remove('playerNickname');
    setUserName('');
    setShowModal(true);
  };

  const handleLogin = useCallback(async (nickname: string) => {
    console.log('🔍 FRONTEND: Login requested for:', nickname);
    
    // Save to both cookie AND localStorage for compatibility
    Cookies.set('playerNickname', nickname, { expires: 7 });
    localStorage.setItem('nickname', nickname);
    console.log('🔍 FRONTEND: Cookie and localStorage saved');
    
    // Update username state - this should close the modal
    setUserName(nickname);
    console.log('🔍 FRONTEND: Username state updated to:', nickname);
    
    // Socket operations (non-blocking)
    try {
      socketService.requestLobbyTables();
      socketService.emitUserLogin(nickname);
      console.log('🔍 FRONTEND: Socket operations completed');
    } catch (error) {
      console.error('🔍 FRONTEND: Socket error (non-critical):', error);
      // Don't throw - login should still work even if socket fails
    }
    
    console.log('🔍 FRONTEND: Login process completed successfully');
  }, []);

  const handleCloseModal = useCallback(() => {
    console.log('🔍 FRONTEND: Modal close requested');
    setShowModal(false);
    
    // Connect socket for anonymous browsing (read-only mode)
    const connectAnonymously = async () => {
      try {
        await socketService.connect();
        socketService.requestLobbyTables();
        // Don't set up the callback again - it's already set up in the main useEffect
      } catch (error) {
        console.error('Failed to connect socket anonymously:', error);
      }
    };
    connectAnonymously();
  }, []);

  // Debug modal state changes
  useEffect(() => {
    console.log('🔍 FRONTEND: Modal state changed to:', showModal);
    console.log('🔍 FRONTEND: Current userName:', userName);
    console.log('🔍 FRONTEND: Modal should be open:', showModal && !userName);
  }, [showModal, userName]);

  return (
    <LobbyContainer data-testid="lobby-container">
      <Header>
        <Title>Texas Hold'em Poker Lobby</Title>
        <Subtitle>Choose a table to join or observe</Subtitle>
      </Header>

      {userName ? (
        <UserInfo data-testid="user-info">
          <UserName data-testid="user-name">Welcome, {userName}</UserName>
          <LogoutButton data-testid="logout-button" onClick={handleLogout}>
            Logout
          </LogoutButton>
        </UserInfo>
      ) : (
        <UserInfo data-testid="anonymous-info">
          <UserName data-testid="anonymous-status">Browsing Anonymously</UserName>
          <LogoutButton data-testid="login-button" onClick={() => setShowModal(true)}>
            Login
          </LogoutButton>
        </UserInfo>
      )}

      <Content>
        <OnlineList onlineUsers={onlineUsers} />

        <TableFilters
          filters={filters}
          onFilterChange={handleFilterChange}
        />
        <TableGrid 
          filters={filters} 
          isAuthenticated={!!userName} 
          onLoginRequired={() => {
            // Only show modal if user is not already authenticated
            if (!userName) {
              console.log('🔍 FRONTEND: onLoginRequired called, showing modal');
              setShowModal(true);
            } else {
              console.log('🔍 FRONTEND: onLoginRequired called but user already authenticated:', userName);
            }
          }}
        />
      </Content>

      <LoginModal
        isOpen={showModal && !userName}
        onLogin={handleLogin}
        onClose={handleCloseModal}
      />
    </LobbyContainer>
  );
};

export default LobbyPage; 