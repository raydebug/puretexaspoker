import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { cookieService } from '../services/cookieService';
import { socketService } from '../services/socketService';
import { Player } from '../types/shared';

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

const GameStatus = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: #ffd700;
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid #ffd700;
  font-weight: bold;
  z-index: 1;
`;

const OnlineList = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 8px;
  color: white;
  min-width: 200px;

  .online-count {
    font-size: 1.2em;
    font-weight: bold;
    color: #ffd700;
  }
`;

const PlayerSeat = styled.div`
  width: 100px;
  height: 100px;
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #666;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: #fff;
  }
`;

const BettingControls = styled.div`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.8);
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid #ffd700;
`;

const BetInput = styled.input`
  width: 100px;
  padding: 0.5rem;
  border: 2px solid #ffd700;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  text-align: center;

  &:focus {
    outline: none;
    border-color: #ffeb3b;
  }
`;

const BetButton = styled(Button)`
  min-width: 80px;
`;

interface GameLobbyProps {
  onJoinGame: (nickname: string, seatNumber: number) => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({ onJoinGame }) => {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [currentSeat, setCurrentSeat] = useState<number | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState<{ [key: number]: string }>({});
  const [gameStatus, setGameStatus] = useState('Waiting for players...');
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [observers, setObservers] = useState<string[]>([]);
  const navigate = useNavigate();

  // Load saved data and connect socket on component mount
  useEffect(() => {
    const savedNickname = cookieService.getNickname();
    const savedSeatNumber = cookieService.getSeatNumber();
    
    if (savedNickname) {
      setNickname(savedNickname);
      setIsLoggedIn(true);
      
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
      setPlayers(players as Player[]);
      setObservers(observers);
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  const handleLogin = () => {
    if (nickname.trim()) {
      cookieService.setNickname(nickname.trim());
      setError('');
      setIsLoggedIn(true);
      socketService.joinAsObserver(nickname.trim());
    } else {
      setError('Please enter a nickname');
    }
  };

  const handleSeatClick = (seatNumber: number) => {
    if (seatNumber === currentSeat) return;
    
    if (occupiedSeats[seatNumber] && occupiedSeats[seatNumber] !== nickname) return;

    setSelectedSeat(seatNumber);
    setShowSeatModal(true);
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
      setShowSeatModal(false);
    }
  };

  const handleCancelSeat = () => {
    setShowSeatModal(false);
    setSelectedSeat(null);
  };

  const handleBet = (amount: number) => {
    if (currentSeat !== null) {
      socketService.placeBet('game1', 'player1', amount);
    }
  };

  const handleFold = () => {
    if (currentSeat !== null) {
      socketService.fold('game1', 'player1');
    }
  };

  const getSeatPosition = (seatNumber: number) => {
    const angle = (seatNumber * 360) / 9;
    const radius = 150;
    const x = radius * Math.cos((angle * Math.PI) / 180);
    const y = radius * Math.sin((angle * Math.PI) / 180);
    return { x, y };
  };

  useEffect(() => {
    // Count how many seats are occupied
    const occupiedCount = Object.keys(occupiedSeats).length;
    // If at least 2 players and current player has a seat, navigate to game page
    if (occupiedCount >= 2 && currentSeat !== null) {
      navigate('/game');
    }
  }, [occupiedSeats, currentSeat, navigate]);

  const renderSeats = () => {
    return Array.from({ length: 9 }, (_, i) => {
      const { x, y } = getSeatPosition(i);
      const isOccupied = occupiedSeats[i] !== undefined;
      const isCurrentSeat = currentSeat === i;
      
      return (
        <SeatContainer
          key={i}
          style={{
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`
          }}
        >
          <Seat
            data-testid="player-seat"
            $isOccupied={isOccupied}
            onClick={() => handleSeatClick(i)}
            disabled={isOccupied && !isCurrentSeat}
          >
            {isOccupied ? (
              <PlayerSeat>
                {occupiedSeats[i]}
                {isCurrentSeat && ' (You)'}
              </PlayerSeat>
            ) : (
              <PlusIcon>+</PlusIcon>
            )}
          </Seat>
          {isOccupied && (
            <PlayerName>
              {occupiedSeats[i]}
              {isCurrentSeat && ' (You)'}
            </PlayerName>
          )}
        </SeatContainer>
      );
    });
  };

  return (
    <LobbyContainer>
      <Title>Texas Poker Game</Title>
      {!isLoggedIn ? (
        <LoginContainer>
          <NicknameInput
            type="text"
            placeholder="Enter your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            data-testid="nickname-input"
          />
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <Button
            onClick={handleLogin}
            disabled={!nickname.trim()}
            data-testid="join-button"
          >
            Join Game
          </Button>
        </LoginContainer>
      ) : (
        <>
          <WelcomeMessage>Welcome, {nickname}!</WelcomeMessage>
          <Table>
            <DealerPosition>Dealer</DealerPosition>
            {renderSeats()}
            <GameStatus className="game-status">
              {currentSeat !== null ? 'Your Turn' : 'Waiting for players...'}
            </GameStatus>
            {currentSeat !== null && (
              <BettingControls className="betting-controls">
                <BetInput
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  data-testid="bet-input"
                />
                <BetButton
                  onClick={() => handleBet(betAmount)}
                  disabled={!isPlayerTurn}
                  data-testid="bet-button"
                >
                  Bet
                </BetButton>
              </BettingControls>
            )}
          </Table>
          <OnlineList>
            <div className="online-count">
              Online Users: {players.length + observers.length}
            </div>
          </OnlineList>
        </>
      )}
      {showSeatModal && (
        <>
          <ModalOverlay />
          <Modal>
            <h2>Confirm Seat Selection</h2>
            <p>Are you sure you want to take seat {selectedSeat}?</p>
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