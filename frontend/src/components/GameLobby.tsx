import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { cookieService } from '../services/cookieService';
import { OnlineList } from './OnlineList';
import { socketService } from '../services/socketService';
import { Player } from '../types/game';

const LobbyContainer = styled.div`
  min-height: 100vh;
  background-color: #1b4d3e;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: white;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #ffd700;
`;

const Table = styled.div`
  width: 800px;
  height: 400px;
  background-color: #2c8a3d;
  border-radius: 200px;
  position: relative;
  margin: 20px auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  border: 8px solid #1b4d3e;
`;

const DealerPosition = styled.div`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: #ffd700;
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid #ffd700;
  font-weight: bold;
`;

const Seat = styled.button<{ $isOccupied: boolean }>`
  position: absolute;
  width: 40px;
  height: 40px;
  padding: 0;
  background-color: ${props => props.$isOccupied ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.7)'};
  color: white;
  border: 2px solid ${props => props.$isOccupied ? '#ff4444' : '#ffd700'};
  border-radius: 50%;
  cursor: ${props => props.$isOccupied ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transform: translate(-50%, -50%);
  z-index: 1;

  &:hover {
    background-color: ${props => props.$isOccupied ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.8)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PlusIcon = styled.span`
  font-size: 1.2rem;
  color: #ffd700;
  line-height: 1;
`;

const PlayerName = styled.div`
  position: absolute;
  width: 120px;
  text-align: center;
  color: white;
  font-size: 0.9rem;
  transform: translateX(-50%);
  top: 25px;
  z-index: 1;
`;

const NicknameInput = styled.input`
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 2px solid #ffd700;
  border-radius: 0.5rem;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  width: 200px;
  margin-bottom: 1rem;

  &:focus {
    outline: none;
    border-color: #ffeb3b;
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  background-color: #ffd700;
  color: black;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #ffeb3b;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #ff4444;
  margin-top: 1rem;
  font-size: 1rem;
`;

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const WelcomeMessage = styled.div`
  font-size: 1.2rem;
  color: #ffd700;
  margin-bottom: 1rem;
`;

const SeatSelectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const SeatContainer = styled.div`
  position: absolute;
  transform: translate(-50%, -50%);
`;

const Modal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.9);
  padding: 2rem;
  border-radius: 1rem;
  border: 2px solid #ffd700;
  z-index: 1000;
  text-align: center;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 999;
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
`;

interface GameLobbyProps {
  onJoinGame: (nickname: string, seatNumber: number) => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({ onJoinGame }) => {
  const [nickname, setNickname] = useState('');
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [occupiedSeats, setOccupiedSeats] = useState<{[key: number]: string}>({});
  const [currentSeat, setCurrentSeat] = useState<number | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<Player[]>([]);
  const [observers, setObservers] = useState<string[]>([]);
  const navigate = useNavigate();

  // Table dimensions (should match styled component)
  const TABLE_WIDTH = 800;
  const TABLE_HEIGHT = 400;
  const BORDER = 8;
  const SEAT_RADIUS = 20; // half of seat size (40px)

  // Load saved data and connect socket on component mount
  useEffect(() => {
    const savedNickname = cookieService.getNickname();
    const savedSeatNumber = cookieService.getSeatNumber();
    
    if (savedNickname) {
      setNickname(savedNickname);
      setIsLoggedIn(true);
      setShowSeatSelection(true);
      
      if (savedSeatNumber !== null) {
        setCurrentSeat(savedSeatNumber);
        setOccupiedSeats(prev => ({
          ...prev,
          [savedSeatNumber]: savedNickname
        }));
      }
    }

    // Connect socket and listen for online users updates
    socketService.connect();
    socketService.onOnlineUsersUpdate((players, observers) => {
      setOnlinePlayers(players);
      setObservers(observers);
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  const handleLogin = () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    cookieService.setNickname(nickname.trim());
    setIsLoggedIn(true);
    setError(null);
    socketService.joinAsObserver(nickname.trim());
  };

  const handleJoinGame = () => {
    setShowSeatSelection(true);
  };

  const handleSeatClick = (seatNumber: number) => {
    if (seatNumber === currentSeat) return;
    
    if (occupiedSeats[seatNumber] && occupiedSeats[seatNumber] !== nickname) return;

    setSelectedSeat(seatNumber);
    setShowConfirmation(true);
  };

  const handleConfirmSeat = () => {
    if (selectedSeat !== null) {
      if (currentSeat !== null) {
        cookieService.clearGameData(); // Clear previous seat data
        setOccupiedSeats(prev => {
          const newSeats = { ...prev };
          delete newSeats[currentSeat];
          return newSeats;
        });
      }

      cookieService.setSeatNumber(selectedSeat);
      setOccupiedSeats(prev => ({
        ...prev,
        [selectedSeat]: nickname
      }));

      setCurrentSeat(selectedSeat);
      onJoinGame(nickname.trim(), selectedSeat);
      setShowConfirmation(false);
    }
  };

  const handleCancelSeat = () => {
    setSelectedSeat(null);
    setShowConfirmation(false);
  };

  const getSeatPosition = (seatNumber: number) => {
    // Seat 0 at bottom center (angle 90deg), others clockwise
    const angle = (seatNumber * 72 + 90) * (Math.PI / 180); // 0: 90deg (bottom), 1: 162deg, ...
    const a = (TABLE_WIDTH / 2) - BORDER - SEAT_RADIUS; // horizontal radius
    const b = (TABLE_HEIGHT / 2) - BORDER - SEAT_RADIUS; // vertical radius
    const x = Math.cos(angle) * a;
    const y = Math.sin(angle) * b;
    return {
      left: `calc(50% + ${x}px)` ,
      top: `calc(50% + ${y}px)`
    };
  };

  useEffect(() => {
    // Count how many seats are occupied
    const occupiedCount = Object.keys(occupiedSeats).length;
    // If at least 2 players and current player has a seat, navigate to game page
    if (occupiedCount >= 2 && currentSeat !== null) {
      navigate('/game');
    }
  }, [occupiedSeats, currentSeat, navigate]);

  if (!isLoggedIn) {
    return (
      <LobbyContainer>
        <Title>Poker Game</Title>
        <LoginContainer>
          <NicknameInput
            type="text"
            placeholder="Enter your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
          />
          <Button onClick={handleLogin} disabled={!nickname.trim()}>
            Login
          </Button>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </LoginContainer>
      </LobbyContainer>
    );
  }

  if (!showSeatSelection) {
    return (
      <LobbyContainer>
        <Title>Poker Game</Title>
        <WelcomeMessage>Welcome, {nickname}!</WelcomeMessage>
        <Button onClick={handleJoinGame}>
          Join Game
        </Button>
      </LobbyContainer>
    );
  }

  return (
    <LobbyContainer>
      <Title>Poker Game</Title>
      <WelcomeMessage>Welcome, {nickname}!</WelcomeMessage>
      <SeatSelectionContainer>
        <Table>
          <DealerPosition>Dealer</DealerPosition>
          {[0, 1, 2, 3, 4].map((seatNumber) => (
            <SeatContainer key={seatNumber} style={getSeatPosition(seatNumber)}>
              <Seat
                $isOccupied={!!occupiedSeats[seatNumber] && occupiedSeats[seatNumber] !== nickname}
                onClick={() => handleSeatClick(seatNumber)}
                disabled={!!occupiedSeats[seatNumber] && occupiedSeats[seatNumber] !== nickname}
              >
                {occupiedSeats[seatNumber] ? null : <PlusIcon>+</PlusIcon>}
              </Seat>
              {occupiedSeats[seatNumber] && (
                <PlayerName>{occupiedSeats[seatNumber]}</PlayerName>
              )}
            </SeatContainer>
          ))}
        </Table>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </SeatSelectionContainer>

      {isLoggedIn && (
        <OnlineList
          players={onlinePlayers}
          observers={observers}
          currentPlayerId={onlinePlayers.find(p => p.name === nickname)?.id}
        />
      )}

      {showConfirmation && (
        <>
          <ModalOverlay />
          <Modal>
            <div>
              {currentSeat !== null 
                ? `Do you want to move from Seat ${currentSeat + 1} to Seat ${selectedSeat! + 1}?`
                : `Do you want to sit at Seat ${selectedSeat! + 1}?`
              }
            </div>
            <ModalButtons>
              <Button onClick={handleConfirmSeat}>Yes</Button>
              <Button onClick={handleCancelSeat}>No</Button>
            </ModalButtons>
          </Modal>
        </>
      )}
    </LobbyContainer>
  );
}; 