import React, { useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import { JoinDialog } from './JoinDialog';
import { socketService } from '../../services/socketService';
import { TableData } from '../../types/table';
import { useNavigate } from 'react-router-dom';

interface TableGridProps {
  filters: {
    search: string;
    status: string;
    players: string;
    gameType: string;
  };
}

const GridContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const StakesHeader = styled.h2`
  font-size: 1.5rem;
  color: #ffd700;
  margin: 0;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  border: 1px solid #8b0000;
  display: flex;
  align-items: center;
  gap: 1rem;

  &::before {
    content: '♠';
    font-size: 1.2em;
    color: #ffd700;
  }

  &::after {
    content: '♦';
    font-size: 1.2em;
    color: #ffd700;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
`;

const Card = styled.div`
  background: rgba(0, 0, 0, 0.7);
  border-radius: 10px;
  padding: 1.5rem;
  border: 1px solid #8b0000;
  transition: all 0.2s;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    border-color: #ffd700;
  }
`;

const TableName = styled.h3`
  color: #ffd700;
  margin: 0 0 1rem 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Status = styled.span<{ $isRunning?: boolean }>`
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: ${props => props.$isRunning ? '#2c8a3d' : '#8b0000'};
  color: white;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  color: #e0e0e0;
  font-size: 0.9rem;
`;

const JoinButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  margin-top: 1rem;
  border-radius: 4px;
  border: none;
  background: #2c8a3d;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #37a34a;
  }
`;

const StakesSection = styled.div`
  &:not(:last-child) {
    margin-bottom: 2rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #ffd700;
  font-size: 1.2rem;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  border: 1px solid #8b0000;
  margin: 1rem 0;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #ffd700;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  border: 1px solid #8b0000;
`;

const Spinner = styled.div`
  border: 3px solid rgba(255, 215, 0, 0.2);
  border-top: 3px solid #ffd700;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #ff4444;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  border: 1px solid #8b0000;
  margin: 1rem 0;
`;

const RetryButton = styled.button`
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: #8b0000;
  color: #ffd700;
  border: 1px solid #ffd700;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;

  &:hover {
    background: #a00;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
`;

export const TableGrid: React.FC<TableGridProps> = ({ filters }) => {
  const [tables, setTables] = useState<TableData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Listen for table updates
    const handleTablesUpdate = (updatedTables: TableData[]) => {
      console.log('DEBUG: TableGrid received tables update with', updatedTables.length, 'tables');
      console.log('DEBUG: Updated tables:', updatedTables);
      setTables(updatedTables);
      setIsLoading(false);
    };

    socketService.onTablesUpdate(handleTablesUpdate);

    // Listen for errors
    const handleError = (err: { message: string }) => {
      setError(err.message);
      setIsLoading(false);
    };

    socketService.onError(handleError);

    // Request tables data - only if we have a valid socket connection
    console.log('DEBUG: TableGrid requesting lobby tables');
    socketService.requestLobbyTables();

    // Add a timeout fallback in case socket doesn't work
    const timeoutId = setTimeout(() => {
      if (tables.length === 0 && isLoading) {
        console.log('DEBUG: Timeout reached, retrying table request');
        socketService.requestLobbyTables();
        
        // If still no tables after another delay, try HTTP fallback
        setTimeout(async () => {
          if (tables.length === 0 && isLoading) {
            console.log('DEBUG: Trying HTTP fallback for tables');
            try {
              const response = await fetch('http://localhost:3001/api/lobby-tables');
              if (response.ok) {
                const tablesData = await response.json();
                console.log('DEBUG: HTTP fallback successful, got', tablesData.length, 'tables');
                setTables(tablesData);
                setIsLoading(false);
              } else {
                throw new Error('HTTP request failed');
              }
            } catch (error) {
              console.log('DEBUG: HTTP fallback failed, stopping loading');
              setIsLoading(false);
              setError('Unable to load tables. Please refresh the page.');
            }
          }
        }, 2000);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      socketService.offTablesUpdate();
      // Don't disconnect here - connection will be managed by the socket service
    };
  }, []);

  const handleTableClick = (table: TableData) => {
    if (error) return;
    setSelectedTable(table);
    setShowJoinDialog(true);
  };

  const handleJoinDialogClose = () => {
    setShowJoinDialog(false);
    setSelectedTable(null);
  };

  const handleJoinTable = (nickname: string) => {
    console.log('TableGrid: handleJoinTable called with', { nickname, selectedTable: selectedTable?.id });
    if (selectedTable) {
      // Save nickname for future use
      localStorage.setItem('nickname', nickname);
      
      // Update location immediately when user chooses to join table in lobby
      const targetLocation = `table-${selectedTable.id}`;
      console.log(`🎯 LOBBY: Immediately updating user location to: ${targetLocation} when joining table ${selectedTable.id}`);
      
      // Update the socketService location immediately
      try {
        // Set the location directly in socketService
        (socketService as any).currentUserLocation = targetLocation;
        console.log(`🎯 LOBBY: SocketService location updated to: ${targetLocation}`);
      } catch (error) {
        console.warn('🎯 LOBBY: Failed to update socketService location:', error);
      }
      
      console.log('TableGrid: Navigating to /join-table with state', { table: selectedTable });
      // Navigate to the Join Game page with table data (no buyIn needed for observer)
      navigate('/join-table', { 
        state: { 
          table: selectedTable
        } 
      });
    } else {
      console.log('TableGrid: No selected table found');
    }
  };

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      // Search filter
      if (
        filters.search &&
        !table.name.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && table.status !== filters.status) {
        return false;
      }

      // Game type filter
      if (filters.gameType !== 'all' && table.gameType !== filters.gameType) {
        return false;
      }

      // Players filter
      if (filters.players !== 'all') {
        switch (filters.players) {
          case 'empty':
            if (table.players !== 0) return false;
            break;
          case 'partial':
            if (table.players === 0 || table.players === table.maxPlayers)
              return false;
            break;
          case 'full':
            if (table.players !== table.maxPlayers) return false;
            break;
        }
      }

      return true;
    });
  }, [tables, filters]);

  // Group tables by stakes level
  const tablesByStakes = useMemo(() => {
    return filteredTables.reduce((acc, table) => {
      if (!acc[table.stakes]) {
        acc[table.stakes] = [];
      }
      acc[table.stakes].push(table);
      return acc;
    }, {} as Record<string, TableData[]>);
  }, [filteredTables]);

  // Sort stakes levels
  const stakesLevels = useMemo(() => {
    return Object.keys(tablesByStakes).sort((a, b) => {
      const getSmallBlind = (stakes: string) =>
        parseFloat(stakes.split('/')[0].replace('$', ''));
      return getSmallBlind(a) - getSmallBlind(b);
    });
  }, [tablesByStakes]);

  const renderTable = (table: TableData) => (
    <Card
      key={table.id}
      onClick={() => handleTableClick(table)}
      data-testid="table-row"
      data-table-id={table.id}
    >
      <TableName>
        {table.name}
        <Status $isRunning={table.status === 'active'} data-testid={`table-status-${table.id}`}>
          {table.status === 'active' ? 'Running' : 'Waiting'}
        </Status>
      </TableName>
      <InfoRow data-testid={`table-info-${table.id}`}>
        <span>Players: {table.players}/{table.maxPlayers}</span>
        <span>Stakes: {table.stakes}</span>
      </InfoRow>
      <InfoRow>
        <span>Game Type: {table.gameType}</span>
      </InfoRow>
      <JoinButton data-testid={`join-table-${table.id}`}>
        Join Table
      </JoinButton>
    </Card>
  );

  if (isLoading) {
    return (
      <LoadingState>
        <Spinner />
        <div>Loading tables...</div>
      </LoadingState>
    );
  }

  if (error) {
    return (
      <ErrorState>
        <div>{error}</div>
        <RetryButton onClick={() => socketService.requestLobbyTables()}>
          Retry
        </RetryButton>
      </ErrorState>
    );
  }

  if (filteredTables.length === 0) {
    return (
      <EmptyState>
        No tables match your filters. Try adjusting your search criteria.
      </EmptyState>
    );
  }

  return (
    <GridContainer>
      {stakesLevels.map((stakes) => (
        <StakesSection key={stakes}>
          <StakesHeader>{stakes} Stakes</StakesHeader>
          <Grid>
            {tablesByStakes[stakes].map((table) => renderTable(table))}
          </Grid>
        </StakesSection>
      ))}

      {showJoinDialog && selectedTable && (
        <JoinDialog
          table={selectedTable}
          onClose={handleJoinDialogClose}
          onJoin={handleJoinTable}
        />
      )}
    </GridContainer>
  );
}; 