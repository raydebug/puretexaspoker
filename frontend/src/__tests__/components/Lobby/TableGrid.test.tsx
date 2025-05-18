import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TableGrid } from '../../../components/Lobby/TableGrid';
import { socket } from '../../../services/socket';
import { generateInitialTables } from '../../../utils/tableUtils';

// Mock socket.io-client
jest.mock('../../../services/socket', () => ({
  socket: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
}));

// Mock table generation
jest.mock('../../../utils/tableUtils', () => ({
  generateInitialTables: jest.fn(),
  formatMoney: (amount: number) => `$${amount}`,
}));

describe('TableGrid', () => {
  const mockTables = [
    {
      id: 1,
      name: 'Table 1',
      players: 3,
      maxPlayers: 6,
      observers: 2,
      status: 'active',
      stakes: '$0.01/$0.02',
      gameType: 'No Limit',
      smallBlind: 0.01,
      bigBlind: 0.02,
      minBuyIn: 1,
      maxBuyIn: 2,
    },
    {
      id: 2,
      name: 'Table 2',
      players: 0,
      maxPlayers: 9,
      observers: 0,
      status: 'waiting',
      stakes: '$0.02/$0.05',
      gameType: 'Pot Limit',
      smallBlind: 0.02,
      bigBlind: 0.05,
      minBuyIn: 2,
      maxBuyIn: 5,
    },
  ];

  const defaultFilters = {
    search: '',
    status: 'all',
    players: 'all',
    gameType: 'all',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (generateInitialTables as jest.Mock).mockReturnValue(mockTables);
  });

  it('renders loading state initially', () => {
    render(<TableGrid filters={defaultFilters} />);
    expect(screen.getByText('Loading tables...')).toBeInTheDocument();
  });

  it('renders tables grouped by stakes', async () => {
    render(<TableGrid filters={defaultFilters} />);
    
    await waitFor(() => {
      expect(screen.getByText('$0.01/$0.02 Tables')).toBeInTheDocument();
      expect(screen.getByText('$0.02/$0.05 Tables')).toBeInTheDocument();
    });
  });

  it('filters tables by search term', async () => {
    render(
      <TableGrid
        filters={{
          ...defaultFilters,
          search: 'Table 1',
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Table 1')).toBeInTheDocument();
      expect(screen.queryByText('Table 2')).not.toBeInTheDocument();
    });
  });

  it('filters tables by status', async () => {
    render(
      <TableGrid
        filters={{
          ...defaultFilters,
          status: 'waiting',
        }}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Table 1')).not.toBeInTheDocument();
      expect(screen.getByText('Table 2')).toBeInTheDocument();
    });
  });

  it('filters tables by game type', async () => {
    render(
      <TableGrid
        filters={{
          ...defaultFilters,
          gameType: 'Pot Limit',
        }}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Table 1')).not.toBeInTheDocument();
      expect(screen.getByText('Table 2')).toBeInTheDocument();
    });
  });

  it('shows empty state when no tables match filters', async () => {
    render(
      <TableGrid
        filters={{
          ...defaultFilters,
          search: 'nonexistent',
        }}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('No tables match your filters. Try adjusting your search criteria.')
      ).toBeInTheDocument();
    });
  });

  it('handles table join click', async () => {
    render(<TableGrid filters={defaultFilters} />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Table 1'));
    });

    expect(screen.getByText('Join Table')).toBeInTheDocument();
    expect(screen.getByText(/Would you like to join Table 1/)).toBeInTheDocument();
  });

  it('handles socket errors', async () => {
    const mockError = new Error('Connection error');
    render(<TableGrid filters={defaultFilters} />);

    // Simulate socket error
    const errorCallback = (socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === 'error'
    )[1];
    errorCallback(mockError);

    await waitFor(() => {
      expect(screen.getByText('Connection error. Please try again.')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('handles table updates', async () => {
    render(<TableGrid filters={defaultFilters} />);

    const updatedTables = [
      {
        ...mockTables[0],
        players: 4,
      },
    ];

    // Simulate table update
    const updateCallback = (socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === 'tablesUpdate'
    )[1];
    updateCallback(updatedTables);

    await waitFor(() => {
      expect(screen.getByText('Players: 4/6')).toBeInTheDocument();
    });
  });
}); 