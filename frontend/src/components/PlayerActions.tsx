import React, { useState } from 'react';
import styled from 'styled-components';

interface PlayerActionsProps {
  currentPlayer: string | null;
  currentPlayerId: string | null;
  gameState: any;
  onAction: (action: string, amount?: number) => void;
}

const ActionButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['isActive', 'variant'].includes(prop)
})<{ isActive?: boolean; variant?: 'fold' | 'call' | 'check' | 'bet' | 'raise' | 'allin' }>`
  padding: 12px 20px;
  margin: 6px;
  border: none;
  border-radius: 8px;
  background-color: ${props => {
    if (!props.isActive) return '#666';
    switch (props.variant) {
      case 'fold':
        return '#dc3545';
      case 'call':
      case 'check':
        return '#28a745';
      case 'bet':
      case 'raise':
        return '#007bff';
      case 'allin':
        return '#fd7e14';
      default:
        return '#4CAF50';
    }
  }};
  color: white;
  cursor: ${props => props.isActive ? 'pointer' : 'not-allowed'};
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 100px;

  &:hover {
    background-color: ${props => {
      if (!props.isActive) return '#666';
      switch (props.variant) {
        case 'fold':
          return '#c82333';
        case 'call':
        case 'check':
          return '#218838';
        case 'bet':
        case 'raise':
          return '#0056b3';
        case 'allin':
          return '#e8650e';
        default:
          return '#45a049';
      }
    }};
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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
  padding: 25px;
  background: linear-gradient(145deg, rgba(40, 44, 52, 0.95), rgba(33, 37, 41, 0.95));
  border-radius: 16px;
  border: 2px solid #495057;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  min-width: 500px;
  z-index: 1000;
  backdrop-filter: blur(10px);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.05), transparent);
    border-radius: 16px;
    pointer-events: none;
  }
`;

const ActionTitle = styled.h3`
  margin: 0 0 20px 0;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: 1px;
`;

const BetInputContainer = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 15px;
`;

const BetInput = styled.input`
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid #495057;
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
  width: 150px;
  text-align: center;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    background-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
`;


const PlayerActions: React.FC<PlayerActionsProps> = ({ 
  currentPlayer, 
  currentPlayerId, 
  gameState, 
  onAction
}) => {
  const [betAmount, setBetAmount] = useState<number>(0);
  
  // SIMPLIFIED LOGIC: Show action buttons if game is active and we have game state
  const gameIsActive = gameState && (
    gameState.status === 'playing' || 
    gameState.phase === 'preflop' || 
    gameState.phase === 'flop' || 
    gameState.phase === 'turn' || 
    gameState.phase === 'river'
  );
  
  // Debug logging for PlayerActions
  console.log('🎯 PlayerActions SIMPLIFIED DEBUG:', {
    gameIsActive,
    currentPlayer,
    currentPlayerId,
    gameStateStatus: gameState?.status,
    gameStatePhase: gameState?.phase,
    gameStateCurrentPlayerId: gameState?.currentPlayerId,
    willShowButtons: gameIsActive
  });
  
  // SIMPLIFIED CONDITION: Show buttons if game is active, regardless of player matching
  if (!gameIsActive) {
    console.log('🎯 PlayerActions returning null - game not active');
    return null;
  }
  
  // Determine if it's this player's turn
  const isMyTurn = (currentPlayer && currentPlayerId) ? (
    currentPlayer === currentPlayerId || 
    currentPlayer === currentPlayerId.toString() || 
    currentPlayerId === currentPlayer || 
    currentPlayerId.toString() === currentPlayer
  ) : false;

  console.log('🎯 PlayerActions isMyTurn:', isMyTurn, 'currentPlayer:', currentPlayer, 'currentPlayerId:', currentPlayerId);

  const currentBet = gameState?.currentBet || 0;
  const minBet = gameState?.minBet || 0;
  const playerChips = (gameState?.players || []).find((p: any) => p.id === currentPlayerId)?.chips || 0;
  const currentPlayerData = (gameState?.players || []).find((p: any) => p.id === currentPlayerId);
  const playerCurrentBet = currentPlayerData?.currentBet || 0;
  
  // Check if player needs to call (has not matched current bet)
  const needsToCall = currentBet > playerCurrentBet;
  const callAmount = currentBet - playerCurrentBet;

  console.log('🎯 PlayerActions RENDER: About to return component, isMyTurn:', isMyTurn);

  return (
    <PlayerActionsContainer data-testid="player-actions" style={{backgroundColor: 'red !important', border: '5px solid yellow'}}>
      <ActionTitle style={{color: 'white', fontSize: '24px'}}>{isMyTurn ? '🎯 YOUR TURN' : '⏳ WAITING FOR OTHER PLAYERS...'}</ActionTitle>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        {!needsToCall ? (
          <ActionButton 
            isActive={isMyTurn} 
            variant="check"
            onClick={() => isMyTurn && onAction('check')}
            data-testid="check-button"
          >
            Check
          </ActionButton>
        ) : (
          <ActionButton 
            isActive={isMyTurn && playerChips >= callAmount} 
            variant="call"
            onClick={() => isMyTurn && onAction('call', callAmount)}
            data-testid="call-button"
          >
            Call ${callAmount}
          </ActionButton>
        )}
        
        <ActionButton 
          isActive={isMyTurn} 
          variant="fold"
          onClick={() => isMyTurn && onAction('fold')}
          data-testid="fold-button"
        >
          Fold
        </ActionButton>
      </div>
      
      <BetInputContainer>
        <BetInput
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(Number(e.target.value))}
          placeholder={needsToCall ? `Min raise: $${currentBet + minBet}` : `Min bet: $${minBet}`}
          min={needsToCall ? currentBet + minBet : minBet}
          max={playerChips}
          disabled={!isMyTurn}
          data-testid="bet-amount-input"
        />
        
        {!needsToCall ? (
          <ActionButton 
            isActive={isMyTurn && betAmount >= minBet && betAmount <= playerChips} 
            variant="bet"
            onClick={() => isMyTurn && onAction('bet', betAmount)}
            data-testid="bet-button"
          >
            Bet ${betAmount}
          </ActionButton>
        ) : (
          <ActionButton 
            isActive={isMyTurn && betAmount >= (currentBet + minBet) && betAmount <= playerChips} 
            variant="raise"
            onClick={() => isMyTurn && onAction('raise', betAmount)}
            data-testid="raise-button"
          >
            Raise to ${betAmount}
          </ActionButton>
        )}
        
        <ActionButton 
          isActive={isMyTurn} 
          variant="allin"
          onClick={() => isMyTurn && onAction('allIn')}
          data-testid="allin-button"
        >
          All In (${playerChips})
        </ActionButton>
      </BetInputContainer>
    </PlayerActionsContainer>
  );
};

export default PlayerActions; 