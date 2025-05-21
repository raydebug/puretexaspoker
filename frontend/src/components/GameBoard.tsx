import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { GameState, Player } from '../types/game';
import { AnimatedCard } from './AnimatedCard';
import { SeatMenu, SeatAction } from './SeatMenu';
import { Avatar } from './Avatar';
import { ChipAnimation } from './ChipAnimation';
import { media } from '../styles/GlobalStyles';

const GameContainer = styled.div`
  position: relative;
  width: 900px;
  height: 550px;
  background-color: #1b4d3e;
  border-radius: 200px;
  margin: 0 auto;
  overflow: hidden;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2), inset 0 0 40px rgba(0, 0, 0, 0.4);
  border: 15px solid #8b4513;
  
  ${media.xl`
    width: 800px;
    height: 500px;
  `}
  
  ${media.lg`
    width: 700px;
    height: 450px;
    border-radius: 150px;
    border-width: 12px;
  `}
  
  ${media.md`
    width: 550px;
    height: 400px;
    border-radius: 120px;
    border-width: 10px;
  `}
  
  ${media.sm`
    width: 100%;
    max-width: 450px;
    height: 350px;
    border-radius: 100px;
    border-width: 8px;
  `}
`;

const TableCenter = styled.div`
  position: absolute;
  width: 500px;
  height: 200px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  ${media.lg`
    width: 450px;
    height: 180px;
  `}
  
  ${media.md`
    width: 350px;
    height: 150px;
  `}
  
  ${media.sm`
    width: 280px;
    height: 130px;
  `}
`;

const CommunityCards = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  
  ${media.md`
    gap: 8px;
  `}
  
  ${media.sm`
    gap: 5px;
    margin-bottom: 15px;
  `}
`;

const Pot = styled.div`
  background-color: rgba(0, 0, 0, 0.3);
  padding: 5px 15px;
  border-radius: 20px;
  color: white;
  font-weight: bold;
  font-size: 1.2rem;
  
  ${media.md`
    font-size: 1rem;
    padding: 4px 12px;
  `}
  
  ${media.sm`
    font-size: 0.9rem;
    padding: 3px 10px;
  `}
`;

const PlayerSeat = styled.div<{ position: number; isActive: boolean; isAway: boolean }>`
  position: absolute;
  width: 120px;
  height: auto;
  padding: 10px;
  border-radius: 10px;
  background-color: ${props => props.isActive ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 0, 0, 0.5)'};
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: ${props => props.isAway ? 'not-allowed' : 'pointer'};
  border: 2px solid ${props => props.isActive ? '#ffd700' : 'transparent'};
  opacity: ${props => props.isAway ? 0.7 : 1};
  transition: all 0.3s ease;
  
  ${({ position }: { position: number }) => {
    switch (position) {
      case 0: return `bottom: 10px; left: 50%; transform: translateX(-50%);`;
      case 1: return `bottom: 100px; right: 60px;`;
      case 2: return `top: 50%; right: 30px; transform: translateY(-50%);`;
      case 3: return `top: 100px; left: 60px;`;
      case 4: return `top: 50%; left: 30px; transform: translateY(-50%);`;
      default: return ``;
    }
  }}
  
  ${media.lg`
    width: 110px;
    padding: 8px;
    
    ${({ position }: { position: number }) => {
      switch (position) {
        case 0: return `bottom: 10px; left: 50%; transform: translateX(-50%);`;
        case 1: return `bottom: 90px; right: 50px;`;
        case 2: return `top: 50%; right: 25px; transform: translateY(-50%);`;
        case 3: return `top: 90px; left: 50px;`;
        case 4: return `top: 50%; left: 25px; transform: translateY(-50%);`;
        default: return ``;
      }
    }}
  `}
  
  ${media.md`
    width: 100px;
    padding: 6px;
    
    ${({ position }: { position: number }) => {
      switch (position) {
        case 0: return `bottom: 10px; left: 50%; transform: translateX(-50%);`;
        case 1: return `bottom: 80px; right: 40px;`;
        case 2: return `top: 50%; right: 20px; transform: translateY(-50%);`;
        case 3: return `top: 80px; left: 40px;`;
        case 4: return `top: 50%; left: 20px; transform: translateY(-50%);`;
        default: return ``;
      }
    }}
  `}
  
  ${media.sm`
    width: 90px;
    padding: 5px;
    border-radius: 8px;
    
    ${({ position }: { position: number }) => {
      switch (position) {
        case 0: return `bottom: 5px; left: 50%; transform: translateX(-50%);`;
        case 1: return `bottom: 70px; right: 30px;`;
        case 2: return `top: 50%; right: 15px; transform: translateY(-50%);`;
        case 3: return `top: 70px; left: 30px;`;
        case 4: return `top: 50%; left: 15px; transform: translateY(-50%);`;
        default: return ``;
      }
    }}
  `}
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PlayerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PlayerDetails = styled.div`
  flex: 1;
  text-align: left;
`;

const PlayerName = styled.div`
  font-weight: bold;
  font-size: 0.9rem;
  margin-top: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  
  ${media.md`
    font-size: 0.8rem;
    margin-top: 4px;
  `}
  
  ${media.sm`
    font-size: 0.75rem;
    margin-top: 3px;
  `}
`;

const PlayerChips = styled.div`
  font-size: 0.8rem;
  color: #4caf50;
  margin-top: 2px;
  
  ${media.sm`
    font-size: 0.7rem;
  `}
`;

const PlayerBet = styled.div`
  position: absolute;
  font-size: 0.9rem;
  color: #ffd700;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 2px 8px;
  border-radius: 12px;
  top: -15px;
  
  ${media.sm`
    font-size: 0.75rem;
    padding: 2px 6px;
    top: -12px;
  `}
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PlayerTurn = styled.div`
  font-size: 0.9rem;
  color: #ffd700;
  font-weight: bold;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PlayerCards = styled.div`
  display: flex;
  gap: 5px;
  margin-top: 5px;
`;

interface ChipAnimationState {
  playerId: string;
  amount: number;
  timestamp: number;
}

interface GameBoardProps {
  gameState: GameState;
  currentPlayer: Player;
  onPlayerAction?: (action: SeatAction, playerId: string) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  currentPlayer,
  onPlayerAction
}) => {
  const [menuState, setMenuState] = useState<{
    playerId: string;
    position: { x: number; y: number };
  } | null>(null);
  
  // Ref to the table element for calculating positions
  const tableRef = useRef<HTMLDivElement>(null);
  
  // State to track active chip animations
  const [chipAnimations, setChipAnimations] = useState<ChipAnimationState[]>([]);
  
  // Last game state for comparison to detect changes
  const lastGameStateRef = useRef<GameState | null>(null);

  // Detect player bet changes and trigger animations
  useEffect(() => {
    if (!lastGameStateRef.current) {
      lastGameStateRef.current = { ...gameState };
      return;
    }
    
    // Find players who have increased their bets
    gameState.players.forEach(player => {
      const previousPlayer = lastGameStateRef.current?.players.find(p => p.id === player.id);
      
      if (previousPlayer && player.currentBet > previousPlayer.currentBet) {
        const betAmount = player.currentBet - previousPlayer.currentBet;
        
        // Add new chip animation
        setChipAnimations(prev => [
          ...prev,
          {
            playerId: player.id,
            amount: betAmount,
            timestamp: Date.now()
          }
        ]);
      }
    });
    
    // Update ref for next comparison
    lastGameStateRef.current = { ...gameState };
  }, [gameState]);

  const handleSeatClick = (event: React.MouseEvent, player: Player) => {
    if (player.id === currentPlayer.id) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      setMenuState({
        playerId: player.id,
        position: {
          x: rect.left,
          y: rect.bottom + 5
        }
      });
    }
  };

  const handleMenuAction = (action: SeatAction) => {
    if (menuState && onPlayerAction) {
      onPlayerAction(action, menuState.playerId);
    }
  };

  return (
    <GameContainer ref={tableRef}>
      <TableCenter>
        <CommunityCards>
          {gameState.communityCards.map((card, index) => (
            <AnimatedCard key={index} card={card} delay={index * 0.2} />
          ))}
        </CommunityCards>
        <Pot>Pot: {gameState.pot}</Pot>
      </TableCenter>
      
      {gameState.players.map(player => {
        const isCurrentPlayer = player.id === currentPlayer.id;
        
        return (
          <PlayerSeat 
            key={player.id}
            position={player.position}
            isActive={isCurrentPlayer}
            isAway={player.isAway}
            onClick={(e) => handleSeatClick(e, player)}
          >
            <Avatar 
              avatar={player.avatar}
              size="medium"
              isActive={player.id === gameState.currentPlayerId}
              isAway={player.isAway}
            />
            <PlayerName>{player.name}</PlayerName>
            <PlayerChips>{player.chips}</PlayerChips>
            {player.currentBet > 0 && (
              <PlayerBet>{player.currentBet}</PlayerBet>
            )}
          </PlayerSeat>
        );
      })}
      
      {chipAnimations.map((animation, index) => {
        const player = gameState.players.find(p => p.id === animation.playerId);
        if (!player || !tableRef.current) return null;
        
        const playerElement = tableRef.current.querySelector(`div[data-player-id="${player.id}"]`);
        const potElement = tableRef.current.querySelector('.pot');
        
        if (!playerElement || !potElement) return null;
        
        const playerRect = playerElement.getBoundingClientRect();
        const potRect = potElement.getBoundingClientRect();
        const tableRect = tableRef.current.getBoundingClientRect();
        
        // Calculate positions relative to the table
        const startPosition = {
          x: playerRect.left - tableRect.left + (playerRect.width / 2),
          y: playerRect.top - tableRect.top + (playerRect.height / 2)
        };
        
        const endPosition = {
          x: potRect.left - tableRect.left + (potRect.width / 2),
          y: potRect.top - tableRect.top + (potRect.height / 2)
        };
        
        return (
          <ChipAnimation
            key={`${animation.playerId}-${animation.timestamp}`}
            amount={animation.amount}
            startPosition={startPosition}
            endPosition={endPosition}
            animationType="bet"
            onComplete={() => {
              setChipAnimations(prev => 
                prev.filter(a => a.timestamp !== animation.timestamp)
              );
            }}
          />
        );
      })}
      
      {menuState && (
        <SeatMenu
          position={menuState.position}
          isAway={gameState.players.find(p => p.id === menuState.playerId)?.isAway || false}
          onAction={handleMenuAction}
          onClose={() => setMenuState(null)}
        />
      )}
    </GameContainer>
  );
}; 