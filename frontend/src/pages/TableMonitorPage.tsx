import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

// Types
interface MonitoringData {
  success: boolean;
  timestamp: string;
  tablesCount: number;
  tables: TableDetails[];
  summary: {
    totalTables: number;
    activeTables: number;
    totalObservers: number;
    totalPlayers: number;
    totalUsers: number;
    tablesWithGames: number;
    tablesWithIssues: number;
  };
}

interface TableDetails {
  id: number;
  name: string;
  gameType: string;
  stakes: string;
  maxPlayers: number;
  minBuyIn: number;
  maxBuyIn: number;
  observers: Array<{ playerId: string; nickname: string; updatedAt: string }>;
  players: Array<{ playerId: string; nickname: string; seat: number; updatedAt: string }>;
  observersCount: number;
  playersCount: number;
  totalUsers: number;
  gameInfo: {
    id: string;
    status: string;
    phase: string;
    pot: number;
    currentPlayerId: string;
    playersCount: number;
    communityCards: number;
  } | null;
  lastUpdated: string;
  hasValidCounts: boolean;
  hasOverlaps: boolean;
  hasDuplicateObservers: boolean;
  hasDuplicatePlayers: boolean;
}

// Styled Components
const MonitorContainer = styled.div`
  padding: 20px;
  background: #1a1a1a;
  color: #ffffff;
  min-height: 100vh;
  font-family: 'Courier New', monospace;
`;

const Header = styled.div`
  margin-bottom: 30px;
  padding: 20px;
  background: #2a2a2a;
  border-radius: 8px;
  border-left: 4px solid #00ff00;
`;

const Title = styled.h1`
  margin: 0 0 10px 0;
  color: #00ff00;
  font-size: 24px;
`;

const LastUpdated = styled.div`
  color: #888;
  font-size: 14px;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
`;

const SummaryCard = styled.div<{ $isIssue?: boolean }>`
  padding: 15px;
  background: ${props => props.$isIssue ? '#3a1a1a' : '#2a2a2a'};
  border-radius: 8px;
  border-left: 4px solid ${props => props.$isIssue ? '#ff4444' : '#4444ff'};
`;

const SummaryLabel = styled.div`
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
  margin-bottom: 5px;
`;

const SummaryValue = styled.div<{ $isIssue?: boolean }>`
  font-size: 24px;
  font-weight: bold;
  color: ${props => props.$isIssue ? '#ff4444' : '#00ff00'};
`;

const Controls = styled.div`
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
`;

const RefreshButton = styled.button`
  padding: 10px 20px;
  background: #00ff00;
  color: #000;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    background: #00cc00;
  }
  
  &:disabled {
    background: #666;
    cursor: not-allowed;
  }
`;

const AutoRefreshToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ccc;
  cursor: pointer;
`;

const FilterInput = styled.input`
  padding: 8px 12px;
  background: #2a2a2a;
  border: 1px solid #555;
  border-radius: 4px;
  color: #fff;
  
  &::placeholder {
    color: #888;
  }
`;

const TableGrid = styled.div`
  display: grid;
  gap: 20px;
`;

const TableCard = styled.div<{ $hasIssues?: boolean }>`
  background: #2a2a2a;
  border-radius: 8px;
  border: 2px solid ${props => props.$hasIssues ? '#ff4444' : '#555'};
  overflow: hidden;
`;

const TableHeader = styled.div<{ $hasIssues?: boolean }>`
  padding: 15px;
  background: ${props => props.$hasIssues ? '#3a1a1a' : '#333'};
  border-bottom: 1px solid #555;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TableName = styled.h3`
  margin: 0;
  color: #fff;
`;

const TableStats = styled.div`
  display: flex;
  gap: 15px;
  font-size: 14px;
`;

const Stat = styled.span<{ $color?: string }>`
  color: ${props => props.$color || '#888'};
`;

const TableBody = styled.div`
  padding: 15px;
`;

const Section = styled.div`
  margin-bottom: 15px;
`;

const SectionTitle = styled.h4`
  margin: 0 0 8px 0;
  color: #00ff00;
  font-size: 14px;
`;

const UserList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const UserTag = styled.span<{ $type: 'observer' | 'player' }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: ${props => props.$type === 'observer' ? '#1a3a1a' : '#1a1a3a'};
  color: ${props => props.$type === 'observer' ? '#66ff66' : '#6666ff'};
  border: 1px solid ${props => props.$type === 'observer' ? '#66ff66' : '#6666ff'};
`;

const GameInfo = styled.div`
  background: #1a1a2a;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
`;

const IssuesList = styled.div`
  background: #3a1a1a;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #ff4444;
`;

const Issue = styled.div`
  color: #ff6666;
  font-size: 12px;
  margin-bottom: 4px;
`;

const TableMonitorPage: React.FC = () => {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/tables/monitor');
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      } else {
        setError(result.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const filteredTables = data?.tables.filter(table => 
    table.name?.toLowerCase().includes(filter.toLowerCase()) ||
    table.observers?.some(o => o.nickname?.toLowerCase().includes(filter.toLowerCase())) ||
    table.players?.some(p => p.nickname?.toLowerCase().includes(filter.toLowerCase()))
  ) || [];

  const renderIssues = (table: TableDetails) => {
    const issues = [];
    if (table.hasOverlaps) issues.push('Players in both observers and players lists');
    if (table.hasDuplicateObservers) issues.push('Duplicate nicknames in observers');
    if (table.hasDuplicatePlayers) issues.push('Duplicate nicknames in players');
    
    return issues.length > 0 ? (
      <Section>
        <SectionTitle>⚠️ Issues Detected</SectionTitle>
        <IssuesList>
          {issues.map((issue, index) => (
            <Issue key={index}>{issue}</Issue>
          ))}
        </IssuesList>
      </Section>
    ) : null;
  };

  if (error) {
    return (
      <MonitorContainer>
        <Header>
          <Title>Table Monitor - Error</Title>
          <div style={{ color: '#ff4444' }}>Error: {error}</div>
        </Header>
      </MonitorContainer>
    );
  }

  return (
    <MonitorContainer>
      <Header>
        <Title>🎮 Table Monitor</Title>
        <LastUpdated>
          Last updated: {data ? new Date(data.timestamp).toLocaleString() : 'Never'}
        </LastUpdated>
      </Header>

      {data && (
        <SummaryGrid>
          <SummaryCard>
            <SummaryLabel>Total Tables</SummaryLabel>
            <SummaryValue>{data.summary.totalTables}</SummaryValue>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>Active Tables</SummaryLabel>
            <SummaryValue>{data.summary.activeTables}</SummaryValue>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>Total Users</SummaryLabel>
            <SummaryValue>{data.summary.totalUsers}</SummaryValue>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>Observers</SummaryLabel>
            <SummaryValue>{data.summary.totalObservers}</SummaryValue>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>Players</SummaryLabel>
            <SummaryValue>{data.summary.totalPlayers}</SummaryValue>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>With Games</SummaryLabel>
            <SummaryValue>{data.summary.tablesWithGames}</SummaryValue>
          </SummaryCard>
          <SummaryCard $isIssue>
            <SummaryLabel>Issues</SummaryLabel>
            <SummaryValue $isIssue>{data.summary.tablesWithIssues}</SummaryValue>
          </SummaryCard>
        </SummaryGrid>
      )}

      <Controls>
        <RefreshButton onClick={fetchData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Now'}
        </RefreshButton>
        <AutoRefreshToggle>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh (5s)
        </AutoRefreshToggle>
        <FilterInput
          placeholder="Filter tables or users..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </Controls>

      <TableGrid>
        {filteredTables.map(table => {
          const hasIssues = table.hasOverlaps || table.hasDuplicateObservers || table.hasDuplicatePlayers;
          
          return (
            <TableCard key={table.id} $hasIssues={hasIssues}>
              <TableHeader $hasIssues={hasIssues}>
                <TableName>{table.name}</TableName>
                <TableStats>
                  <Stat $color="#66ff66">👥 {table.totalUsers}</Stat>
                  <Stat $color="#6666ff">👀 {table.observersCount}</Stat>
                  <Stat $color="#ffff66">🎲 {table.playersCount}</Stat>
                  {table.gameInfo && (
                    <Stat $color="#ff6666">🎮 {table.gameInfo.phase}</Stat>
                  )}
                </TableStats>
              </TableHeader>
              
              <TableBody>
                {renderIssues(table)}
                
                <Section>
                  <SectionTitle>Observers ({table.observersCount})</SectionTitle>
                  <UserList>
                    {table.observers.length > 0 ? (
                      table.observers.map(observer => (
                        <UserTag key={observer.playerId} $type="observer">
                          {observer.nickname}
                        </UserTag>
                      ))
                    ) : (
                      <span style={{ color: '#666' }}>No observers</span>
                    )}
                  </UserList>
                </Section>

                <Section>
                  <SectionTitle>Players ({table.playersCount})</SectionTitle>
                  <UserList>
                    {table.players.length > 0 ? (
                      table.players.map(player => (
                        <UserTag key={player.playerId} $type="player">
                          {player.nickname} (Seat {player.seat})
                        </UserTag>
                      ))
                    ) : (
                      <span style={{ color: '#666' }}>No players</span>
                    )}
                  </UserList>
                </Section>

                {table.gameInfo && (
                  <Section>
                    <SectionTitle>Game State</SectionTitle>
                    <GameInfo>
                      <div>Status: {table.gameInfo.status} | Phase: {table.gameInfo.phase}</div>
                      <div>Pot: ${table.gameInfo.pot} | Players: {table.gameInfo.playersCount}</div>
                      <div>Community Cards: {table.gameInfo.communityCards}</div>
                      <div>Current Player: {table.gameInfo.currentPlayerId || 'None'}</div>
                    </GameInfo>
                  </Section>
                )}

                <Section>
                  <SectionTitle>Table Info</SectionTitle>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    {table.gameType} | {table.stakes} | Max: {table.maxPlayers} | Buy-in: ${table.minBuyIn}-${table.maxBuyIn}
                  </div>
                </Section>
              </TableBody>
            </TableCard>
          );
        })}
      </TableGrid>

      {filteredTables.length === 0 && data && (
        <div style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
          {filter ? 'No tables match your filter' : 'No tables found'}
        </div>
      )}
    </MonitorContainer>
  );
};

export default TableMonitorPage; 