import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

interface ActionHistoryItem {
  id: string;
  playerId: string;
  playerName: string;
  action: string;
  amount: number | null;
  phase: string;
  handNumber: number;
  actionSequence: number;
  timestamp: string;
}

interface ActionHistoryProps {
  gameId?: string;
  tableId?: number;
  handNumber?: number;
  gameState?: any; // Add game state to access current player info
  currentPlayerId?: string; // Add current player ID for debugging
}

const Container = styled.div`
  background: rgba(0, 0, 0, 0.7);
  border-radius: 0;
  padding: 1rem;
  margin: 0;
  border: none;
  border-bottom: 1px solid #333;
  max-height: 300px;
  overflow-y: auto;
  flex: 1;
`;

const Title = styled.h3`
  color: #ffd700;
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: bold;
`;

const ActionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ActionItem = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 0.85rem;
  border-left: 3px solid #ffd700;
`;

const ActionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
`;

const PlayerName = styled.span`
  color: #ffd700;
  font-weight: bold;
`;

const ActionType = styled.span<{ action: string }>`
  color: ${props => {
    switch (props.action.toLowerCase()) {
      case 'bet':
      case 'raise':
        return '#ff6b6b';
      case 'call':
        return '#4ecdc4';
      case 'check':
        return '#95e1d3';
      case 'fold':
        return '#fce38a';
      case 'allin':
        return '#ff8fb1';
      default:
        return '#ffffff';
    }
  }};
  text-transform: capitalize;
  font-weight: bold;
`;

const Amount = styled.span`
  color: #90ee90;
  font-weight: bold;
`;

const ActionDetails = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #cccccc;
`;

const Phase = styled.span`
  text-transform: capitalize;
  color: #87ceeb;
`;

const Timestamp = styled.span`
  color: #999999;
`;

const EmptyMessage = styled.div`
  color: #999999;
  text-align: center;
  font-style: italic;
  padding: 1rem;
`;

const LoadingMessage = styled.div`
  color: #ffd700;
  text-align: center;
  padding: 1rem;
`;

const ErrorMessage = styled.div`
  color: #ff6b6b;
  text-align: center;
  padding: 1rem;
  font-size: 0.9rem;
`;

export const ActionHistory: React.FC<ActionHistoryProps> = ({ gameId, tableId, handNumber, gameState, currentPlayerId }) => {
  const [actions, setActions] = useState<ActionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActionHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use tableId if available, otherwise fall back to gameId
      const id = tableId || gameId;
      if (!id) {
        console.log('⚠️ ActionHistory: No gameId or tableId provided');
        setActions([]);
        setLoading(false);
        return;
      }

      const url = handNumber 
        ? `/api/tables/${id}/actions/history?handNumber=${handNumber}`
        : `/api/tables/${id}/actions/history`;

      console.log(`🎯 ActionHistory: Fetching from ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch action history: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setActions(data.actionHistory || []);
        console.log(`✅ ActionHistory: Loaded ${data.actionHistory?.length || 0} actions`);
      } else {
        throw new Error(data.error || 'Failed to fetch action history');
      }
    } catch (err) {
      console.error('Error fetching action history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load action history');
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, [gameId, tableId, handNumber]);

  useEffect(() => {
    if (gameId || tableId) {
      fetchActionHistory();
    }
  }, [gameId, tableId, handNumber, fetchActionHistory]);

  const formatAmount = (amount: number | null) => {
    if (amount === null || amount === 0) return '';
    return `$${amount.toLocaleString()}`;
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatAction = (action: string, amount: number | null) => {
    const actionText = action.toLowerCase();
    const amountText = formatAmount(amount);
    
    if (amountText && (actionText === 'bet' || actionText === 'raise' || actionText === 'call')) {
      return `${actionText} ${amountText}`;
    }
    return actionText;
  };

  // Get current player info from game state
  const currentPlayer = gameState?.currentPlayerId ? gameState.players?.find((p: any) => p.id === gameState.currentPlayerId) : null;
  const isCurrentPlayerTurn = currentPlayerId === gameState?.currentPlayerId;
  
  return (
    <Container data-testid="game-history">
      <Title data-testid="game-history-title">
        Game History
        {handNumber && ` (Hand ${handNumber})`}
        {actions.length > 0 && ` (${actions.length})`}
      </Title>
      
      {/* Current Player Information */}
      <div data-testid="current-player-info" style={{ 
        fontSize: '11px', 
        color: '#ffd700', 
        marginBottom: '8px',
        padding: '4px 8px',
        background: isCurrentPlayerTurn ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        border: isCurrentPlayerTurn ? '1px solid #00ff00' : '1px solid #666'
      }}>
        <strong>Current Player:</strong> {currentPlayer?.name || 'None'} 
        {isCurrentPlayerTurn && ' (YOUR TURN!)'}
        <br />
        <span style={{ fontSize: '10px', color: '#ccc' }}>
          Game Phase: {gameState?.phase || 'unknown'} | 
          Status: {gameState?.status || 'unknown'} | 
          Players: {gameState?.players?.length || 0}
        </span>
      </div>
      
      <div data-testid="game-history-debug" style={{ fontSize: '10px', color: '#666' }}>
        Debug: gameId={gameId}, tableId={tableId}, loading={loading.toString()}, error={error || 'none'}
        <br />
        Current Player ID: {currentPlayerId || 'none'} | 
        Game Current Player: {gameState?.currentPlayerId || 'none'} | 
        Is My Turn: {isCurrentPlayerTurn ? 'YES' : 'NO'}
      </div>
      
      {loading && <LoadingMessage>Loading action history...</LoadingMessage>}
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {!loading && !error && actions.length === 0 && (
        <EmptyMessage>No actions recorded yet</EmptyMessage>
      )}
      
      {!loading && !error && actions.length > 0 && (
        <ActionList>
          {actions.map((action) => (
            <ActionItem key={action.id}>
              <ActionHeader>
                <div>
                  <PlayerName>{action.playerName}</PlayerName>
                  {' '}
                  <ActionType action={action.action}>
                    {formatAction(action.action, action.amount)}
                  </ActionType>
                </div>
                {action.amount && action.amount > 0 && (
                  <Amount>{formatAmount(action.amount)}</Amount>
                )}
              </ActionHeader>
              <ActionDetails>
                <Phase>{action.phase}</Phase>
                <Timestamp>{formatTimestamp(action.timestamp)}</Timestamp>
              </ActionDetails>
            </ActionItem>
          ))}
        </ActionList>
      )}
    </Container>
  );
}; 