# Development Workflow Guide

## Table of Contents
1. [Development Environment Setup](#development-environment-setup)
2. [Git Workflow](#git-workflow)
3. [Development Process](#development-process)
4. [Testing Guidelines](#testing-guidelines)
5. [Code Review Process](#code-review-process)
6. [Deployment Process](#deployment-process)

## Development Environment Setup

### Required Tools
- Node.js 18 or higher
- npm 9 or higher
- Git
- TypeScript (global installation)
- VS Code (recommended IDE)

### Recommended VS Code Extensions
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Jest Runner
- Cypress Helper

### Initial Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install        # Root dependencies
   cd backend && npm install
   cd frontend && npm install
   ```
3. Set up environment variables following .env.example
4. Start development servers:
   ```bash
   npm start         # Starts both frontend and backend
   ```

## Git Workflow

### Branch Naming Convention
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Hotfixes: `hotfix/description`
- Release branches: `release/version`

### Commit Message Format
```
<type>(<scope>): <subject>

<body>
```
Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Code style changes
- refactor: Code refactoring
- test: Test cases
- chore: Build tasks, etc.

### Pull Request Process
1. Create feature branch from develop
2. Implement changes
3. Run all tests
4. Push changes
5. Create PR with description
6. Wait for review and CI checks
7. Merge after approval

## Development Process

### Starting New Features
1. Check tasks.md for requirements
2. Create feature branch
3. Implement backend changes first
4. Add corresponding frontend features
5. Write tests
6. Update documentation

### Code Organization
- Backend:
  - Place new endpoints in appropriate controllers
  - Add types to types/
  - Update socket handlers in socketHandlers/
  
- Frontend:
  - Add components to components/
  - Update types in types/
  - Add tests in __tests__/

### Best Practices
1. Follow TypeScript strict mode guidelines
2. Write unit tests for new features
3. Add E2E tests for critical paths
4. Keep components small and focused
5. Use shared types between frontend/backend
6. Document complex logic
7. Follow existing code style

## Testing Guidelines

### Unit Testing
- Backend:
  ```bash
  cd backend && npm test
  ```
- Frontend:
  ```bash
  cd frontend && npm test
  ```

### E2E Testing
- Write tests in frontend/cypress/e2e/
- Follow existing patterns in test files
- Test critical user paths
- Run tests:
  ```bash
  npm run cypress:run
  ```

### Test Coverage Requirements
- Unit tests: 80% coverage minimum
- E2E tests for all critical paths
- Test error scenarios
- Test edge cases

## Testing and Fixing Issues

### Debugging Process
1. **Reproduce the Issue**
   - Create a minimal test case
   - Document steps to reproduce
   - Note environment details

2. **Analyze Logs**
   - Check browser console logs
   - Review backend server logs
   - Examine network requests

3. **Testing Tools**
   - Browser DevTools for frontend
   - VS Code debugger
   - React Developer Tools
   - Redux DevTools (if applicable)

### Common Testing Scenarios

#### Frontend Testing
```typescript
// Player Join Game Test
cy.joinGame('TestPlayer');
cy.get('[data-testid="player-TestPlayer"]').should('exist');

// Player Betting Test
cy.placeBet(100);
cy.verifyPlayerState('TestPlayer', 900);

// Game Phase Test
cy.waitForGameStart();
cy.verifyGamePhase('preflop');
```

#### Backend Testing
```typescript
// Example Socket Event Test
describe('Game Events', () => {
  it('should handle player join', () => {
    // Test implementation
  });
});
```

### Issue Resolution Workflow
1. **Create Issue Branch**
   ```bash
   git checkout -b fix/issue-description
   ```

2. **Local Testing**
   ```bash
   # Run specific test file
   npm test -- path/to/test/file.test.ts
   
   # Run specific Cypress test
   npm run cypress:run -- --spec "cypress/e2e/specific-test.cy.ts"
   ```

3. **Fix Verification**
   - Run full test suite
   - Test in different browsers
   - Check mobile responsiveness
   - Verify with different game scenarios

### Common Issues and Solutions

1. **Socket Connection Issues**
   - Check WebSocket connection status
   - Verify correct port configuration
   - Ensure proper error handling

2. **Game State Synchronization**
   - Log state changes
   - Verify event sequence
   - Check for race conditions

3. **Performance Issues**
   - Use React DevTools Profiler
   - Check for memory leaks
   - Monitor network payload size

### Test Data Management
1. **Test Fixtures**
   - Create reusable test data
   - Maintain separate test databases
   - Use meaningful test scenarios

2. **Mocking Strategy**
   - Mock external services
   - Simulate network conditions
   - Create realistic game scenarios

### Continuous Testing
1. **Local Development**
   ```bash
   # Watch mode for frontend tests
   cd frontend && npm run test:watch
   
   # Watch mode for backend tests
   cd backend && npm run test:watch
   ```

2. **CI/CD Pipeline**
   - Pre-commit hooks
   - Automated test runs
   - Performance benchmarks

## Code Review Process

### Before Submitting PR
1. Run all tests locally
2. Update documentation
3. Self-review your changes
4. Check for type safety
5. Ensure no console errors

### Review Checklist
- Code follows style guide
- Tests are comprehensive
- Documentation is updated
- No unnecessary dependencies
- Performance considerations
- Security implications

## Deployment Process

### Staging Deployment
1. Merge to develop branch
2. Automatic deployment to staging
3. Run smoke tests
4. Verify functionality

### Production Deployment
1. Create release branch
2. Run full test suite
3. Create PR to main
4. Deploy after approval
5. Monitor for issues

### Post-Deployment
1. Monitor error rates
2. Check performance metrics
3. Verify critical functionality
4. Document any issues

## Additional Resources
- See apis.md for API documentation
- Check README.md for basic setup
- Review tasks.md for current tasks
- Join team chat for questions 