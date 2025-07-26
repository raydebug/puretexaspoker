import React, { useState } from 'react';
import styled from 'styled-components';

interface PlayerActionsProps {
  currentPlayer: string | null;
  currentPlayerId: string | null;
  gameState: any;
  onAction: (action: string, amount?: number) => void;
}

const ActionButton = styled.button<{ isActive?: boolean }>`
  padding: 8px 16px;
  margin: 4px;
  border: none;
  border-radius: 4px;
  background-color: ${props => props.isActive ? '#4CAF50' : '#ccc'};
  color: white;
  cursor: ${props => props.isActive ? 'pointer' : 'not-allowed'};
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${props => props.isActive ? '#45a049' : '#ccc'};
  }
`;

const PlayerActionsContainer = styled.div`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: rgba(245, 245, 245, 0.95);
  border-radius: 12px;
  border: 2px solid #ddd;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 400px;
  z-index: 1000;
`;


const PlayerActions: React.FC<PlayerActionsProps> = ({ 
  currentPlayer, 
  currentPlayerId, 
  gameState, 
  onAction
}) => {
  const [betAmount, setBetAmount] = useState<number>(0);
  
  const isCurrentPlayer = currentPlayer && currentPlayerId && currentPlayer === currentPlayerId;
  
  if (!isCurrentPlayer) {
    return null;
  }
  
  const currentBet = gameState?.currentBet || 0;
  const minBet = gameState?.minBet || 0;
  const playerChips = (gameState?.players || []).find((p: any) => p.id === currentPlayerId)?.chips || 0;
  const currentPlayerData = (gameState?.players || []).find((p: any) => p.id === currentPlayerId);
  const playerCurrentBet = currentPlayerData?.currentBet || 0;
  
  // Check if player needs to call (has not matched current bet)
  const needsToCall = currentBet > playerCurrentBet;
  const callAmount = currentBet - playerCurrentBet;

  return (
    <PlayerActionsContainer data-testid="player-actions">
      <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Your Turn</h3>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        {!needsToCall ? (
          <ActionButton 
            isActive={true} 
            onClick={() => onAction('check')}
            data-testid="check-button"
          >
            Check
          </ActionButton>
        ) : (
          <ActionButton 
            isActive={playerChips >= callAmount} 
            onClick={() => onAction('call', callAmount)}
            data-testid="call-button"
          >
            Call ${callAmount}
          </ActionButton>
        )}
        
        <ActionButton 
          isActive={true} 
          onClick={() => onAction('fold')}
          data-testid="fold-button"
        >
          Fold
        </ActionButton>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(Number(e.target.value))}
          placeholder={needsToCall ? `Min raise: $${currentBet + minBet}` : `Min bet: $${minBet}`}
          min={needsToCall ? currentBet + minBet : minBet}
          max={playerChips}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '120px' }}
          data-testid="bet-amount-input"
        />
        
        {!needsToCall ? (
          <ActionButton 
            isActive={betAmount >= minBet && betAmount <= playerChips} 
            onClick={() => onAction('bet', betAmount)}
            data-testid="bet-button"
          >
            Bet ${betAmount}
          </ActionButton>
        ) : (
          <ActionButton 
            isActive={betAmount >= (currentBet + minBet) && betAmount <= playerChips} 
            onClick={() => onAction('raise', betAmount)}
            data-testid="raise-button"
          >
            Raise to ${betAmount}
          </ActionButton>
        )}
        
        <ActionButton 
          isActive={true} 
          onClick={() => onAction('allIn')}
          data-testid="allin-button"
        >
          All In (${playerChips})
        </ActionButton>
      </div>
    </PlayerActionsContainer>
  );
};

export default PlayerActions; 