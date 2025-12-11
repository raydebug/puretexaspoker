import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableFilters } from '../../../components/Lobby/TableFilters';
import { ThemeProvider } from 'styled-components';
import { theme } from '../../../styles/theme';

describe('TableFilters', () => {
  const mockOnFilterChange = jest.fn();
  const defaultFilters = {
    search: '',
    gameType: 'all',
    status: 'all',
    players: 'all'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderTableFilters = (filters = defaultFilters) => {
    return render(
      <ThemeProvider theme={theme}>
        <TableFilters filters={filters} onFilterChange={mockOnFilterChange} />
      </ThemeProvider>
    );
  };

  describe('search input behavior', () => {
    it('updates search value on input change', () => {
      renderTableFilters();
      const searchInput = screen.getByLabelText('Search Tables');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      expect(mockOnFilterChange).toHaveBeenCalledWith('search', 'test');
    });

    it('trims whitespace from input', () => {
      renderTableFilters();
      const searchInput = screen.getByLabelText('Search Tables');
      fireEvent.change(searchInput, { target: { value: '  padded  ' } });
      expect(mockOnFilterChange).toHaveBeenCalledWith('search', '  padded  ');
    });
  });

  describe('select filters behavior', () => {
    it('updates game type filter', () => {
      renderTableFilters();
      const gameTypeSelect = screen.getByLabelText('Game Type');
      fireEvent.change(gameTypeSelect, { target: { name: 'gameType', value: 'No Limit' } });
      expect(mockOnFilterChange).toHaveBeenCalledWith('gameType', 'No Limit');
    });

    it('updates status filter', () => {
      renderTableFilters();
      const statusSelect = screen.getByLabelText('Table Status');
      fireEvent.change(statusSelect, { target: { name: 'status', value: 'active' } });
      expect(mockOnFilterChange).toHaveBeenCalledWith('status', 'active');
    });

    it('updates players filter', () => {
      renderTableFilters();
      const playersSelect = screen.getByLabelText('Players');
      fireEvent.change(playersSelect, { target: { name: 'players', value: 'full' } });
      expect(mockOnFilterChange).toHaveBeenCalledWith('players', 'full');
    });
  });

  describe('filter options', () => {
    it('renders all game type options', () => {
      renderTableFilters();
      const gameTypeSelect = screen.getByLabelText('Game Type');
      expect(gameTypeSelect).toBeInTheDocument();
      ['All Types', 'No Limit', 'Pot Limit', 'Fixed Limit'].forEach(option => {
        expect(screen.getByRole('option', { name: option })).toBeInTheDocument();
      });
    });

    it('renders all status options', () => {
      renderTableFilters();
      const statusSelect = screen.getByLabelText('Table Status');
      expect(statusSelect).toBeInTheDocument();
      ['All Tables', 'Active', 'Waiting', 'Full'].forEach(option => {
        expect(screen.getByRole('option', { name: option })).toBeInTheDocument();
      });
    });

    it('renders all player count options', () => {
      renderTableFilters();
      const playersSelect = screen.getByLabelText('Players');
      expect(playersSelect).toBeInTheDocument();
      ['Any Number', 'Empty (0)', 'Partial (1-8)', 'Full (9)'].forEach(option => {
        expect(screen.getByRole('option', { name: option })).toBeInTheDocument();
      });
    });
  });

  describe('initial values', () => {
    it('sets initial values from props', () => {
      const initialFilters = {
        search: 'test',
        gameType: 'No Limit',
        status: 'active',
        players: 'full'
      };
      renderTableFilters(initialFilters);

      expect(screen.getByLabelText('Search Tables')).toHaveValue('test');
      expect(screen.getByLabelText('Game Type')).toHaveValue('No Limit');
      expect(screen.getByLabelText('Table Status')).toHaveValue('active');
      expect(screen.getByLabelText('Players')).toHaveValue('full');
    });
  });
}); 