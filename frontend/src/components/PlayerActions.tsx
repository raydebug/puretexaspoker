import React, { useState } from 'react';
import styled from 'styled-components';

interface PlayerActionsProps {
  currentPlayer: string | null;
  currentPlayerId: string | null;
  gameState: any;
  onAction: (action: string, amount?: number) => void;
  isTestMode?: boolean;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
  margin: 16px 0;
  border: 2px solid #ddd;
`;

const DebugInfo = styled.div`
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  padding: 8px;
  margin: 8px 0;
  font-size: 12px;
  color: #856404;
`;

const PlayerActions: React.FC<PlayerActionsProps> = ({ 
  currentPlayer, 
  currentPlayerId, 
  gameState, 
  onAction, 
  isTestMode = false 
}) => {
  const [betAmount, setBetAmount] = useState<number>(0);
  
  // Enhanced debugging for test mode
  const isCurrentPlayer = currentPlayer && currentPlayerId && currentPlayer === currentPlayerId;
  const shouldShowActions = isCurrentPlayer || isTestMode;
  
  console.log('🎯 PLAYER_ACTIONS DEBUG:', {
    currentPlayer,
    currentPlayerId,
    isCurrentPlayer,
    isTestMode,
    shouldShowActions,
    gameStatePhase: gameState?.phase,
    gameStateCurrentPlayerId: gameState?.currentPlayerId,
    playersCount: gameState?.players?.length
  });
  
  // In test mode, always show actions for debugging
  if (isTestMode) {
    console.log('🧪 TEST MODE: Forcing action buttons to show for debugging');
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        backgroundColor: '#ff0000',
        border: '5px solid #00ff00',
        padding: '20px',
        borderRadius: '10px',
        minWidth: '400px',
        textAlign: 'center'
      }}>
        <h3 style={{ color: 'white', margin: '0 0 10px 0' }}>🧪 TEST MODE - Action Buttons (Debug)</h3>
        <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#ffff00', borderRadius: '4px', color: 'black' }}>
          <strong>Debug Info:</strong><br/>
          Current Player: {currentPlayer}<br/>
          Current Player ID: {currentPlayerId}<br/>
          Game Phase: {gameState?.phase}<br/>
          Is Current Player: {isCurrentPlayer ? 'YES' : 'NO'}<br/>
          Players Count: {gameState?.players?.length}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <ActionButton 
            isActive={true} 
            onClick={() => onAction('raise', 6)}
            data-testid="raise-button"
            style={{ backgroundColor: '#00ff00', color: 'black', fontWeight: 'bold' }}
          >
            Raise to $6
          </ActionButton>
          <ActionButton 
            isActive={true} 
            onClick={() => onAction('call', 6)}
            data-testid="call-button"
            style={{ backgroundColor: '#00ff00', color: 'black', fontWeight: 'bold' }}
          >
            Call $6
          </ActionButton>
          <ActionButton 
            isActive={true} 
            onClick={() => onAction('fold')}
            data-testid="fold-button"
            style={{ backgroundColor: '#00ff00', color: 'black', fontWeight: 'bold' }}
          >
            Fold
          </ActionButton>
          <ActionButton 
            isActive={true} 
            onClick={() => onAction('check')}
            data-testid="check-button"
            style={{ backgroundColor: '#00ff00', color: 'black', fontWeight: 'bold' }}
          >
            Check
          </ActionButton>
        </div>
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            placeholder="Bet amount"
            style={{ marginRight: '10px', padding: '5px', width: '100px' }}
          />
          <ActionButton 
            isActive={true} 
            onClick={() => onAction('bet', betAmount)}
            data-testid="bet-button"
            style={{ backgroundColor: '#00ff00', color: 'black', fontWeight: 'bold' }}
          >
            Bet ${betAmount}
          </ActionButton>
        </div>
      </div>
    );
  }

  // Normal mode - only show for current player
  if (!shouldShowActions) {
    console.log('❌ PLAYER_ACTIONS: Not current player, hiding actions');
    return null;
  }

  console.log('✅ PLAYER_ACTIONS: Showing action buttons for current player');
  
  const currentBet = gameState?.currentBet || 0;
  const minBet = gameState?.minBet || 0;
  const playerChips = gameState?.players?.find((p: any) => p.id === currentPlayerId)?.chips || 0;

  return (
    <PlayerActionsContainer data-testid="player-actions">
      <h3>Your Turn - Choose Action</h3>
      
      {/* Check/Fold options */}
      {currentBet === 0 && (
        <>
          <ActionButton 
            isActive={true} 
            onClick={() => onAction('check')}
            data-testid="check-button"
          >
            Check
          </ActionButton>
          <ActionButton 
            isActive={true} 
            onClick={() => onAction('fold')}
            data-testid="fold-button"
          >
            Fold
          </ActionButton>
        </>
      )}
      
      {/* Call/Raise options */}
      {currentBet > 0 && (
        <>
          <ActionButton 
            isActive={true} 
            onClick={() => onAction('call', currentBet)}
            data-testid="call-button"
          >
            Call ${currentBet}
          </ActionButton>
          <ActionButton 
            isActive={true} 
            onClick={() => onAction('fold')}
            data-testid="fold-button"
          >
            Fold
          </ActionButton>
        </>
      )}
      
      {/* Betting options */}
      <div style={{ marginTop: '10px' }}>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(Number(e.target.value))}
          placeholder={`Min bet: $${minBet}`}
          min={minBet}
          max={playerChips}
          style={{ marginRight: '10px', padding: '5px' }}
        />
        <ActionButton 
          isActive={betAmount >= minBet && betAmount <= playerChips} 
          onClick={() => onAction('bet', betAmount)}
          data-testid="bet-button"
        >
          Bet ${betAmount}
        </ActionButton>
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