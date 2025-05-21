# Texas Hold'em Poker Game

A multiplayer Texas Hold'em poker game built with React, TypeScript, and WebSocket.

## Project Structure

```
.
├── backend/           # Backend server code
│   ├── src/          # Source files
│   └── __tests__/    # Backend tests
├── frontend/         # Frontend React application
│   ├── src/         # Source files
│   └── cypress/     # E2E tests
└── docs/            # Documentation
```

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Setup

1. Install dependencies:
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

2. Start the development servers:
   ```bash
   # Start both frontend and backend
   npm start

   # Or start them separately:
   # Terminal 1 (Backend)
   cd backend
   npm start

   # Terminal 2 (Frontend)
   cd frontend
   npm start
   ```

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### E2E Tests
```bash
cd frontend
npm run cypress:open  # Opens Cypress Test Runner
# or
npm run cypress:run   # Runs tests in headless mode
```

## Development

- Frontend runs on http://localhost:3000
- Backend runs on http://localhost:3001
- WebSocket server runs on ws://localhost:3001

## Features

- Real-time multiplayer gameplay
- Texas Hold'em poker rules
- Player management
- Game state persistence
- Error handling and recovery
- Comprehensive test coverage

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT 