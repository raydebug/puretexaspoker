import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { TableGrid } from '../components/Lobby/TableGrid';
import { TableFilters } from '../components/Lobby/TableFilters';
import { socketService } from '../services/socketService';
import { OnlineList } from '../components/OnlineList';
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

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: #222;
  border-radius: 16px;
  padding: 2rem;
  min-width: 320px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  border: 1px solid #ffd700;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ModalTitle = styled.h2`
  color: #ffd700;
  margin-bottom: 1rem;
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  border: 1px solid #ffd700;
  background: rgba(0, 0, 0, 0.8);
  color: #ffd700;
  font-size: 1rem;
  margin-bottom: 1rem;
`;

const ModalButton = styled.button`
  width: 100%;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #2c8a3d;
  background: #2c8a3d;
  color: #ffd700;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 0.5rem;
  &:hover {
    background: #37a34a;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
`;

const ModalSkipButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #666;
  background: transparent;
  color: #ccc;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    border-color: #ffd700;
    color: #ffd700;
  }
`;

const ModalError = styled.div`
  color: #ff4444;
  text-align: center;
  margin-bottom: 1rem;
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
  const [nicknameInput, setNicknameInput] = useState('');
  const [modalError, setModalError] = useState('');
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
          setOnlineUsers(total);
        });
      } catch (error) {
        console.error('Failed to connect socket in lobby:', error);
      }
    };
    
    connectAndSetup();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogout = () => {
    Cookies.remove('playerNickname');
    setUserName('');
    setShowModal(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameInput.trim()) {
      setModalError('Please enter your nickname');
      return;
    }
    Cookies.set('playerNickname', nicknameInput, { expires: 7 });
    setUserName(nicknameInput);
    setShowModal(false);
    setModalError('');
    // Socket is already connected from useEffect
    socketService.requestLobbyTables();
  };

  const handleBrowseAnonymously = () => {
    setShowModal(false);
    setModalError('');
    // Connect socket for anonymous browsing (read-only mode)
    const connectAnonymously = async () => {
      try {
        await socketService.connect();
        socketService.requestLobbyTables();
        socketService.onOnlineUsersUpdate((total: number) => {
          setOnlineUsers(total);
        });
      } catch (error) {
        console.error('Failed to connect socket anonymously:', error);
      }
    };
    connectAnonymously();
  };

  const handleModalOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleBrowseAnonymously();
    }
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showModal) {
      handleBrowseAnonymously();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showModal]);

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
          onLoginRequired={() => setShowModal(true)}
        />
      </Content>

      {showModal && (
        <ModalOverlay data-testid="nickname-modal" onClick={handleModalOverlayClick}>
          <Modal>
            <ModalTitle>Enter Your Nickname</ModalTitle>
            <form onSubmit={handleModalSubmit}>
              <ModalInput
                type="text"
                value={nicknameInput}
                onChange={e => {
                  setNicknameInput(e.target.value);
                  setModalError('');
                }}
                placeholder="Your nickname"
                autoFocus
                data-testid="nickname-input"
              />
              {modalError && <ModalError data-testid="modal-error">{modalError}</ModalError>}
              <ModalButton type="submit" data-testid="join-button">
                Start Playing
              </ModalButton>
            </form>
            <ModalSkipButton type="button" onClick={handleBrowseAnonymously} data-testid="browse-anonymously-button">
              Browse Anonymously
            </ModalSkipButton>
          </Modal>
        </ModalOverlay>
      )}
    </LobbyContainer>
  );
};

export default LobbyPage; 