# Texas Hold'em Poker Game

A modern Texas Hold'em poker game built with React, TypeScript, and Socket.IO.

## Project Structure

```
.
├── backend/                 # Backend server
│   ├── src/
│   │   ├── types/          # TypeScript type definitions
│   │   ├── socketHandlers/ # Socket.IO event handlers
│   │   └── server.ts       # Express server setup
│   └── package.json
├── frontend/               # Frontend application
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

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Start the development servers:
   ```bash
   # Start both servers (from root directory)
   npm start

   # Or start servers individually
   # Start backend server (from backend directory)
   npm run dev

   # Start frontend server (from frontend directory)
   npm run dev
   ```

## Testing

The project uses Cypress for end-to-end testing. To run the tests:

```bash
# From the frontend directory
npm run test:e2e        # Run tests in headless mode
npm run test:e2e:open   # Open Cypress test runner
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

## Development

- Backend runs on port 3001
- Frontend runs on port 3000
- TypeScript is used for type safety
- Socket.IO handles real-time communication
- Styled-components for styling
- Cypress for E2E testing

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

## License

This project is licensed under the MIT License. 