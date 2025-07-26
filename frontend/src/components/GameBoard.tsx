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
  margin-bottom: 10px;
  
  ${media.md`
    font-size: 1rem;
    padding: 4px 12px;
  `}
  
  ${media.sm`
    font-size: 0.9rem;
    padding: 3px 10px;
  `}
`;

const SidePots = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
`;

const SidePot = styled.div`
  background-color: rgba(255, 215, 0, 0.2);
  padding: 3px 10px;
  border-radius: 15px;
  color: #ffd700;
  font-weight: bold;
  font-size: 0.9rem;
  border: 1px solid #ffd700;
`;

const PhaseIndicator = styled.div`
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.9), rgba(255, 179, 0, 0.9));
  color: black;
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 15px;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
`;

const ShowdownResults = styled.div`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  padding: 20px;
  border-radius: 15px;
  border: 2px solid #ffd700;
  color: white;
  max-width: 500px;
  z-index: 100;
`;

const WinnerCard = styled.div`
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.9), rgba(56, 142, 60, 0.9));
  padding: 10px;
  border-radius: 10px;
  margin-bottom: 10px;
  
  .player-name {
    font-weight: bold;
    font-size: 1.1rem;
    color: #ffd700;
  }
  
  .hand-info {
    font-size: 0.9rem;
    margin: 5px 0;
  }
  
  .win-amount {
    font-weight: bold;
    color: #4caf50;
  }
`;

const PlayerSeat = styled.div<{ position: number }>`
  position: absolute;
  width: 120px;
  height: auto;
  padding: 10px;
  border-radius: 10px;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  
  ${({ position }: { position: number }) => {
    switch (position) {
      case 0: return 'bottom: 10px; left: 50%; transform: translateX(-50%);';
      case 1: return 'bottom: 100px; right: 60px;';
      case 2: return 'top: 50%; right: 30px; transform: translateY(-50%);';
      case 3: return 'top: 100px; left: 60px;';
      case 4: return 'top: 50%; left: 30px; transform: translateY(-50%);';
      default: return '';
    }
  }}
  
  &[data-active="true"] {
    background-color: rgba(255, 215, 0, 0.2);
    border: 2px solid #ffd700;
  }
  
  &[data-active="false"] {
    background-color: rgba(0, 0, 0, 0.5);
    border: 2px solid transparent;
  }
  
  &[data-away="true"] {
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  &[data-away="false"] {
    cursor: pointer;
    opacity: 1;
  }
  
  ${media.lg`
    width: 110px;
    padding: 8px;
    
    ${({ position }: { position: number }) => {
      switch (position) {
        case 0: return 'bottom: 10px; left: 50%; transform: translateX(-50%);';
        case 1: return 'bottom: 90px; right: 50px;';
        case 2: return 'top: 50%; right: 25px; transform: translateY(-50%);';
        case 3: return 'top: 90px; left: 50px;';
        case 4: return 'top: 50%; left: 25px; transform: translateY(-50%);';
        default: return '';
      }
    }}
  `}
  
  ${media.md`
    width: 100px;
    padding: 6px;
    
    ${({ position }: { position: number }) => {
      switch (position) {
        case 0: return 'bottom: 10px; left: 50%; transform: translateX(-50%);';
        case 1: return 'bottom: 80px; right: 40px;';
        case 2: return 'top: 50%; right: 20px; transform: translateY(-50%);';
        case 3: return 'top: 80px; left: 40px;';
        case 4: return 'top: 50%; left: 20px; transform: translateY(-50%);';
        default: return '';
      }
    }}
  `}
  
  ${media.sm`
    width: 90px;
    padding: 5px;
    border-radius: 8px;
    
    ${({ position }: { position: number }) => {
      switch (position) {
        case 0: return 'bottom: 5px; left: 50%; transform: translateX(-50%);';
        case 1: return 'bottom: 70px; right: 30px;';
        case 2: return 'top: 50%; right: 15px; transform: translateY(-50%);';
        case 3: return 'top: 70px; left: 30px;';
        case 4: return 'top: 50%; left: 15px; transform: translateY(-50%);';
        default: return '';
      }
    }}
  `}
`;

const AwayIndicator = styled.div`
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #ff4444;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
  z-index: 1;
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
    isOpen: boolean;
    position: { x: number; y: number };
    player: Player | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    player: null
  });
  
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
      const previousPlayer = lastGameStateRef.current?.players.find(p => p && p.id === player.id);
      
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
    event.preventDefault();
    if (player.id === currentPlayer?.id) {
      setMenuState({
        isOpen: true,
        position: { x: event.clientX, y: event.clientY },
        player
      });
    }
  };

  const handleMenuAction = (action: SeatAction) => {
    if (menuState.player && onPlayerAction) {
      onPlayerAction(action, menuState.player.id);
    }
    setMenuState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <GameContainer data-testid="game-table">
      <div data-testid="game-status" className="game-status">
        {gameState.phase}
      </div>
      
      <TableCenter>
        <PhaseIndicator data-testid="phase-indicator">
          {gameState.phase.charAt(0).toUpperCase() + gameState.phase.slice(1)}
        </PhaseIndicator>
        
        <CommunityCards data-testid="community-cards">
          {(gameState.communityCards || []).map((card, index) => (
            <AnimatedCard key={index} card={card} delay={index * 0.2} />
          ))}
        </CommunityCards>
        
        <Pot data-testid="pot-amount">Main Pot: ${gameState.pot}</Pot>
        
        {gameState.sidePots && gameState.sidePots.length > 0 && (
          <SidePots data-testid="side-pots">
            {gameState.sidePots.map((sidePot, index) => (
              <SidePot key={sidePot.id} data-testid={`side-pot-${index}`}>
                Side Pot {index + 1}: ${sidePot.amount}
                {sidePot.isResolved && sidePot.winners && (
                  <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                    Won by: {sidePot.winners.join(', ')}
                  </div>
                )}
              </SidePot>
            ))}
          </SidePots>
        )}
        
        {gameState.currentBet > 0 && (
          <div data-testid="current-bet" style={{ 
            color: '#ff6b6b', 
            fontWeight: 'bold', 
            fontSize: '0.9rem',
            marginTop: '5px'
          }}>
            To Call: ${gameState.currentBet}
          </div>
        )}
        
        {gameState.phase === 'showdown' && gameState.handEvaluation && (
          <div data-testid="hand-evaluation" style={{
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '10px',
            borderRadius: '10px',
            marginTop: '10px',
            color: '#ffd700',
            fontSize: '0.9rem'
          }}>
            {gameState.handEvaluation}
          </div>
        )}
        
        {gameState.winner && (
          <div data-testid="winner-announcement" style={{
            background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
            color: 'white',
            padding: '10px',
            borderRadius: '10px',
            fontWeight: 'bold',
            marginTop: '10px'
          }}>
            🏆 Winner: {gameState.winner} 🏆
          </div>
        )}
        
        {gameState.isHandComplete && (
          <div data-testid="hand-complete" style={{
            background: 'rgba(255, 152, 0, 0.8)',
            color: 'white',
            padding: '8px 15px',
            borderRadius: '20px',
            fontWeight: 'bold',
            marginTop: '10px'
          }}>
            Hand Complete - Starting New Hand...
          </div>
        )}
      </TableCenter>
      
      {/* Showdown Results Overlay */}
      {gameState.phase === 'showdown' && gameState.showdownResults && gameState.showdownResults.length > 0 && (
        <ShowdownResults data-testid="showdown-results">
          <h3 style={{ textAlign: 'center', marginBottom: '15px', color: '#ffd700' }}>
            🎰 Showdown Results 🎰
          </h3>
          {gameState.showdownResults.map((result, index) => (
            <WinnerCard key={index} data-testid={`showdown-result-${index}`}>
              <div className="player-name">{result.playerName}</div>
              <div className="hand-info">
                <strong>{result.hand.name}</strong>
                {result.hand.cards && result.hand.cards.length > 0 && (
                  <div style={{ fontSize: '0.8rem', marginTop: '3px' }}>
                    Cards: {result.hand.cards.map(card => `${card.rank}${card.suit}`).join(', ')}
                  </div>
                )}
              </div>
              <div className="win-amount">
                Won ${result.winAmount} from {result.potType} pot
                {result.potId && ` (${result.potId})`}
              </div>
            </WinnerCard>
          ))}
        </ShowdownResults>
      )}
      
      {(gameState.players || []).map((player, index) => {
        const isCurrentPlayer = player.id === currentPlayer?.id;
        
        return (
          <PlayerSeat
            key={player.id}
            position={index}
            data-active={isCurrentPlayer}
            data-away={player.isAway}
            data-testid={`seat-${index}`}
            onClick={(e) => handleSeatClick(e, player)}
          >
            {player.isAway && <AwayIndicator>Away</AwayIndicator>}
            <Avatar 
              avatar={player.avatar}
              size="medium"
              isActive={player.id === gameState.currentPlayerId}
              isAway={player.isAway}
            />
            <PlayerName data-testid={`player-${player.name}`}>{player.name}</PlayerName>
            <PlayerChips data-testid={`player-${player.name}-chips`}>{player.chips}</PlayerChips>
            {player.currentBet > 0 && (
              <PlayerBet data-testid={`player-${player.name}-bet`}>{player.currentBet}</PlayerBet>
            )}
          </PlayerSeat>
        );
      })}
      
      <div className="betting-controls">
        <button data-testid="check-button" onClick={() => onPlayerAction?.('check', currentPlayer?.id)}>
          Check
        </button>
        <button data-testid="bet-button" onClick={() => onPlayerAction?.('bet', currentPlayer?.id)}>
          Bet
        </button>
        <button data-testid="fold-button" onClick={() => onPlayerAction?.('fold', currentPlayer?.id)}>
          Fold
        </button>
        {gameState.phase === 'waiting' && (
          <button data-testid="start-game-button" onClick={() => onPlayerAction?.('start', currentPlayer?.id)}>
            Start Game
          </button>
        )}
      </div>
      
      {chipAnimations.map((animation, index) => {
        const player = (gameState.players || []).find(p => p && p.id === animation.playerId);
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
      
      {menuState.isOpen && menuState.player && (
        <SeatMenu
          position={menuState.position}
          isAway={menuState.player.isAway}
          onAction={handleMenuAction}
          onClose={() => setMenuState(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </GameContainer>
  );
}; 