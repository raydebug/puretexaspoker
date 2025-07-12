# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pure Texas Poker is a real-time multiplayer Texas Hold'em poker game built with React, TypeScript, Node.js, and Socket.io. The project uses a table-centric architecture where tables are the core entity for poker state, seating, and actions.

## Development Commands

### Root Project Commands
```bash
# Start both servers in development mode
npm run dev

# Start both servers in production mode
npm start

# Build both frontend and backend
npm run build

# Run all tests (backend + frontend)
npm test

# Run Selenium E2E tests
npm run test:selenium
npm run test:selenium:headed     # Run with visible browser
npm run test:selenium:headless   # Run in headless mode
npm run test:selenium:chrome     # Run with Chrome
npm run test:selenium:firefox    # Run with Firefox
npm run test:selenium:coverage   # Run with coverage analysis

# Run specific 5-player test
npm run test:5player
npm run test:5player:headed
```

### Backend Commands (from /backend directory)
```bash
# Development server with hot reload
npm run dev

# Production server
npm start

# Build TypeScript
npm run build

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Database operations
npm run seed
```

### Frontend Commands (from /frontend directory)
```bash
# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Architecture Overview

### Core Architecture Principles
- **Table-Only Architecture**: All logic uses `table` and `tableId` as the core entity, not `game` or `gameId`
- **Real-time Communication**: Socket.io for WebSocket events between frontend and backend
- **Unified State Management**: TableManager handles all table state, seating, and game logic
- **Location-based User Tracking**: Users have location attributes (table/seat) instead of string-based locations

### Backend Architecture

#### Key Services
- **TableManager** (`/backend/src/services/TableManager.ts`): Central service managing all table state, players, and game logic
- **LocationManager** (`/backend/src/services/LocationManager.ts`): Tracks user locations (table/seat attributes)
- **SocketHandlers** (`/backend/src/socketHandlers/consolidatedHandler.ts`): Unified WebSocket event handling
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (prod)

#### Database Schema
- **Table**: Core table entity with betting limits and player capacity
- **Player**: User records with UUID primary keys
- **PlayerTable**: Association table linking players to tables with seat numbers and buy-ins

#### API Structure
- **Production APIs**: `/api/tables`, `/api/players`, `/api/auth`, `/api/chat`
- **Test APIs**: `/api/test/*` - Dedicated testing endpoints with `test_` prefix for mock game management

### Frontend Architecture

#### Key Components
- **SocketService** (`/frontend/src/services/socketService.ts`): WebSocket communication layer
- **GamePage** (`/frontend/src/pages/GamePage.tsx`): Main game interface
- **LobbyPage** (`/frontend/src/pages/LobbyPage.tsx`): Table browsing and selection
- **PlayerActions** (`/frontend/src/components/PlayerActions.tsx`): Game action buttons

#### State Management
- **Local State**: React hooks for component-level state
- **Socket State**: SocketService maintains WebSocket connection and game state
- **Cookie Storage**: User session persistence via cookieService

### WebSocket Events

#### Critical Event Names (must match exactly)
- **Backend emits**: `authenticated`, `tableJoined`, `seatTaken`, `gameState`, `location:updated`
- **Frontend emits**: `authenticate`, `joinTable`, `takeSeat`, `game:bet`, `game:call`, `game:fold`

#### Room Architecture
- **Table Rooms**: `table:${tableId}` - For table-specific events
- **Game Rooms**: `game:${gameId}` - For game-specific events (backward compatibility)

### Player and Seat Management

#### Key Rules
- Player records use UUID primary keys
- PlayerTable associations reference `playerId` and `tableId` as UUID strings
- Backend prevents duplicate seat assignments
- Frontend handles "already seated" as success case
- Location tracking: `table=null, seat=null` (lobby), `table=X, seat=null` (observer), `table=X, seat=Y` (player)

## Testing Infrastructure

### E2E Testing with Selenium
- **Features**: Cucumber BDD tests in `/selenium/features/`
- **Step Definitions**: `/selenium/step_definitions/`
- **Test APIs**: Dedicated backend endpoints for test data management
- **Multi-browser**: Chrome, Firefox, Edge support
- **Coverage Analysis**: Comprehensive test coverage reporting

### Test Data Management
```bash
# Test API endpoints (backend)
POST /api/test/test_create_mock_game    # Create test game
GET /api/test/test_get_mock_game/:id    # Get test game
PUT /api/test/test_update_mock_game/:id # Update test game
DELETE /api/test/test_cleanup_games     # Clean up test data
POST /api/test/test_player_action/:id   # Simulate player actions
POST /api/test/test_advance_phase/:id   # Advance game phases
```

## Port Configuration

### Development Ports
- **Frontend**: http://localhost:3000 (Vite dev server)
- **Backend**: http://localhost:3001 (Express server)

### Port Management
Always ensure only one backend server runs on port 3001 to avoid EADDRINUSE errors. The system automatically handles port conflicts by restarting servers.

## Key Cursor Rules

### Table-Only Architecture
- All backend and frontend logic must use `table` and `tableId` as core entities
- Eliminate references to `game`, `gameId`, `game state` in favor of table-based equivalents
- WebSocket events use `tableId` (UUID string) as identifier
- Tests use only `table`/`tableId` references

### WebSocket Event Consistency
- Backend emits specific events: `authenticated`, `tableJoined`, `seatTaken`
- Frontend listens for exact event names
- All payloads use string UUIDs for `tableId` and `playerId`
- Handle `alreadySeated` as success case

### Player Management
- UUID primary keys for all player records
- Prevent duplicate seat assignments at database level
- Frontend avoids multiple seat-taking attempts
- Clear observer/player state separation

## Development Workflow

### Starting Development
1. Install dependencies: `npm install` (root), then `cd backend && npm install`, then `cd ../frontend && npm install`
2. Start servers: `npm run dev` (starts both frontend and backend)
3. Access frontend at http://localhost:3000
4. Backend API at http://localhost:3001

### Running Tests
1. Unit tests: `npm test` (runs both backend and frontend tests)
2. E2E tests: `npm run test:selenium:headed` (recommended for development)
3. Coverage: `npm run test:selenium:coverage`

### Common Issues
- **Port conflicts**: Restart servers if EADDRINUSE errors occur
- **Socket connection**: Ensure backend is running before frontend
- **Test failures**: Use `npm run test:selenium:headed` to visually debug
- **Database issues**: Run `npm run seed` in backend directory

## Production Deployment

### Build Process
```bash
npm run build  # Builds both frontend and backend
```

### Environment Variables
- Database configuration (PostgreSQL for production)
- Socket.io CORS settings
- SSL certificate configuration

### Database Migration
- Use Prisma migrations for schema changes
- Seed initial tables with default data
- Handle user location transitions properly

## Key Files to Understand

### Critical Backend Files
- `/backend/src/server.ts` - Main server entry point
- `/backend/src/services/TableManager.ts` - Core table management
- `/backend/src/socketHandlers/consolidatedHandler.ts` - WebSocket handlers
- `/backend/prisma/schema.prisma` - Database schema

### Critical Frontend Files
- `/frontend/src/App.tsx` - Main application router
- `/frontend/src/services/socketService.ts` - WebSocket service
- `/frontend/src/pages/GamePage.tsx` - Game interface
- `/frontend/src/pages/LobbyPage.tsx` - Table lobby

### Configuration Files
- `/package.json` - Root project scripts
- `/backend/package.json` - Backend dependencies and scripts
- `/frontend/package.json` - Frontend dependencies and scripts
- `/frontend/vite.config.ts` - Vite configuration
- `/backend/tsconfig.json` - TypeScript configuration

When working on this project, always consider the table-centric architecture and ensure WebSocket events follow the established naming conventions. The comprehensive test suite should be used to verify changes, and all new features should include appropriate E2E test coverage.