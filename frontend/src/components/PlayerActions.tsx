import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

interface PlayerActionsProps {
  currentPlayer: string | null;
  currentPlayerId: string | null;
  gameState: any;
  onAction: (action: string, amount?: number) => void;
  isTestMode?: boolean;
}

const ActionButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['isActive', 'variant'].includes(prop)
})<{ isActive?: boolean; variant?: 'fold' | 'call' | 'check' | 'bet' | 'raise' | 'allin' }>`
  padding: 8px 16px;
  margin: 0;
  border: none;
  border-radius: 6px;
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
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 80px;

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
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 12px;
  margin-top: 20px;
  background: linear-gradient(145deg, rgba(40, 44, 52, 0.95), rgba(33, 37, 41, 0.95));
  border-radius: 12px;
  border: 2px solid #495057;
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  gap: 10px;
  min-height: 60px;
`;


const BettingSliderContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-width: 160px;
`;

const SliderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 120px;
`;

const BetSlider = styled.input`
  width: 100%;
  height: 6px;
  background: linear-gradient(to right, #495057 0%, #007bff 50%, #fd7e14 100%);
  outline: none;
  border-radius: 3px;
  opacity: ${props => props.disabled ? '0.5' : '1'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  
  &::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    background: linear-gradient(145deg, #ffffff, #e9ecef);
    border: 2px solid #007bff;
    border-radius: 50%;
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
  }
  
  &::-webkit-slider-thumb:hover {
    transform: ${props => props.disabled ? 'none' : 'scale(1.1)'};
    box-shadow: 0 3px 6px rgba(0,0,0,0.4);
  }
  
  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: linear-gradient(145deg, #ffffff, #e9ecef);
    border: 2px solid #007bff;
    border-radius: 50%;
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
`;

const BetAmountDisplay = styled.div`
  color: #ffffff;
  font-size: 11px;
  font-weight: bold;
  text-align: center;
  min-height: 14px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
`;

const SliderLabels = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.6);
`;

const BetActionButton = styled(ActionButton)`
  min-width: 80px;
  font-size: 11px;
  padding: 6px 12px;
`;


const PlayerActions: React.FC<PlayerActionsProps> = ({ 
  currentPlayer, 
  currentPlayerId, 
  gameState, 
  onAction,
  isTestMode = false
}) => {
  const [betAmount, setBetAmount] = useState<number>(0);
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);
  
  // Get the current user's nickname from localStorage for comparison
  const userNickname = localStorage.getItem('nickname');
  
  // Find the current user's player data in the game state
  const currentUserPlayer = gameState?.players?.find((p: any) => 
    p.name === userNickname || p.id === userNickname
  );
  
  const currentBet = gameState?.currentBet || 0;
  const minBet = gameState?.minBet || 0;
  const playerChips = currentUserPlayer?.chips || 0;
  const playerCurrentBet = currentUserPlayer?.currentBet || 0;
  
  // Check if player needs to call (has not matched current bet)
  const needsToCall = currentBet > playerCurrentBet;
  const callAmount = currentBet - playerCurrentBet;
  
  // Set default slider value to minimum bet when game state changes
  const sliderMin = needsToCall ? currentBet + minBet : minBet;
  useEffect(() => {
    if (gameState && betAmount === 0 && sliderMin > 0) {
      setBetAmount(sliderMin);
    }
  }, [sliderMin, gameState, betAmount]);
  
  // ALWAYS SHOW CONTAINER: Display action buttons container regardless of game state
  const gameIsActive = gameState && (
    gameState.status === 'playing' || 
    gameState.phase === 'preflop' || 
    gameState.phase === 'flop' || 
    gameState.phase === 'turn' || 
    gameState.phase === 'river'
  );
  
  // Debug logging for PlayerActions
  console.log('🎯 PlayerActions ALWAYS VISIBLE DEBUG:', {
    gameIsActive,
    currentPlayer,
    currentPlayerId,
    gameStateStatus: gameState?.status,
    gameStatePhase: gameState?.phase,
    gameStateCurrentPlayerId: gameState?.currentPlayerId,
    willShowButtons: gameIsActive,
    alwaysShowContainer: true
  });
  
  // CONTAINER ALWAYS VISIBLE: Never return null, always show the container
  
  // Check if it's this user's turn by comparing with the current player in the game state
  const isMyTurn = !!(
    gameState && 
    gameState.currentPlayerId && 
    currentUserPlayer && 
    (currentUserPlayer.id === gameState.currentPlayerId || 
     currentUserPlayer.name === gameState.currentPlayerId)
  );

  console.log('🎯 PlayerActions TURN DEBUG:', {
    isMyTurn,
    userNickname,
    currentUserPlayer: currentUserPlayer ? { id: currentUserPlayer.id, name: currentUserPlayer.name } : null,
    gameStateCurrentPlayerId: gameState?.currentPlayerId,
    gameStateStatus: gameState?.status,
    gameStatePhase: gameState?.phase
  });

  console.log('🎯 PlayerActions RENDER: About to return component, isMyTurn:', isMyTurn);
  
  // Handle action with temporary disable to prevent double-clicks
  const handleAction = (action: string, amount?: number) => {
    if (actionInProgress || !isMyTurn) return;
    
    setActionInProgress(true);
    onAction(action, amount);
    
    // Re-enable buttons after a short delay to prevent rapid double-clicks
    setTimeout(() => {
      setActionInProgress(false);
    }, 1500); // 1.5 second cooldown
  };

  return (
    <PlayerActionsContainer data-testid="player-actions">
      {/* ALWAYS SHOW CONTAINER - conditionally show buttons based on game phase */}
      {gameIsActive ? (
        <>
          {!needsToCall ? (
            <ActionButton 
              isActive={isMyTurn && !actionInProgress} 
              variant="check"
              onClick={() => handleAction('check')}
              data-testid="check-button"
            >
              Check
            </ActionButton>
          ) : (
            <ActionButton 
              isActive={isMyTurn && playerChips >= callAmount && !actionInProgress} 
              variant="call"
              onClick={() => handleAction('call', callAmount)}
              data-testid="call-button"
            >
              Call ${callAmount}
            </ActionButton>
          )}
          
          <ActionButton 
            isActive={isMyTurn && !actionInProgress} 
            variant="fold"
            onClick={() => handleAction('fold')}
            data-testid="fold-button"
          >
            Fold
          </ActionButton>
          
          <BettingSliderContainer>
            <SliderContainer>
              <BetSlider
                type="range"
                min={needsToCall ? currentBet + minBet : minBet}
                max={playerChips}
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                disabled={!isMyTurn || actionInProgress}
                data-testid="bet-slider"
              />
              <BetAmountDisplay data-testid="bet-amount-display">
                {betAmount > 0 ? `$${betAmount}` : needsToCall ? `Min: $${currentBet + minBet}` : `Min: $${minBet}`}
              </BetAmountDisplay>
            </SliderContainer>
            
            {!needsToCall ? (
              <BetActionButton 
                isActive={isMyTurn && betAmount >= minBet && betAmount <= playerChips && !actionInProgress} 
                variant="bet"
                onClick={() => handleAction('bet', betAmount)}
                data-testid="bet-button"
              >
                {betAmount >= playerChips ? 'All In' : `Bet $${betAmount}`}
              </BetActionButton>
            ) : (
              <BetActionButton 
                isActive={isMyTurn && betAmount >= (currentBet + minBet) && betAmount <= playerChips && !actionInProgress} 
                variant="raise"
                onClick={() => handleAction(betAmount >= playerChips ? 'allIn' : 'raise', betAmount >= playerChips ? undefined : betAmount)}
                data-testid="raise-button"
              >
                {betAmount >= playerChips ? 'All In' : `Raise $${betAmount}`}
              </BetActionButton>
            )}
          </BettingSliderContainer>
        </>
      ) : (
        /* Show placeholder when game is not active */
        <div style={{ 
          color: 'rgba(255,255,255,0.6)', 
          fontSize: '14px', 
          textAlign: 'center',
          padding: '12px'
        }}>
          Waiting for game phase...
        </div>
      )}
    </PlayerActionsContainer>
  );
};

export default PlayerActions; 