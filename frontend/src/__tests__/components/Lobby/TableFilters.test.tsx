import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableFilters } from '../../../components/Lobby/TableFilters';

describe('TableFilters', () => {
  const mockHandlers = {
    onSearch: jest.fn(),
    onStatusFilter: jest.fn(),
    onPlayersFilter: jest.fn(),
    onGameTypeFilter: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all filter controls', () => {
    render(<TableFilters {...mockHandlers} />);

    expect(screen.getByPlaceholderText('Search tables...')).toBeInTheDocument();
    expect(screen.getByText('All Types')).toBeInTheDocument();
    expect(screen.getByText('All Tables')).toBeInTheDocument();
    expect(screen.getByText('Any Players')).toBeInTheDocument();
  });

  it('handles search input changes', () => {
    render(<TableFilters {...mockHandlers} />);
    
    const searchInput = screen.getByPlaceholderText('Search tables...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    expect(mockHandlers.onSearch).toHaveBeenCalledWith('test search');
  });

  it('handles game type filter changes', () => {
    render(<TableFilters {...mockHandlers} />);
    
    const select = screen.getByText('All Types').parentElement as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'No Limit' } });

    expect(mockHandlers.onGameTypeFilter).toHaveBeenCalledWith('No Limit');
  });

  it('handles status filter changes', () => {
    render(<TableFilters {...mockHandlers} />);
    
    const select = screen.getByText('All Tables').parentElement as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'active' } });

    expect(mockHandlers.onStatusFilter).toHaveBeenCalledWith('active');
  });

  it('handles player filter changes', () => {
    render(<TableFilters {...mockHandlers} />);
    
    const select = screen.getByText('Any Players').parentElement as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'full' } });

    expect(mockHandlers.onPlayersFilter).toHaveBeenCalledWith('full');
  });

  it('renders all game type options', () => {
    render(<TableFilters {...mockHandlers} />);
    
    expect(screen.getByText('All Types')).toBeInTheDocument();
    expect(screen.getByText('No Limit')).toBeInTheDocument();
    expect(screen.getByText('Pot Limit')).toBeInTheDocument();
    expect(screen.getByText('Fixed Limit')).toBeInTheDocument();
  });

  it('renders all status options', () => {
    render(<TableFilters {...mockHandlers} />);
    
    expect(screen.getByText('All Tables')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.getByText('Full')).toBeInTheDocument();
  });

  it('renders all player count options', () => {
    render(<TableFilters {...mockHandlers} />);
    
    expect(screen.getByText('Any Players')).toBeInTheDocument();
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(screen.getByText('Has Players')).toBeInTheDocument();
    expect(screen.getByText('Full')).toBeInTheDocument();
  });
}); 