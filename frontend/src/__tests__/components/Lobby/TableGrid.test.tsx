import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TableGrid } from '../../../components/Lobby/TableGrid';
import { socket } from '../../../services/socket';
import { generateInitialTables } from '../../../utils/tableUtils';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '../../../styles/theme';

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
    maxPlayers: 6,
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

interface MockSocketService {
  onTablesUpdate: jest.Mock;
  onError: jest.Mock;
  requestLobbyTables: jest.Mock;
  offTablesUpdate: jest.Mock;
  _tablesCallback: ((tables: any[]) => void) | null;
  _errorCallback: ((error: Error) => void) | null;
  _storedErrorCallback: ((error: Error) => void) | null;
  triggerError: (error: Error) => void;
}

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

// Mock socketService
jest.mock('../../../services/socketService', () => {
  const mockService: MockSocketService = {
    onTablesUpdate: jest.fn((callback) => {
      mockService._tablesCallback = callback;
      // Immediately call the callback with mock tables
      setTimeout(() => callback(mockTables), 0);
    }),
    onError: jest.fn((callback) => {
      mockService._errorCallback = callback;
      // Store the callback for later use
      mockService._storedErrorCallback = callback;
    }),
    requestLobbyTables: jest.fn(),
    offTablesUpdate: jest.fn(),
    // Store callbacks for testing
    _tablesCallback: null,
    _errorCallback: null,
    _storedErrorCallback: null,
    // Helper method to trigger error
    triggerError: (error: Error) => {
      if (mockService._storedErrorCallback) {
        mockService._storedErrorCallback(error);
      }
    },
  };
  return { socketService: mockService };
});

const { socketService } = require('../../../services/socketService');

// Helper matcher for split text
function textIncludesWordsInOrder(element: Element | null, words: string[]): boolean {
  if (!element?.textContent) return false;
  const text = element.textContent.replace(/\s+/g, ' ').trim();
  return words.every(word => text.includes(word));
}

// Helper matcher for text content
function textContentIncludes(text: string) {
  return (_content: string, element: Element | null): boolean => {
    return element?.textContent?.includes(text) || false;
  };
}

// Helper to find element by text content
async function findElementByText(text: string, container: HTMLElement | Document = document) {
  const elements = Array.from(container.querySelectorAll('*'));
  return elements.find(element => element.textContent?.includes(text));
}

describe('TableGrid', () => {
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
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableGrid filters={defaultFilters} />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Loading tables...')).toBeInTheDocument();
  });

  it('renders tables grouped by stakes', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableGrid filters={defaultFilters} />
        </ThemeProvider>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.queryByText('Loading tables...')).not.toBeInTheDocument();
    });

    const stakesHeaders = screen.getAllByRole('heading', { level: 2 });
    const stakesHeaderTexts = stakesHeaders.map(h => h.textContent?.trim());
    
    expect(stakesHeaderTexts).toContain('$0.01/$0.02 Stakes');
    expect(stakesHeaderTexts).toContain('$0.02/$0.05 Stakes');
  });

  it('filters tables by search term', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableGrid
            filters={{
              ...defaultFilters,
              search: 'Table 1',
            }}
          />
        </ThemeProvider>
      </MemoryRouter>
    );
    await waitFor(() => {
      const tableElements = screen.getAllByRole('heading', { level: 3 });
      const table1Present = tableElements.some(el => el.textContent?.includes('Table 1'));
      const table2Present = tableElements.some(el => el.textContent?.includes('Table 2'));
      expect(table1Present).toBe(true);
      expect(table2Present).toBe(false);
    });
  });

  it('filters tables by status', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableGrid
            filters={{
              ...defaultFilters,
              status: 'waiting',
            }}
          />
        </ThemeProvider>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.queryByText('Loading tables...')).not.toBeInTheDocument();
    });

    const table2Name = await screen.findByRole('heading', { level: 3, name: /Table 2/i });
    expect(table2Name).toBeInTheDocument();
    
    const table1Name = screen.queryByRole('heading', { level: 3, name: /Table 1/i });
    expect(table1Name).not.toBeInTheDocument();
  });

  it('filters tables by game type', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableGrid
            filters={{
              ...defaultFilters,
              gameType: 'Pot Limit',
            }}
          />
        </ThemeProvider>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.queryByText('Loading tables...')).not.toBeInTheDocument();
    });

    const table2Name = await screen.findByRole('heading', { level: 3, name: /Table 2/i });
    expect(table2Name).toBeInTheDocument();
    
    const table1Name = screen.queryByRole('heading', { level: 3, name: /Table 1/i });
    expect(table1Name).not.toBeInTheDocument();

    const gameTypeElements = await screen.findAllByText((content, element) => {
      return element?.textContent?.includes('Pot Limit') || false;
    });
    // Find the most specific element (should be the span with just the game type)
    const gameTypeText = gameTypeElements.find(el => el.textContent?.trim() === 'Game Type: Pot Limit');
    expect(gameTypeText).toBeInTheDocument();
  });

  it('shows empty state when no tables match filters', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableGrid
            filters={{
              ...defaultFilters,
              search: 'nonexistent',
            }}
          />
        </ThemeProvider>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/No tables match your filters/)).toBeInTheDocument();
    });
  });

  it('handles table join click', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableGrid filters={defaultFilters} />
        </ThemeProvider>
      </MemoryRouter>
    );
    
    // Wait for tables to load
    await waitFor(() => {
      expect(screen.queryByText('Loading tables...')).not.toBeInTheDocument();
    });

    // Find and click join button for Table 1
    const tableHeading = await screen.findByRole('heading', { level: 3, name: /Table 1/i });
    const table1Card = tableHeading.closest('[data-table-id="1"]');
    expect(table1Card).toBeInTheDocument();
    
    await act(async () => {
      fireEvent.click(table1Card!);
    });

    // Check dialog appears with correct title
    const dialogTitle = await screen.findByRole('heading', { name: /Join Table: Table 1/i });
    expect(dialogTitle).toBeInTheDocument();
  });

  it('handles socket errors', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableGrid filters={defaultFilters} />
        </ThemeProvider>
      </MemoryRouter>
    );
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.queryByText('Loading tables...')).not.toBeInTheDocument();
    });
    
    // Trigger error using the mock service helper
    await act(async () => {
      const mockError = new Error('Socket error');
      (socketService as any).triggerError(mockError);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Socket error')).toBeInTheDocument();
    });
  });

  it('handles table updates', async () => {
    const updatedTables = [...mockTables];
    updatedTables[0].players = 4;
    
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableGrid filters={defaultFilters} />
        </ThemeProvider>
      </MemoryRouter>
    );
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.queryByText('Loading tables...')).not.toBeInTheDocument();
    });
    
    // Trigger update using the stored callback
    await act(async () => {
      if ((socketService as any)._tablesCallback) {
        (socketService as any)._tablesCallback(updatedTables);
      }
    });
    
    await waitFor(() => {
      const playerCount = screen.getAllByText(/\d+\/\d+/)[0];
      expect(playerCount).toHaveTextContent('4/6');
    });
  });

  it('shows filtered tables with correct text', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableGrid
            filters={{
              ...defaultFilters,
              gameType: 'No Limit',
            }}
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading tables...')).not.toBeInTheDocument();
    });

    const tableName = await screen.findByRole('heading', { level: 3, name: /Table 1/i });
    expect(tableName).toBeInTheDocument();

    const gameTypeElements = await screen.findAllByText((content, element) => {
      return element?.textContent?.includes('No Limit') || false;
    });
    // Find the most specific element (should be the span with just the game type)
    const gameTypeText = gameTypeElements.find(el => el.textContent?.trim() === 'Game Type: No Limit');
    expect(gameTypeText).toBeInTheDocument();
  });

  it('shows empty state with correct message', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <TableGrid
            filters={{
              ...defaultFilters,
              search: 'nonexistent table',
            }}
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading tables...')).not.toBeInTheDocument();
    });

    const emptyMessage = await screen.findByText('No tables match your filters. Try adjusting your search criteria.');
    expect(emptyMessage).toBeInTheDocument();
  });
}); 