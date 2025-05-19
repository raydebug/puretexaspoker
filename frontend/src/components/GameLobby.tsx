import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { cookieService } from '../services/cookieService';
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

  .online-list {
    margin-bottom: 20px;
  }

  .players-list {
    margin-bottom: 20px;
  }

  .observers-list {
    margin-bottom: 20px;
  }

  .player-name {
    display: block;
    margin: 5px 0;
    font-weight: normal;
    opacity: 1;
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
  gap: 10px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 8px;
  color: white;
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
    setShowConfirmation(false);
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

  const renderSeats = () => {
    const seats = [];
    for (let i = 0; i < 9; i++) {
      const position = getSeatPosition(i);
      const isOccupied = occupiedSeats[i] !== undefined;
      const isCurrentSeat = currentSeat === i;
      
      seats.push(
        <SeatContainer key={i} style={{ left: position.left, top: position.top }}>
          <Seat
            $isOccupied={isOccupied}
            onClick={() => handleSeatClick(i)}
            disabled={isOccupied && !isCurrentSeat}
            data-testid="seat-button"
          >
            {isOccupied ? <PlusIcon>×</PlusIcon> : <PlusIcon>+</PlusIcon>}
          </Seat>
          {isOccupied && (
            <PlayerName>
              {occupiedSeats[i]}
              {isCurrentSeat && ' (You)'}
            </PlayerName>
          )}
        </SeatContainer>
      );
    }
    return seats;
  };

  useEffect(() => {
    const handleOnlineUsersUpdate = (players: Player[], observers: string[]) => {
      setOnlinePlayers(players);
      setObservers(observers);
    };

    const unsubscribe = socketService.onOnlineUsersUpdate(handleOnlineUsersUpdate);

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <LobbyContainer>
      <Title>Texas Hold'em Poker</Title>
      {!isLoggedIn ? (
        <LoginContainer>
          <WelcomeMessage>Welcome to Texas Hold'em Poker!</WelcomeMessage>
          <NicknameInput
            type="text"
            placeholder="Enter your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            data-testid="nickname-input"
          />
          <Button onClick={handleLogin} data-testid="join-game-button">
            Join Game
          </Button>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </LoginContainer>
      ) : (
        <>
          {!showSeatSelection ? (
            <>
              <WelcomeMessage>Welcome, {nickname}!</WelcomeMessage>
              <Button onClick={handleJoinGame} data-testid="join-game-button">
                Join Game
              </Button>
            </>
          ) : (
            <>
              <Table>
                <DealerPosition>Dealer</DealerPosition>
                {renderSeats()}
                <GameStatus className="game-status">
                  {currentSeat !== null ? 'Your Turn' : 'Waiting for players...'}
                </GameStatus>
                {currentSeat !== null && (
                  <BettingControls className="betting-controls">
                    <Button onClick={() => handleBet(10)}>Bet 10</Button>
                    <Button onClick={() => handleBet(20)}>Bet 20</Button>
                    <Button onClick={handleFold}>Fold</Button>
                  </BettingControls>
                )}
              </Table>
              <OnlineList>
                <div className="online-list">
                  <h3>Online Players</h3>
                  {onlinePlayers.map((player) => (
                    <span key={player.id} className="player-name">
                      {player.name} {player.isAway ? "(Away)" : ""}
                    </span>
                  ))}
                </div>
                <div className="players-list">
                  <h3>Players</h3>
                  {Object.entries(occupiedSeats).map(([seat, name]) => (
                    <span key={seat} className="player-name">
                      {name}
                    </span>
                  ))}
                </div>
                <div className="observers-list">
                  <h3>Observers</h3>
                  {observers.map((name) => (
                    <span key={name} className="player-name">
                      {name}
                    </span>
                  ))}
                </div>
              </OnlineList>
            </>
          )}
        </>
      )}
      {showConfirmation && (
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