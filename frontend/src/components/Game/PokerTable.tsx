import React from 'react';
import styled from 'styled-components';
import { GameState, Player } from '../../types/shared';
import DecisionTimer from '../DecisionTimer';
import { GameStartCountdown } from '../GameStartCountdown';

interface PokerTableProps {
  gameState: GameState;
  currentPlayer: Player | null;
  onAction: (action: string, amount?: number) => void;
  isObserver?: boolean;
  availableSeats?: number[];
  onSeatSelect?: (seatNumber: number) => void;
}

const TableContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #0f4c36 0%, #1a5d42 50%, #0f4c36 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const PokerTableSurface = styled.div`
  position: relative;
  width: 800px;
  height: 400px;
  background: radial-gradient(ellipse at center, #2d5a3d 0%, #1a4429 70%, #0d2818 100%);
  border: 8px solid #8B4513;
  border-radius: 200px;
  box-shadow: 
    inset 0 0 30px rgba(0,0,0,0.5),
    0 10px 30px rgba(0,0,0,0.7);
  
  &::before {
    content: '';
    position: absolute;
    top: 20px;
    left: 20px;
    right: 20px;
    bottom: 20px;
    border: 2px solid #4a6741;
    border-radius: 180px;
  }
`;

const DealerPosition = styled.div`
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 60px;
  background: linear-gradient(145deg, #1a4429, #0d2818);
  border: 3px solid #8B4513;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ffd700;
  font-weight: bold;
  font-size: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
  z-index: 10;
`;

const PlayerSeat = styled.div.withConfig({
  shouldForwardProp: (prop) => !['position', 'isEmpty', 'isButton', 'isAvailable'].includes(prop),
})<{ position: number; isEmpty: boolean; isButton: boolean; isAvailable?: boolean }>`
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${props => {
    if (props.isEmpty && props.isAvailable) {
      // Available seat - bright green with subtle glow
      return 'linear-gradient(145deg, #4CAF50, #388E3C)';
    }
    if (props.isEmpty) {
      // Empty unavailable seat - dark muted
      return 'linear-gradient(145deg, #37474F, #263238)';
    }
    // Occupied seat - golden with rich gradient
    return 'linear-gradient(145deg, #FFD700, #F57C00)';
  }};
  border: ${props => {
    if (props.isButton) return '3px solid #ff6b35';
    if (props.isEmpty && props.isAvailable) return '3px solid #66BB6A';
    if (props.isEmpty) return '3px solid #546E7A';
    return '3px solid #FFB74D';
  }};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: ${props => (props.isEmpty && props.isAvailable) ? 'pointer' : 'default'};
  transition: all 0.3s ease;
     box-shadow: ${props => {
     if (props.isEmpty && props.isAvailable) {
       // Available seats get a bright glow effect
       return '0 4px 20px rgba(76, 175, 80, 0.4), 0 0 10px rgba(102, 187, 106, 0.3)';
     }
     if (props.isEmpty) {
       // Empty seats get subtle shadow
       return '0 2px 8px rgba(0,0,0,0.5)';
     }
     // Occupied seats get warm golden glow
     return '0 4px 20px rgba(255, 215, 0, 0.3), 0 0 8px rgba(255, 183, 77, 0.2)';
   }};
   
   ${props => props.isEmpty && props.isAvailable && `
     animation: breathe-${props.position} 3s ease-in-out infinite;
     
     @keyframes breathe-${props.position} {
       0%, 100% { 
         transform: ${props.position === 2 || props.position === 8 ? 'translateY(-50%) scale(1)' : 
           props.position === 5 ? 'translateX(-50%) scale(1)' : 'scale(1)'};
         box-shadow: 0 4px 20px rgba(76, 175, 80, 0.4), 0 0 10px rgba(102, 187, 106, 0.3);
       }
       50% { 
         transform: ${props.position === 2 || props.position === 8 ? 'translateY(-50%) scale(1.02)' : 
           props.position === 5 ? 'translateX(-50%) scale(1.02)' : 'scale(1.02)'};
         box-shadow: 0 6px 25px rgba(76, 175, 80, 0.6), 0 0 15px rgba(102, 187, 106, 0.5);
       }
     }
   `}

  // Position 9 player seats around the oval table
  ${props => {
    const positions = [
      { top: '30px', right: '120px', transform: 'none' },           // 1. Small Blind (SB) - Top right
      { top: '50%', right: '20px', transform: 'translateY(-50%)' }, // 2. Big Blind (BB) - Right
      { bottom: '80px', right: '80px', transform: 'none' },         // 3. Under the Gun (UTG) - Bottom right
      { bottom: '30px', right: '200px', transform: 'none' },        // 4. UTG+1 - Bottom middle right
      { bottom: '20px', left: '50%', transform: 'translateX(-50%)' }, // 5. Middle Position (MP) - Bottom middle
      { bottom: '30px', left: '200px', transform: 'none' },         // 6. Lojack (LJ) - Bottom middle left
      { bottom: '80px', left: '80px', transform: 'none' },          // 7. Hijack (HJ) - Bottom left
      { top: '50%', left: '20px', transform: 'translateY(-50%)' },  // 8. Cutoff (CO) - Left
      { top: '30px', left: '120px', transform: 'none' },            // 9. Button (BU) - Top left
    ];
    
    const pos = positions[props.position - 1];
    return `
      top: ${pos.top};
      ${pos.right ? `right: ${pos.right};` : ''}
      ${pos.bottom ? `bottom: ${pos.bottom};` : ''}
      ${pos.left ? `left: ${pos.left};` : ''}
      transform: ${pos.transform};
    `;
  }}

  &:hover {
    ${props => {
      if (props.isEmpty && props.isAvailable) {
        return `
          background: linear-gradient(145deg, #66BB6A, #43A047);
          border-color: #81C784;
          box-shadow: 0 6px 25px rgba(76, 175, 80, 0.6), 0 0 15px rgba(102, 187, 106, 0.5);
          transform: ${props.position <= 4 ? props.position === 1 || props.position === 4 ? 'scale(1.1)' : 
            props.position === 2 ? 'translateY(-50%) scale(1.1)' : 'scale(1.1)' :
            props.position === 5 ? 'translateX(-50%) scale(1.1)' : 
            props.position === 8 ? 'translateY(-50%) scale(1.1)' : 'scale(1.1)'};
        `;
      }
      if (!props.isEmpty) {
        return `
          box-shadow: 0 6px 25px rgba(255, 215, 0, 0.5), 0 0 12px rgba(255, 183, 77, 0.4);
      transform: ${props.position <= 4 ? props.position === 1 || props.position === 4 ? 'scale(1.05)' : 
        props.position === 2 ? 'translateY(-50%) scale(1.05)' : 'scale(1.05)' :
        props.position === 5 ? 'translateX(-50%) scale(1.05)' : 
        props.position === 8 ? 'translateY(-50%) scale(1.05)' : 'scale(1.05)'};
        `;
      }
      return '';
    }}
  }
`;

const PositionLabel = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isButton',
})<{ isButton: boolean }>`
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background: ${props => props.isButton ? 'rgba(255, 107, 53, 0.9)' : 'rgba(0,0,0,0.8)'};
  color: ${props => props.isButton ? '#fff' : '#ffd700'};
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  white-space: nowrap;
  border: ${props => props.isButton ? '1px solid #ff6b35' : 'none'};
`;

const ButtonIndicator = styled.div`
  position: absolute;
  top: -15px;
  right: -15px;
  width: 25px;
  height: 25px;
  background: linear-gradient(145deg, #ff6b35, #e55a2b);
  border: 2px solid #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  z-index: 5;
`;

const PlayerName = styled.div`
  font-size: 10px;
  font-weight: bold;
  color: #1A1A1A;
  text-align: center;
  margin-bottom: 2px;
  text-shadow: 0 1px 1px rgba(255,255,255,0.3);
  letter-spacing: 0.3px;
`;

const PlayerChips = styled.div`
  font-size: 8px;
  color: #2E2E2E;
  text-align: center;
  font-weight: 600;
  text-shadow: 0 1px 1px rgba(255,255,255,0.2);
  background: rgba(0,0,0,0.1);
  padding: 1px 4px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.2);
`;

const EmptySeatText = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isAvailable',
})<{ isAvailable?: boolean }>`
  font-size: ${props => props.isAvailable ? '9px' : '7px'};
  color: ${props => props.isAvailable ? '#FFFFFF' : '#90A4AE'};
  text-align: center;
  font-weight: ${props => props.isAvailable ? 'bold' : 'normal'};
  text-shadow: ${props => props.isAvailable ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'};
  text-transform: ${props => props.isAvailable ? 'uppercase' : 'none'};
  letter-spacing: ${props => props.isAvailable ? '0.5px' : 'normal'};
  line-height: 1.2;
  
  ${props => props.isAvailable && `
    animation: pulseGlow 2s ease-in-out infinite;
    
    @keyframes pulseGlow {
      0%, 100% { 
        opacity: 1;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      }
      50% { 
        opacity: 0.8;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5), 0 0 8px rgba(255,255,255,0.3);
      }
    }
  `}
`;

const CommunityCardsArea = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 2px solid rgba(255, 215, 0, 0.4);
`;

const CommunityCard = styled.div<{ $isEmpty?: boolean; color?: string }>`
  width: 40px;
  height: 56px;
  background: ${props => props.$isEmpty ? 
    'linear-gradient(145deg, #2c3e50, #34495e)' : 
    'white'};
  border: ${props => props.$isEmpty ? 
    '2px dashed rgba(255, 215, 0, 0.5)' : 
    '1px solid #ddd'};
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  box-shadow: ${props => props.$isEmpty ? 
    'inset 0 2px 4px rgba(0,0,0,0.3)' : 
    '0 2px 8px rgba(0,0,0,0.2)'};
  color: ${props => props.$isEmpty ? 
    'rgba(255, 215, 0, 0.3)' : 
    (props.color || 'black')};
  transition: all 0.3s ease;
  
  ${props => props.$isEmpty && `
    &::before {
      content: '?';
      font-size: 24px;
      opacity: 0.4;
    }
  `}
`;



const PotDisplay = styled.div`
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: #ffd700;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 14px;
  border: 2px solid #ffd700;
`;

const ActionButtons = styled.div`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
`;

const ActionButton = styled.button<{ variant: 'fold' | 'call' | 'raise' }>`
  padding: 12px 24px;
  border: none;
  border-radius: 25px;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  
  ${props => {
    switch(props.variant) {
      case 'fold':
        return `
          background: linear-gradient(145deg, #dc3545, #c82333);
          color: white;
          &:hover { background: linear-gradient(145deg, #c82333, #bd2130); }
        `;
      case 'call':
        return `
          background: linear-gradient(145deg, #28a745, #218838);
          color: white;
          &:hover { background: linear-gradient(145deg, #218838, #1e7e34); }
        `;
      case 'raise':
        return `
          background: linear-gradient(145deg, #ffd700, #ffed4e);
          color: #333;
          &:hover { background: linear-gradient(145deg, #ffed4e, #fff176); }
        `;
    }
  }}
`;

const GameStatusDisplay = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0,0,0,0.8);
  color: #ffd700;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: bold;
`;

const CurrentBetDisplay = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0,0,0,0.8);
  color: #ffd700;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: bold;
`;

const WinnerCelebration = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 215, 0, 0.95);
  color: #000;
  padding: 20px 40px;
  border-radius: 15px;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  box-shadow: 0 8px 25px rgba(0,0,0,0.5);
  z-index: 20;
  border: 3px solid #ff6b35;
`;

const PlayerSeatExtended = styled(PlayerSeat).withConfig({
  shouldForwardProp: (prop) => !['position', 'isEmpty', 'isButton', 'isAvailable', 'isCurrentPlayer', 'isFolded'].includes(prop),
})<{ 
  position: number; 
  isEmpty: boolean; 
  isButton: boolean; 
  isAvailable?: boolean;
  isCurrentPlayer?: boolean;
  isFolded?: boolean;
}>`
  ${props => props.isCurrentPlayer && `
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.8), 0 0 40px rgba(0, 255, 0, 0.4);
    border: 3px solid #00ff00;
    animation: currentPlayerPulse 2s ease-in-out infinite;
    
    @keyframes currentPlayerPulse {
      0%, 100% { 
        transform: scale(1);
      }
      50% { 
        transform: scale(1.05);
      }
    }
  `}
  
  ${props => props.isFolded && `
    opacity: 0.5;
    filter: grayscale(100%);
    border: 3px solid #666;
  `}
`;

// Texas Hold'em position names for 9 player seats (excluding dealer)
const POSITION_NAMES = [
  'SB',    // 1. Small Blind - Top right
  'BB',    // 2. Big Blind - Right
  'UTG',   // 3. Under the Gun - Bottom right  
  'UTG+1', // 4. Under the Gun + 1 - Bottom middle right
  'MP',    // 5. Middle Position - Bottom middle
  'LJ',    // 6. Lojack - Bottom middle left
  'HJ',    // 7. Hijack - Bottom left
  'CO',    // 8. Cutoff - Left
  'BU',    // 9. Button - Top left
];

// Add player hole cards display positioned near player's seat
const PlayerHoleCards = styled.div<{ seatPosition?: number }>`
  position: absolute;
  display: flex;
  gap: 8px;
  z-index: 10;
  
  ${props => {
    // Position hole cards between the seat and center of table (not overlapping seat)
    switch (props.seatPosition) {
      case 1: // Small Blind - Top right → position towards center
        return `top: 120px; right: 180px;`;
      case 2: // Big Blind - Right → position towards center
        return `top: 50%; right: 120px; transform: translateY(-50%);`;
      case 3: // UTG - Bottom right → position towards center
        return `bottom: 120px; right: 180px;`;
      case 4: // UTG+1 - Bottom middle right → position towards center
        return `bottom: 80px; right: 300px;`;
      case 5: // MP - Bottom middle → position towards center
        return `bottom: 80px; left: 50%; transform: translateX(-50%);`;
      case 6: // LJ - Bottom middle left → position towards center
        return `bottom: 80px; left: 300px;`;
      case 7: // HJ - Bottom left → position towards center
        return `bottom: 120px; left: 180px;`;
      case 8: // CO - Left → position towards center
        return `top: 50%; left: 120px; transform: translateY(-50%);`;
      case 9: // BU - Top left → position towards center
        return `top: 120px; left: 180px;`;
      default: // Fallback to bottom center
        return `bottom: 80px; left: 50%; transform: translateX(-50%);`;
    }
  }}
`;

const HoleCard = styled.div<{ color?: string }>`
  width: 40px;
  height: 56px;
  background: white;
  border: 2px solid #333;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  color: ${props => props.color || 'black'};
`;

const HoleCardsLabel = styled.div<{ seatPosition?: number }>`
  position: absolute;
  background: rgba(0,0,0,0.8);
  color: #ffd700;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: bold;
  white-space: nowrap;
  
  ${props => {
    // Position label above the hole cards (between seat and center)
    switch (props.seatPosition) {
      case 1: // Small Blind - Top right → label above cards
        return `top: 90px; right: 180px;`;
      case 2: // Big Blind - Right → label above cards
        return `top: 50%; right: 170px; transform: translateY(-50%);`;
      case 3: // UTG - Bottom right → label above cards
        return `bottom: 180px; right: 180px;`;
      case 4: // UTG+1 - Bottom middle right → label above cards
        return `bottom: 140px; right: 300px;`;
      case 5: // MP - Bottom middle → label above cards
        return `bottom: 140px; left: 50%; transform: translateX(-50%);`;
      case 6: // LJ - Bottom middle left → label above cards
        return `bottom: 140px; left: 300px;`;
      case 7: // HJ - Bottom left → label above cards
        return `bottom: 180px; left: 180px;`;
      case 8: // CO - Left → label above cards
        return `top: 50%; left: 170px; transform: translateY(-50%);`;
      case 9: // BU - Top left → label above cards
        return `top: 90px; left: 180px;`;
      default: // Fallback to above center cards
        return `bottom: 140px; left: 50%; transform: translateX(-50%);`;
    }
  }}
`;

export const PokerTable: React.FC<PokerTableProps> = ({ 
  gameState, 
  currentPlayer, 
  onAction, 
  isObserver = false, 
  availableSeats = [], 
  onSeatSelect 
}) => {
  // State for game start countdown
  const [showCountdown, setShowCountdown] = React.useState(false);
  const [previousGameStatus, setPreviousGameStatus] = React.useState<string>(gameState.status);

  // Detect when game status changes from 'waiting' to 'playing' to trigger countdown
  React.useEffect(() => {
    if (previousGameStatus === 'waiting' && gameState.status === 'playing') {
      console.log('🚀 PokerTable: Game status changed from waiting to playing - starting countdown');
      setShowCountdown(true);
    }
    setPreviousGameStatus(gameState.status);
  }, [gameState.status, previousGameStatus]);

  // Helper function to get suit symbol
  const getSuitSymbol = (suit: string) => {
    switch (suit.toLowerCase()) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return suit; // fallback to original
    }
  };

  // Helper function to get card color
  const getCardColor = (suit: string) => {
    const suitLower = suit.toLowerCase();
    return suitLower === 'hearts' || suitLower === 'diamonds' || suit === '♥' || suit === '♦' ? '#d40000' : '#000';
  };

  // Get the current user's player data from game state
  const getCurrentUserPlayer = () => {
    if (!currentPlayer) return null;
    return gameState.players.find(p => p.id === currentPlayer.id);
  };

  const currentUserPlayer = getCurrentUserPlayer();

  // Enhanced logic to determine if user should see their hole cards
  const shouldShowUserHoleCards = React.useCallback(() => {
    // Method 1: Check if user is found in the players array (means they took a seat)
    const userIsSeatedPlayer = currentUserPlayer && currentUserPlayer.cards && currentUserPlayer.cards.length === 2;
    
    // Method 2: Try to find user by checking localStorage nickname against player names
    const nickname = localStorage.getItem('nickname');
    const userPlayerByName = nickname ? gameState.players.find(p => p.name === nickname && p.cards && p.cards.length === 2) : null;
    
    // Method 3: Check if any player has cards that belong to current user (fallback)
    const hasSeatedPlayerWithCards = gameState.players?.some(p => p.cards && p.cards.length === 2) || false;
    
    return userIsSeatedPlayer || userPlayerByName || (!isObserver && hasSeatedPlayerWithCards);
  }, [currentUserPlayer, gameState.players, isObserver]);

  // Get the player whose cards we should display
  const getPlayerToShowCards = () => {
    if (currentUserPlayer && currentUserPlayer.cards && currentUserPlayer.cards.length === 2) {
      return currentUserPlayer;
    }
    
    // Fallback: try to find by nickname
    const nickname = localStorage.getItem('nickname');
    if (nickname) {
      const playerByName = gameState.players?.find(p => p.name === nickname && p.cards && p.cards.length === 2);
      if (playerByName) return playerByName;
    }
    
    // Last resort: if user is not observer, show first player with cards (for testing)
    if (!isObserver) {
      const anyPlayerWithCards = gameState.players?.find(p => p.cards && p.cards.length === 2);
      if (anyPlayerWithCards) return anyPlayerWithCards;
    }
    
    return null;
  };

  const playerWithCards = getPlayerToShowCards();

  // Debug logging for game state changes  
  React.useEffect(() => {
    const nickname = localStorage.getItem('nickname');
    console.log('🎮 FRONTEND: PokerTable received game state update:', {
      phase: gameState.phase,
      status: gameState.status,
      currentBet: gameState.currentBet,
      pot: gameState.pot,
      communityCards: gameState.communityCards.length,
      activePlayers: gameState.players.filter(p => p.isActive).length,
      winner: gameState.winner,
      currentPlayer: currentPlayer?.name,
      currentUserPlayer: currentUserPlayer?.name,
      currentUserCards: currentUserPlayer?.cards?.length || 0,
      isObserver: isObserver,
      nickname: nickname,
      shouldShowCards: shouldShowUserHoleCards(),
      playerWithCards: playerWithCards?.name,
      playerWithCardsCount: playerWithCards?.cards?.length || 0
    });
    
    // Debug current user player cards
    if (playerWithCards && playerWithCards.cards && playerWithCards.cards.length > 0) {
      console.log('🃏 FRONTEND: Player hole cards to display:', {
        playerName: playerWithCards.name,
        cards: playerWithCards.cards,
        isCurrentUser: playerWithCards.id === currentPlayer?.id,
        foundByNickname: playerWithCards.name === nickname
      });
    }
    
    // Debug all players with cards
    const playersWithCards = gameState.players.filter(p => p.cards && p.cards.length > 0);
    if (playersWithCards.length > 0) {
      console.log('🎴 FRONTEND: All players with cards:', playersWithCards.map(p => ({
        name: p.name,
        id: p.id,
        cardCount: p.cards.length
      })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, currentPlayer, currentUserPlayer, isObserver, playerWithCards, shouldShowUserHoleCards]);

  const handleSeatClick = (seatNumber: number) => {
    // Allow seat selection if seat is empty and callback is provided
    const player = gameState.players?.find(p => p.seatNumber === seatNumber);
    const isEmpty = !player;
    
    if (isEmpty && onSeatSelect) {
      onSeatSelect(seatNumber);
    }
  };

  const renderSeat = (seatNumber: number) => {
    const player = gameState.players?.find(p => p.seatNumber === seatNumber);
    const isEmpty = !player;
    const positionName = POSITION_NAMES[seatNumber - 1] || `Seat ${seatNumber}`; // Add bounds check
    const isButton = player?.isDealer || false; // Button position
    const isAvailable = isEmpty; // Empty seats are always available to sit in
    const isCurrentPlayer = !isEmpty && gameState.currentPlayerId === player?.id;
    const isFolded = !isEmpty && !player?.isActive;
    
    return (
      <PlayerSeatExtended
        key={seatNumber}
        position={seatNumber}
        isEmpty={isEmpty}
        isButton={isButton}
        isAvailable={isAvailable}
        isCurrentPlayer={isCurrentPlayer}
        isFolded={isFolded}
        onClick={() => handleSeatClick(seatNumber)}
        data-testid={isEmpty ? `available-seat-${seatNumber}` : `seat-${seatNumber}`}
        className={`${isCurrentPlayer ? 'current-player active-player' : ''} ${isFolded ? 'folded-player' : ''}`}
      >
        <PositionLabel isButton={isButton}>{positionName}</PositionLabel>
        {isButton && <ButtonIndicator>D</ButtonIndicator>}
        {isEmpty ? (
          <EmptySeatText isAvailable={true}>
            Click to Sit
          </EmptySeatText>
        ) : (
          <>
            <PlayerName>{player.name}</PlayerName>
            <PlayerChips 
              data-testid={`player-${player.id}-chips`}
              className="chips player-chips"
            >
              ${player.chips}
            </PlayerChips>
            
            {/* Show face-down cards for other players during active gameplay */}
            {gameState.phase !== 'waiting' && gameState.phase !== 'finished' && !(gameState.phase as string).includes('showdown') && player.isActive && (
              <div className="player-hole-cards-back" style={{
                display: 'flex',
                gap: '2px',
                marginTop: '2px',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '12px',
                  height: '16px',
                  background: '#2c3e50',
                  border: '1px solid #34495e',
                  borderRadius: '2px',
                  fontSize: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7f8c8d'
                }}>🂠</div>
                <div style={{
                  width: '12px',
                  height: '16px',
                  background: '#2c3e50',
                  border: '1px solid #34495e',
                  borderRadius: '2px',
                  fontSize: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7f8c8d'
                }}>🂠</div>
              </div>
            )}
            
            {/* Show player cards during showdown */}
            {(gameState.phase as string).includes('showdown') && player.cards && player.cards.length > 0 && (
              <div className="player-cards" data-testid={`player-${player.id}-cards`}>
                {player.cards.map((card, index) => (
                  <div 
                    key={index} 
                    className="player-card" 
                    data-testid={`player-card-${index}`}
                    style={{ 
                      fontSize: '8px', 
                      background: 'white', 
                      color: getCardColor(card.suit),
                      padding: '2px 3px',
                      margin: '1px',
                      borderRadius: '3px',
                      display: 'inline-block',
                      border: '1px solid #333',
                      fontWeight: 'bold'
                    }}
                  >
                    {card.rank}{getSuitSymbol(card.suit)}
                  </div>
                ))}
              </div>
            )}
            
            {/* Decision Timer for current player */}
            <DecisionTimer
              timeLimit={10}
              isActive={isCurrentPlayer && gameState.status === 'playing' && !isFolded}
              playerId={player.id}
              playerName={player.name}
              onTimeout={() => {
                console.log(`⏰ Player ${player.name} timed out - auto-folding`);
                if (onAction) {
                  onAction('fold');
                }
              }}
            />
          </>
        )}
      </PlayerSeatExtended>
    );
  };

  return (
    <TableContainer data-testid="poker-table">
      <PokerTableSurface>
        {/* Game Status Display */}
        <GameStatusDisplay data-testid="game-status">
          {gameState.phase && gameState.phase !== 'waiting' ? (
            <span data-testid="game-phase">{gameState.phase}</span>
          ) : (
            'WAITING'
          )}
        </GameStatusDisplay>

        {/* Current Bet Display */}
        {gameState.currentBet !== undefined && gameState.currentBet > 0 && (
          <CurrentBetDisplay data-testid="current-bet">
            Current Bet: ${gameState.currentBet}
          </CurrentBetDisplay>
        )}

        {/* Dealer Position (non-player) */}
        <DealerPosition>
          <div>🎴 DEALER</div>
          <div style={{ fontSize: '10px', color: '#ccc' }}>Automated</div>
        </DealerPosition>

        {/* Render all 9 player seats */}
        {Array.from({ length: 9 }, (_, i) => renderSeat(i + 1))}

        {/* Pot Display - Only show during active gameplay with connected players */}
        {gameState.phase !== 'waiting' && 
         gameState.status === 'playing' && 
         gameState.players.length > 0 && 
         gameState.players.some(p => p.isActive) && 
         gameState.pot > 0 && (
          <PotDisplay data-testid="pot-amount">
            Pot: ${gameState.pot}
          </PotDisplay>
        )}

        {/* Community Cards - Always show 5 positions */}
        <CommunityCardsArea data-testid="community-cards">
          {Array.from({ length: 5 }, (_, index) => {
            const card = gameState.communityCards[index];
            const isEmpty = !card;
            
            return (
              <CommunityCard 
                key={index} 
                data-testid={`community-card-${index}`}
                $isEmpty={isEmpty}
                color={card ? getCardColor(card.suit) : undefined}
              >
                {card ? `${card.rank}${getSuitSymbol(card.suit)}` : ''}
              </CommunityCard>
            );
          })}
        </CommunityCardsArea>

        {/* Game Start Countdown - Appears in center when game starts */}
        <GameStartCountdown 
          isActive={showCountdown}
          onComplete={() => {
            console.log('✅ PokerTable: Countdown completed, hiding countdown');
            setShowCountdown(false);
          }}
        />

        {/* Player Hole Cards - Enhanced logic to show cards */}
        {shouldShowUserHoleCards() && playerWithCards && playerWithCards.cards && playerWithCards.cards.length === 2 && (
          <>
            <HoleCardsLabel seatPosition={playerWithCards.seatNumber}>
              {playerWithCards.name === localStorage.getItem('nickname') ? 'Your Cards' : `${playerWithCards.name}'s Cards`}
            </HoleCardsLabel>
            <PlayerHoleCards data-testid="player-hole-cards" seatPosition={playerWithCards.seatNumber}>
              {playerWithCards.cards.map((card, index) => (
                <HoleCard 
                  key={index} 
                  data-testid={`hole-card-${index}`}
                  color={getCardColor(card.suit)}
                >
                  {card.rank}{getSuitSymbol(card.suit)}
                </HoleCard>
              ))}
            </PlayerHoleCards>
          </>
        )}

        {/* Winner Celebration */}
        {gameState.winner && (gameState.phase as string).includes('showdown') && (
          <WinnerCelebration 
            data-testid="winner-celebration"
            className="celebration winner"
          >
            🎉 {gameState.winner} WINS! 🎉
            <div 
              style={{ fontSize: '14px', marginTop: '8px' }}
              data-testid="game-over"
              className="result final-results"
            >
              Final Results
            </div>
          </WinnerCelebration>
        )}

        {/* Action Buttons */}
        {/* Action buttons moved to PlayerActions component at bottom center */}

        {/* Current Player Indicator */}
        {gameState.currentPlayerId && !(gameState.phase as string).includes('showdown') && (
          <div 
            style={{
              position: 'absolute',
              bottom: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 255, 0, 0.8)',
              color: 'black',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
            data-testid="current-player-indicator"
            className="current-player-indicator"
          >
            Current Player: {gameState.players.find(p => p.id === gameState.currentPlayerId)?.name || 'Unknown'}
          </div>
        )}


      </PokerTableSurface>
    </TableContainer>
  );
}; 