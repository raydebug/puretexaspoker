# Development Workflow

## Project Structure
- Frontend: React application running on port 3000
- Backend: Node.js/TypeScript server running on port 3001
- Cypress: End-to-end testing framework

## Development Environment Setup

### Prerequisites
- Node.js and npm installed
- TypeScript installed globally
- Git for version control

### Installation
```bash
# Install dependencies for both frontend and backend
npm install
cd frontend && npm install
cd backend && npm install
```

## Running the Application

### Starting Servers
```bash
# Kill any existing processes on ports 3000 and 3001
npm run kill-ports

# Start both frontend and backend servers
npm start
```

### Development Commands
```bash
# Frontend development
cd frontend && npm start

# Backend development
cd backend && npm start

# Run Cypress tests
npm run cypress:run
```

## Testing Workflow

### 1. Unit Tests
- Run backend unit tests: `cd backend && npm test`
- Run frontend unit tests: `cd frontend && npm test`

### 2. End-to-End Tests
- Ensure both servers are running
- Run Cypress tests: `npm run cypress:run`
- Fix any failing tests immediately

### 3. Test Coverage
- Maintain high test coverage for critical components
- Focus on game logic and user interactions
- Document test scenarios in feature files

## Current Issues and Solutions

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

## Best Practices

### Code Quality
- Follow TypeScript best practices
- Maintain consistent code style
- Document complex logic
- Write meaningful commit messages

### Testing
- Write tests before implementing features
- Keep tests focused and maintainable
- Use meaningful test descriptions
- Handle edge cases in tests

### Version Control
- Create feature branches for new development
- Keep commits atomic and focused
- Write clear commit messages
- Review code before merging

## Documentation
- Keep README.md updated
- Document API changes
- Update test documentation
- Maintain changelog

## Deployment
- Build frontend: `cd frontend && npm run build`
- Build backend: `cd backend && npm run build`
- Deploy to production environment
- Run smoke tests after deployment 