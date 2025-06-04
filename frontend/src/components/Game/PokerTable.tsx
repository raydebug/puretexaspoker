import React from 'react';
import styled from 'styled-components';
import { GameState, Player } from '../../types/game';

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
  border-radius: 50%;
  border: 12px solid #8B4513;
  box-shadow: 
    inset 0 0 50px rgba(0,0,0,0.4),
    0 0 30px rgba(0,0,0,0.6),
    0 0 0 3px #654321;
  
  &::before {
    content: '';
    position: absolute;
    top: 20px;
    left: 20px;
    right: 20px;
    bottom: 20px;
    border-radius: 50%;
    border: 2px solid rgba(255,215,0,0.3);
  }
`;

const PlayerSeat = styled.div<{ position: number; isActive: boolean; isDealer: boolean }>`
  position: absolute;
  width: 120px;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
  
  ${({ position }) => {
    const angle = (position * 360) / 9 - 90; // Start from top
    const radius = 280;
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius;
    
    return `
      transform: translate(${x}px, ${y}px);
      left: 50%;
      top: 50%;
      margin-left: -60px;
      margin-top: -50px;
    `;
  }}
  
  ${({ isActive }) => isActive && `
    filter: drop-shadow(0 0 15px #ffd700);
  `}
`;

const PlayerAvatar = styled.div<{ isActive: boolean; isEmpty: boolean }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${({ isEmpty }) => isEmpty ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)'};
  border: 3px solid ${({ isActive }) => isActive ? '#ffd700' : '#2c3e50'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  
  ${({ isEmpty }) => isEmpty && `
    border-style: dashed;
    border-color: rgba(255,255,255,0.3);
  `}
  
  &:hover {
    transform: scale(1.05);
  }
`;

const PlayerInfo = styled.div`
  margin-top: 8px;
  text-align: center;
  color: white;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
`;

const PlayerName = styled.div`
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 2px;
`;

const PlayerChips = styled.div`
  font-size: 11px;
  color: #ffd700;
  font-weight: bold;
`;

const DealerButton = styled.div`
  position: absolute;
  top: -15px;
  right: -15px;
  width: 30px;
  height: 30px;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-weight: bold;
  font-size: 12px;
  border: 2px solid #e6c200;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
`;

const CommunityCards = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 8px;
  z-index: 5;
`;

const Card = styled.div<{ isVisible: boolean }>`
  width: 50px;
  height: 72px;
  background: ${({ isVisible }) => isVisible ? 'white' : 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'};
  border-radius: 8px;
  border: 2px solid #333;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  position: relative;
  
  ${({ isVisible }) => !isVisible && `
    &::before {
      content: '';
      position: absolute;
      top: 8px;
      left: 8px;
      right: 8px;
      bottom: 8px;
      background: linear-gradient(45deg, #ff6b6b 0%, #ee5a52 100%);
      border-radius: 4px;
    }
  `}
`;

const PotDisplay = styled.div`
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.8);
  color: #ffd700;
  padding: 12px 24px;
  border-radius: 25px;
  font-weight: bold;
  font-size: 18px;
  border: 2px solid #ffd700;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
  z-index: 10;
`;

const ActionPanel = styled.div`
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
  z-index: 20;
`;

const ActionButton = styled.button<{ variant: 'fold' | 'call' | 'raise' }>`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  min-width: 100px;
  
  ${({ variant }) => {
    switch(variant) {
      case 'fold':
        return `
          background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
          color: white;
          &:hover { background: linear-gradient(135deg, #c0392b 0%, #a93226 100%); }
        `;
      case 'call':
        return `
          background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
          color: white;
          &:hover { background: linear-gradient(135deg, #2980b9 0%, #21618c 100%); }
        `;
      case 'raise':
        return `
          background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
          color: white;
          &:hover { background: linear-gradient(135deg, #229954 0%, #1e8449 100%); }
        `;
    }
  }}
  
  &:active {
    transform: translateY(2px);
  }
  
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
`;

const GameInfo = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 20;
`;

export const PokerTable: React.FC<PokerTableProps> = ({ gameState, currentPlayer, onAction }) => {
  const renderPlayerSeat = (position: number) => {
    const player = gameState.players.find(p => p.position === position);
    const isEmpty = !player;
    const isActive = player?.id === gameState.currentPlayerId;
    const isDealer = player?.isDealer || false;
    
    return (
      <PlayerSeat key={position} position={position} isActive={isActive} isDealer={isDealer}>
        <PlayerAvatar isActive={isActive} isEmpty={isEmpty}>
          {isEmpty ? '+' : (player?.name?.charAt(0) || 'P')}
          {isDealer && <DealerButton>D</DealerButton>}
        </PlayerAvatar>
        {!isEmpty && (
          <PlayerInfo>
            <PlayerName>{player?.name || 'Player'}</PlayerName>
            <PlayerChips>${player?.chips || 0}</PlayerChips>
          </PlayerInfo>
        )}
      </PlayerSeat>
    );
  };

  const renderCommunityCards = () => {
    return (
      <CommunityCards>
        {[0, 1, 2, 3, 4].map(index => {
          const card = gameState.communityCards[index];
          return (
            <Card key={index} isVisible={!!card}>
              {card && (
                <>
                  <div style={{ color: card.suit === '♥' || card.suit === '♦' ? 'red' : 'black' }}>
                    {card.rank}
                  </div>
                  <div style={{ color: card.suit === '♥' || card.suit === '♦' ? 'red' : 'black', fontSize: '16px' }}>
                    {card.suit}
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </CommunityCards>
    );
  };

  const isMyTurn = currentPlayer?.id === gameState.currentPlayerId;

  return (
    <TableContainer>
      <PokerTableSurface>
        {/* Render 9 player seats */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(renderPlayerSeat)}
        
        {/* Community cards */}
        {renderCommunityCards()}
        
        {/* Pot display */}
        <PotDisplay>
          Pot: ${gameState.pot}
        </PotDisplay>
      </PokerTableSurface>
      
      {/* Game info */}
      <GameInfo>
        <div>Phase: {gameState.phase}</div>
        <div>Players: {gameState.players.length}</div>
        <div>Blinds: ${gameState.smallBlind}/${gameState.bigBlind}</div>
      </GameInfo>
      
      {/* Action buttons - only show when it's player's turn */}
      {isMyTurn && (
        <ActionPanel>
          <ActionButton variant="fold" onClick={() => onAction('fold')}>
            Fold
          </ActionButton>
          <ActionButton variant="call" onClick={() => onAction('call')}>
            Call
          </ActionButton>
          <ActionButton variant="raise" onClick={() => onAction('raise', gameState.minBet)}>
            Raise
          </ActionButton>
        </ActionPanel>
      )}
    </TableContainer>
  );
}; 