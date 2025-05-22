# Texas Hold'em Poker Game

A modern Texas Hold'em poker game built with React, TypeScript, and Socket.IO.

## Project Structure

```
.
├── backend/                 # Backend server (port 3001)
│   ├── src/
│   │   ├── types/          # TypeScript type definitions
│   │   ├── socketHandlers/ # Socket.IO event handlers
│   │   └── server.ts       # Express server setup
│   └── package.json
├── frontend/               # Frontend application (port 3000)
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── types/         # TypeScript type definitions
│   │   └── App.tsx        # Main application component
│   ├── cypress/           # E2E tests
│   │   ├── e2e/          # Test specifications
│   │   └── support/      # Test support files
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Git
- TypeScript installed globally (`npm install -g typescript`)

## Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Install dependencies:
   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Start the development servers:
   ```bash
   # Kill any existing processes on ports 3000 and 3001
   npm run kill-ports

   # Start both servers (from root directory)
   npm start

   # Or start servers individually:
   # Backend (from backend directory)
   cd backend && npm start

   # Frontend (from frontend directory)
   cd frontend && npm start
   ```

## Development Commands

```bash
# Run backend unit tests
cd backend && npm test

# Run frontend unit tests
cd frontend && npm test

# Run Cypress E2E tests
npm run cypress:run

# Build frontend for production
cd frontend && npm run build

# Build backend for production
cd backend && npm run build
```

## Testing

The project uses Jest for unit tests and Cypress for end-to-end testing.

### Unit Tests
Run unit tests for each part of the application:
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### End-to-End Tests
Cypress is used for E2E testing. To run the tests:

```bash
# From the root directory
npm run cypress:run        # Run tests in headless mode
npm run cypress:open       # Open Cypress test runner
```

### Test Structure

- `basic.cy.ts`: Basic game functionality tests
- `game-flow.cy.ts`: Complete game flow tests including dealer button movement and blind posting
- `table-management.cy.ts`: Table and seat management tests
- `player-management.cy.ts`: Player actions and state tests
- `error-handling.cy.ts`: Error and edge case tests

### Test Features

- Multiple window support for testing multiplayer scenarios
- Automatic test retries for improved reliability
- Backend server management in tests
- Comprehensive game flow testing
- Detailed test failure messages for fast debugging
- Type-safe test commands and assertions

## Known Issues and Solutions

### Backend Issues
1. TypeScript compilation errors:
   - Missing properties in GameState type
   - Type mismatches for Card[] vs string[]
   - Missing method implementations in GameService

### Frontend Issues
1. Missing type definitions:
   ```
   TS7016: Could not find a declaration file for module 'js-cookie'
   ```
   Solution: Install @types/js-cookie

### Server Issues
1. Port conflicts:
   - Port 3000 already in use
   - Port 3001 already in use
   Solution: Use kill-ports script before starting servers

## Features

- Real-time multiplayer gameplay
- Modern UI with responsive design
- Type-safe code with TypeScript
- Comprehensive test coverage
- Shared types between frontend and backend
- Automatic test retries for reliability
- Backend server management in tests
- Multiple window support for testing
- Detailed test failure messages
- Strict type checking for game state and player data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

See [workflow.md](workflow.md) for detailed development workflow guidelines.

## Documentation

- [workflow.md](workflow.md): Development workflow and best practices
- [apis.md](apis.md): API documentation and specifications

## License

This project is licensed under the MIT License. 