import React from 'react';
import styled from 'styled-components';
import { GameState, Player } from '../../types/shared';

interface PokerTableProps {
  gameState: GameState;
  currentPlayer: Player | null;
  onAction: (action: string, amount?: number) => void;
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
  shouldForwardProp: (prop) => !['position', 'isEmpty', 'isButton'].includes(prop),
})<{ position: number; isEmpty: boolean; isButton: boolean }>`
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${props => props.isEmpty ? 
    'linear-gradient(145deg, #2a3f35, #1a2f25)' : 
    'linear-gradient(145deg, #ffd700, #ffed4e)'};
  border: 3px solid ${props => {
    if (props.isButton) return '#ff6b35';
    return props.isEmpty ? '#4a6741' : '#ffb347';
  }};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);

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
    ${props => props.isEmpty && `
      background: linear-gradient(145deg, #3a4f45, #2a3f35);
      border-color: #6a8761;
    `}
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
  color: #333;
  text-align: center;
  margin-bottom: 2px;
`;

const PlayerChips = styled.div`
  font-size: 8px;
  color: #666;
  text-align: center;
`;

const EmptySeatText = styled.div`
  font-size: 8px;
  color: #888;
  text-align: center;
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
`;

const CommunityCard = styled.div`
  width: 40px;
  height: 56px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
`;

const PotDisplay = styled.div`
  position: absolute;
  top: 35%;
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

export const PokerTable: React.FC<PokerTableProps> = ({ gameState, currentPlayer, onAction }) => {
  const handleSeatClick = (seatNumber: number) => {
    // Handle joining an empty seat
    console.log(`Clicked seat ${seatNumber}`);
  };

  const renderSeat = (seatNumber: number) => {
    const player = gameState.players.find(p => p.seatNumber === seatNumber);
    const isEmpty = !player;
    const positionName = POSITION_NAMES[seatNumber - 1];
    const isButton = player?.isDealer || false; // Button position
    
    return (
      <PlayerSeat
        key={seatNumber}
        position={seatNumber}
        isEmpty={isEmpty}
        isButton={isButton}
        onClick={() => handleSeatClick(seatNumber)}
      >
        <PositionLabel isButton={isButton}>{positionName}</PositionLabel>
        {isButton && <ButtonIndicator>D</ButtonIndicator>}
        {isEmpty ? (
          <EmptySeatText>Empty Seat</EmptySeatText>
        ) : (
          <>
            <PlayerName>{player.name}</PlayerName>
            <PlayerChips>${player.chips}</PlayerChips>
          </>
        )}
      </PlayerSeat>
    );
  };

  return (
    <TableContainer>
      <PokerTableSurface>
        {/* Dealer Position (non-player) */}
        <DealerPosition>
          <div>🎴 DEALER</div>
          <div style={{ fontSize: '10px', color: '#ccc' }}>Automated</div>
        </DealerPosition>

        {/* Render all 9 player seats */}
        {Array.from({ length: 9 }, (_, i) => renderSeat(i + 1))}

        {/* Pot Display */}
        <PotDisplay>
          Pot: ${gameState.pot}
        </PotDisplay>

        {/* Community Cards */}
        <CommunityCardsArea>
          {gameState.communityCards.length === 0 ? (
            <div style={{ color: '#888', fontSize: '12px' }}>Community Cards</div>
          ) : (
            gameState.communityCards.map((card, index) => (
              <CommunityCard key={index}>
                {card.rank}{card.suit}
              </CommunityCard>
            ))
          )}
        </CommunityCardsArea>

        {/* Action Buttons */}
        {currentPlayer && gameState.status === 'playing' && (
          <ActionButtons>
            <ActionButton variant="fold" onClick={() => onAction('fold')}>
              FOLD
            </ActionButton>
            <ActionButton variant="call" onClick={() => onAction('call')}>
              CALL
            </ActionButton>
            <ActionButton variant="raise" onClick={() => onAction('raise', 20)}>
              RAISE
            </ActionButton>
          </ActionButtons>
        )}
      </PokerTableSurface>
    </TableContainer>
  );
}; 