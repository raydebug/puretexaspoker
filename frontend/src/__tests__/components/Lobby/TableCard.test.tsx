import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableCard } from '../../../components/Lobby/TableCard';

describe('TableCard', () => {
  const mockTable = {
    id: 1,
    name: 'Test Table',
    players: 3,
    maxPlayers: 6,
    observers: 2,
    status: 'active' as const,
    stakes: '$0.01/$0.02',
    gameType: 'No Limit' as const,
    smallBlind: 0.01,
    bigBlind: 0.02,
    minBuyIn: 1,
    maxBuyIn: 2,
  };

  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table information correctly', () => {
    render(<TableCard table={mockTable} onClick={mockOnClick} />);

    expect(screen.getByText('Test Table')).toBeInTheDocument();
    expect(screen.getByText('$0.01/$0.02')).toBeInTheDocument();
    expect(screen.getByText('No Limit Hold\'em (6-max)')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Players: 3/6')).toBeInTheDocument();
    expect(screen.getByText('Observers: 2')).toBeInTheDocument();
    expect(screen.getByText('Buy-in: $1 - $2')).toBeInTheDocument();
  });

  it('handles click events', () => {
    render(<TableCard table={mockTable} onClick={mockOnClick} />);
    fireEvent.click(screen.getByText('Test Table'));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('displays correct status colors', () => {
    const { rerender } = render(<TableCard table={mockTable} onClick={mockOnClick} />);
    
    // Active status
    let statusBadge = screen.getByText('Active');
    expect(statusBadge).toHaveStyle({ background: '#e6f4ea', color: '#1e8e3e' });

    // Waiting status
    rerender(
      <TableCard
        table={{ ...mockTable, status: 'waiting' }}
        onClick={mockOnClick}
      />
    );
    statusBadge = screen.getByText('Waiting');
    expect(statusBadge).toHaveStyle({ background: '#fff3e0', color: '#e65100' });

    // Full status
    rerender(
      <TableCard table={{ ...mockTable, status: 'full' }} onClick={mockOnClick} />
    );
    statusBadge = screen.getByText('Full');
    expect(statusBadge).toHaveStyle({ background: '#fbe9e7', color: '#c62828' });
  });

  it('displays different max players correctly', () => {
    const { rerender } = render(<TableCard table={mockTable} onClick={mockOnClick} />);
    expect(screen.getByText('No Limit Hold\'em (6-max)')).toBeInTheDocument();

    rerender(
      <TableCard
        table={{ ...mockTable, maxPlayers: 9 }}
        onClick={mockOnClick}
      />
    );
    expect(screen.getByText('No Limit Hold\'em (9-max)')).toBeInTheDocument();
  });

  it('displays different game types correctly', () => {
    const { rerender } = render(<TableCard table={mockTable} onClick={mockOnClick} />);
    expect(screen.getByText('No Limit Hold\'em (6-max)')).toBeInTheDocument();

    rerender(
      <TableCard
        table={{ ...mockTable, gameType: 'Pot Limit' }}
        onClick={mockOnClick}
      />
    );
    expect(screen.getByText('Pot Limit Hold\'em (6-max)')).toBeInTheDocument();

    rerender(
      <TableCard
        table={{ ...mockTable, gameType: 'Fixed Limit' }}
        onClick={mockOnClick}
      />
    );
    expect(screen.getByText('Fixed Limit Hold\'em (6-max)')).toBeInTheDocument();
  });
}); 