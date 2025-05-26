import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TableCard } from '../../../components/Lobby/TableCard';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '../../../styles/theme';
import { TableData } from '../../../types/table';

describe('TableCard', () => {
  const mockTable: TableData = {
    id: 1,
    name: 'Test Table',
    players: 3,
    maxPlayers: 6,
    observers: 2,
    status: 'active',
    stakes: '$0.01/$0.02',
    gameType: 'No Limit',
    smallBlind: 0.01,
    bigBlind: 0.02,
    minBuyIn: 1,
    maxBuyIn: 2
  };

  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table information correctly', () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableCard table={mockTable} onClick={mockOnClick} />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Test Table')).toBeInTheDocument();
    expect(screen.getByText('$0.01/$0.02')).toBeInTheDocument();
    expect(screen.getByText('No Limit Hold\'em (6-max)')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Players: 3/6')).toBeInTheDocument();
    expect(screen.getByText('Observers: 2')).toBeInTheDocument();
    expect(screen.getByText('Buy-in: $1 - $2')).toBeInTheDocument();
  });

  it('handles click events', () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableCard table={mockTable} onClick={mockOnClick} />
        </ThemeProvider>
      </MemoryRouter>
    );
    screen.getByText('Test Table').click();
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('displays correct status colors', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableCard table={mockTable} onClick={mockOnClick} />
        </ThemeProvider>
      </MemoryRouter>
    );
    
    // Active status
    let statusBadge = screen.getByText('Active');
    expect(statusBadge).toHaveStyle({ background: 'rgba(30, 142, 62, 0.9)', color: 'white' });

    // Waiting status
    rerender(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableCard
            table={{ ...mockTable, status: 'waiting' }}
            onClick={mockOnClick}
          />
        </ThemeProvider>
      </MemoryRouter>
    );
    statusBadge = screen.getByText('Waiting');
    expect(statusBadge).toHaveStyle({ background: 'rgba(230, 81, 0, 0.9)', color: 'white' });

    // Full status
    rerender(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableCard table={{ ...mockTable, status: 'full' }} onClick={mockOnClick} />
        </ThemeProvider>
      </MemoryRouter>
    );
    statusBadge = screen.getByText('Full');
    expect(statusBadge).toHaveStyle({ background: 'rgba(198, 40, 40, 0.9)', color: 'white' });
  });

  it('displays different max players correctly', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableCard table={mockTable} onClick={mockOnClick} />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('No Limit Hold\'em (6-max)')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableCard
            table={{ ...mockTable, maxPlayers: 9 }}
            onClick={mockOnClick}
          />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('No Limit Hold\'em (9-max)')).toBeInTheDocument();
  });

  it('displays different game types correctly', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableCard table={mockTable} onClick={mockOnClick} />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('No Limit Hold\'em (6-max)')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableCard
            table={{ ...mockTable, gameType: 'Pot Limit' }}
            onClick={mockOnClick}
          />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Pot Limit Hold\'em (6-max)')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableCard
            table={{ ...mockTable, gameType: 'Fixed Limit' }}
            onClick={mockOnClick}
          />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Fixed Limit Hold\'em (6-max)')).toBeInTheDocument();
  });
}); 