import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { GameState, Player } from '../types/game';
import { AnimatedCard } from './AnimatedCard';
import { SeatMenu, SeatAction } from './SeatMenu';
import { Avatar } from './Avatar';
import { ChipAnimation } from './ChipAnimation';

const Table = styled.div`
  width: 800px;
  height: 400px;
  background-color: #2c8a3d;
  border-radius: 200px;
  position: relative;
  margin: 20px auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
`;

const CommunityCards = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 10px;
`;

const Pot = styled.div`
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 1.2rem;
`;

const PlayerSeat = styled.div<{ position: number; isAway?: boolean }>`
  position: absolute;
  width: 150px;
  padding: 10px;
  background-color: ${props => props.isAway ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.7)'};
  color: white;
  border: 2px solid ${props => props.isAway ? '#ff9800' : '#ffd700'};
  border-radius: 10px;
  cursor: pointer;
  ${props => {
    const angle = (props.position * 72 - 90) * (Math.PI / 180);
    const radius = 180;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return `
      left: calc(50% + ${x}px);
      top: calc(50% + ${y}px);
      transform: translate(-50%, -50%);
    `;
  }}
`;

const PlayerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
`;

const PlayerDetails = styled.div`
  flex: 1;
  text-align: left;
`;

const PlayerName = styled.div`
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PlayerChips = styled.div`
  font-size: 0.9rem;
`;

const PlayerBet = styled.div`
  font-size: 0.9rem;
`;

const PlayerTurn = styled.div`
  font-size: 0.9rem;
  color: #ffd700;
  font-weight: bold;
`;

const PlayerCards = styled.div`
  display: flex;
  gap: 5px;
  justify-content: center;
`;

const StatusIcon = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background-color: #ff9800;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: white;
  border: 2px solid #1b4d3e;
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
  
  // Function to calculate the center pot position
  const getPotPosition = () => {
    if (!tableRef.current) return { x: 400, y: 160 }; // Default fallback
    
    const tableRect = tableRef.current.getBoundingClientRect();
    return {
      x: tableRect.width / 2,
      y: tableRect.height / 2 - 20 // Slightly above center for pot
    };
  };
  
  // Function to calculate player position
  const getPlayerPosition = (playerPosition: number) => {
    if (!tableRef.current) return { x: 0, y: 0 };
    
    const tableRect = tableRef.current.getBoundingClientRect();
    const radius = 180;
    const angle = (playerPosition * 72 - 90) * (Math.PI / 180);
    
    return {
      x: tableRect.width / 2 + Math.cos(angle) * radius,
      y: tableRect.height / 2 + Math.sin(angle) * radius
    };
  };

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

  const renderPlayer = (player: Player) => {
    const isCurrentPlayer = player.id === currentPlayer.id;
    const isCurrentTurn = gameState.currentPlayerId === player.id;

    return (
      <PlayerSeat
        key={player.id}
        position={player.position}
        isAway={player.isAway}
        onClick={(e) => handleSeatClick(e, player)}
      >
        <PlayerInfo>
          <Avatar 
            avatar={player.avatar}
            size="medium"
            isActive={isCurrentTurn}
            isAway={player.isAway}
          />
          <PlayerDetails>
            <PlayerName>{player.name}</PlayerName>
            <PlayerChips>Chips: {player.chips}</PlayerChips>
            {player.currentBet > 0 && <PlayerBet>Bet: {player.currentBet}</PlayerBet>}
            {isCurrentTurn && <PlayerTurn>Your Turn</PlayerTurn>}
          </PlayerDetails>
        </PlayerInfo>
        <PlayerCards>
          {player.cards.map((card, index) => (
            <AnimatedCard
              key={index}
              card={card}
              isVisible={isCurrentPlayer}
              delay={index * 0.2}
            />
          ))}
        </PlayerCards>
      </PlayerSeat>
    );
  };

  // Render chip animations based on current state
  const renderChipAnimations = () => {
    const potPosition = getPotPosition();
    
    return chipAnimations.map((animation, index) => {
      const player = gameState.players.find(p => p.id === animation.playerId);
      if (!player) return null;
      
      const playerPosition = getPlayerPosition(player.position);
      
      return (
        <ChipAnimation
          key={`${animation.playerId}-${animation.timestamp}`}
          amount={animation.amount}
          startPosition={playerPosition}
          endPosition={potPosition}
          animationType="bet"
          onComplete={() => {
            // Remove this animation when complete
            setChipAnimations(prev => 
              prev.filter((_, i) => i !== index)
            );
          }}
        />
      );
    });
  };

  return (
    <Table ref={tableRef}>
      <Pot>Pot: {gameState.pot}</Pot>
      <CommunityCards>
        {gameState.communityCards.map((card, index) => (
          <AnimatedCard
            key={index}
            card={card}
            isVisible={true}
            delay={index * 0.2}
          />
        ))}
      </CommunityCards>
      {gameState.players.map(renderPlayer)}
      {renderChipAnimations()}
      {menuState && (
        <SeatMenu
          position={menuState.position}
          isAway={gameState.players.find(p => p.id === menuState.playerId)?.isAway || false}
          onAction={handleMenuAction}
          onClose={() => setMenuState(null)}
        />
      )}
    </Table>
  );
}; 