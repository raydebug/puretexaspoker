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
- Enhanced WebSocket connection reliability
  * Hybrid transport (polling + WebSocket)
  * Smart reconnection handling
  * Connection timeout management
  * Session restoration on reconnect

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

## E2E Test Coverage

The application includes comprehensive end-to-end tests covering:

### Game Flow
- Player joining and seat management
- Betting actions and validation
- Game phase transitions
- Player status changes
- Session persistence

### Game Actions
- Invalid betting handling
- Disconnection/reconnection scenarios
- Game state synchronization
- Player timeout handling
- Game completion and results
- Chat functionality
- Player statistics

### Player Interactions
- Seat management
- Status updates
- Betting controls
- Player list updates
- Observer/player role changes

### Game Phases
- Pre-flop
- Flop
- Turn
- River
- Showdown

## Running Tests

```bash
# Install dependencies
npm install

# Run e2e tests
npm run cypress:run

# Run e2e tests with UI
npm run cypress:open
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Recent Updates

### Socket.IO Connection Fix (May 18, 2024)
- Fixed issues with Socket.IO connection refused errors
- Resolved port conflicts for backend server
- Ensured proper TypeScript type checking in the table joining flow
- Added error handling for server connection problems

### Socket.IO Connection Stability Improvements (May 19, 2024)
- Fixed persistent connection/disconnection cycle issues
- Improved WebSocket configuration with hybrid transport (websocket → polling)
- Added connection state tracking to prevent duplicates
- Implemented proper event listener cleanup to prevent memory leaks
- Added better error reporting for connection failures
- Added connection timeout management
- Standardized socket.io path across frontend and backend
- Optimized ping/pong interval settings

### Socket.IO Table Joining Fix (May 20, 2024)
- Fixed issue with joining tables when socket is disconnected
- Added delayed transport upgrade to prevent disconnection during protocol changes
- Improved error messaging for connection state problems
- Added connection restoration when joining tables
- Implemented safer transport upgrade mechanism
- Added connection verification before critical operations
- Added resilience to handle brief disconnections

## Recent Changes

### Codebase Cleanup (2024-07-12)

- **Removed Duplicate Cypress Configuration**:
  - Eliminated the top-level cypress directory which was causing configuration conflicts
  - Consolidated all E2E tests in the frontend/cypress directory

- **Command Standardization**:
  - Renamed the `check` command to `checkAction` to avoid collision with Cypress's built-in command
  - Consolidated duplicate Cypress commands from multiple files into a single commands.js file
  - Updated type definitions in commands.d.ts to include all available custom commands

- **Session Handling Improvement**:
  - Updated the session management to use modern Cypress.on('test:before:run') session approach
  - Simplified support file structure for better maintainability

### Socket.IO Memory Leak Fixes
- Fixed memory leaks in socket.io event listeners by properly cleaning up listeners on disconnect
- Added proper interval cleanup for heartbeat mechanism
- Increased max listeners limit to prevent warnings
- Improved socket connection stability

## Features 