import React, { useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import { TableCard } from './TableCard';
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  padding: 1.5rem;
  background: rgba(27, 77, 62, 0.2);
  border-radius: 8px;
  margin-top: 1rem;
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

    // Request tables data
    socketService.requestLobbyTables();

    return () => {
      socketService.offTablesUpdate();
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
    if (selectedTable) {
      // Save nickname for future use
      localStorage.setItem('nickname', nickname);
      
      // Navigate to the Join Game page with table data
      navigate('/join', { state: { table: selectedTable } });
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
            {tablesByStakes[stakes].map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onClick={() => handleTableClick(table)}
              />
            ))}
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