# Texas Hold'em Poker Game

A real-time multiplayer Texas Hold'em poker game implementation.

## Features

- Game lobby with 80 tables and real-time status updates
  * Casino-themed design with red carpet pattern
  * Oval-shaped poker tables with green felt texture
  * Gold accents and professional styling
  * Stakes-based table grouping
  * Advanced filtering and search capabilities
  * Quick join functionality with nickname persistence
  * Real-time table status updates
  * Detailed table information display
- Table preview and quick join functionality
- Real-time multiplayer gameplay
- Interactive poker table with animated cards
- Seat management system with player status tracking
- Player state persistence (login and seat status saved in cookies)
- Real-time game state updates
- Online users list (players and observers) with persistent visibility during seat transitions
- Betting system with chips
- Hand evaluation
- Dealer position tracking
- Player status management (away/present)
- Seat menu system with multiple actions
- Automatic handling of away players during gameplay
- Player avatars with:
  * Multiple types (image, initials, default)
  * Color-coded visual indicators
  * Status indicators (active player, away status)
  * Different sizes for various UI contexts
  * Consistent styling throughout the application
- Chip animations:
  * Visual representation of betting actions
  * Color-coded chips based on value
  * Smooth animations from player to pot
  * Multiple chips for larger bets
  * Realistic chip styling with inner/outer borders
- In-game chat system with:
  * Real-time messaging between players
  * Private messaging support (using @username format)
  * Emoji and text formatting
  * Game event notifications (player actions, game state changes)
  * Chat history tracking
  * Message timestamps
  * System messages for game events
  * Visual differentiation between message types
- Robust WebSocket connection:
  * Configurable connection timeouts
  * Automatic reconnection with exponential backoff
  * Polling transport for improved stability
  * Enhanced error handling and reporting
  * Connection status indicators

## Technical Implementation

- Frontend: React with TypeScript
- Backend: Node.js with Socket.IO
- State Management: Real-time socket events with cookie-based persistence
- Styling: Styled Components
- Testing: Jest, React Testing Library, and Cypress

## Project Structure

```typescript
frontend/
  ├── src/
  │   ├── components/
  │   │   ├── Lobby/           # Lobby related components
  │   │   │   ├── TableGrid.tsx
  │   │   │   ├── TableCard.tsx
  │   │   │   ├── JoinDialog.tsx
  │   │   │   └── TableFilters.tsx
  │   │   ├── Game/            # Game related components
  │   │   │   ├── ChatBox.tsx    # In-game chat component
  │   │   └── shared/          # Shared components
  │   ├── pages/
  │   │   ├── LobbyPage.tsx
  │   │   └── GamePage.tsx
  │   ├── utils/
  │   │   ├── formatUtils.ts   # Formatting utilities
  │   └── services/
  │       ├── socketService.ts # WebSocket communication
  │       └── cookieService.ts # State persistence
backend/
  ├── src/
  │   ├── services/
  │   │   ├── TableManager.ts  # Manages multiple tables
  │   │   ├── chatService.ts   # Handles chat functionality
  │   │   ├── gameService.ts   # Core game logic
  │   └── events/
  │       └── lobbyHandlers.ts
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```
3. Configure environment variables:
   ```bash
   # In backend/.env
   PORT=3001
   DATABASE_URL=your_database_url
   ```
4. Start the backend server:
   ```bash
   cd backend && npm start
   ```
5. Start the frontend development server:
   ```bash
   cd frontend && npm start
   ```

Note: Make sure your backend server is running and properly configured with a database before starting the frontend.

## Game Lobby Features

The game lobby provides a comprehensive interface for players to:

- Browse available poker tables by stake level
- Filter tables by game type, occupancy, and status
- Search for specific tables by name
- See real-time updates of player counts and game status
- Join tables with a personalized nickname
- Access tables with different stake levels
- View key information before joining (game type, buy-in range, current players)

Players can choose from 80 tables arranged by stakes from micro to high stakes. Each table displays:

- Table name and status
- Player count and maximum capacity
- Stakes level
- Game type (No Limit, Pot Limit, or Fixed Limit)
- Minimum and maximum buy-in amounts

## Chat System

The game includes a comprehensive chat system that allows players to:
- Send messages to all players at the table
- Send private messages to specific players using @username format
- View system messages for game events (bets, folds, etc.)
- See visual differentiation between regular, private, and system messages
- Access chat history when joining a table
- View timestamps for all messages

Chat features include:
- Real-time message delivery
- Message persistence during gameplay
- Private messaging with dedicated UI indicators
- Automatic system notifications for important game events
- Visual styling to distinguish between different message types
- Automatic scrolling to latest messages

## Testing

The project includes comprehensive test coverage for all features:

### Unit and Integration Tests
```bash
# Run all unit and integration tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run tests in watch mode during development
npm test -- --watch
```

### End-to-End Tests
```bash
# Open Cypress test runner
npm run cypress:open

# Run Cypress tests headlessly
npm run cypress:run

# Run E2E tests with development server
npm run test:e2e
```

Test suites include:

1. Unit Tests
   - Component tests (using React Testing Library)
   - Socket service tests (with mocked WebSocket connections)
   - State management tests

2. Integration Tests
   - Game flow testing (player actions, state changes)
   - Online users list functionality
   - Player status management
   - Seat menu interactions

3. End-to-End Tests
   - Complete game flow testing
   - Player interactions and state changes
   - Session persistence
   - Multi-player scenarios
   - Game phase transitions
   - Real-time updates
   - Error handling

## State Persistence

The game implements cookie-based persistence for:
- Player nickname
- Seat assignments
- Game session data
- Player status (away/present)

This ensures that players can:
- Maintain their session after page reloads
- Automatically reconnect to their previous game
- Keep their seat position and status
- Resume gameplay seamlessly

## User Types and Status

The game supports two types of users:
1. Players
   - Users who have taken a seat at the table
   - Can participate in the game
   - Shown at the top of the online users list
   - Have chips and can place bets
   - Can temporarily leave the game (away status)
   - Can return to active play
   - Can stand up to become observers

2. Observers
   - Users who are watching the game
   - Cannot participate in gameplay
   - Listed below players in the online users list
   - Can become players by taking an available seat

## Seat Menu System

Players have access to a context menu with the following actions:
- Leave Midway (temporary absence)
- I Am Back (return from absence)
- Stand Up (become observer)
- Leave Table (exit game)

The game automatically handles away players by:
- Skipping their turn in betting rounds
- Displaying visual indicators of away status
- Maintaining their position and chips
- Allowing seamless return to play

## Development

### Dependencies

Frontend:
- React
- TypeScript
- Socket.IO Client
- Styled Components
- js-cookie (for state persistence)
- Jest and React Testing Library (for testing)
- Cypress (for end-to-end testing)

Backend:
- Node.js
- Express
- Socket.IO
- TypeScript

## License

MIT

## Recent Updates

### Socket.IO Connection Fix (May 18, 2024)
- Fixed issues with Socket.IO connection refused errors
- Resolved port conflicts for backend server
- Ensured proper TypeScript type checking in the table joining flow
- Added error handling for server connection problems

## Features 