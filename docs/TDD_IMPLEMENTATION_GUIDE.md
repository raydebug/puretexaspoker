# Test-Driven Development Implementation Guide
## Pure Texas Poker - TDD Best Practices & Implementation

### TDD Maturity Assessment: 7/10 → Target: 9/10

## Current State Analysis

### ✅ Strengths
- **1,145 test assertions** across 45 files
- **Comprehensive E2E testing** with Selenium/Cucumber BDD
- **Well-structured unit tests** for core services
- **Mock implementations** for external dependencies
- **Test isolation** with proper setup/teardown

### ⚠️ Gaps Identified
- Missing tests for error scenarios and edge cases
- Incomplete mutation testing coverage
- Inconsistent test patterns across modules
- Limited integration test coverage for complex workflows
- No performance testing in CI/CD pipeline

## TDD Implementation Phases

### Phase 1: Foundation Strengthening (Weeks 1-2)

#### 1.1 Test Coverage Enhancement
```bash
# Add comprehensive test coverage measurement
npm install --save-dev nyc @types/nyc
```

**Coverage Targets:**
- Unit Tests: 90%+ line coverage, 85%+ branch coverage
- Integration Tests: 80%+ path coverage
- E2E Tests: 100% critical user journey coverage

#### 1.2 Test Structure Standardization
```typescript
// Standard test file structure template
describe('ComponentName - TDD Implementation', () => {
  describe('RED Phase - Failing Tests', () => {
    it('should fail when [specific condition]', () => {
      // Arrange - Setup failing condition
      // Act - Trigger the action
      // Assert - Verify expected failure
    });
  });

  describe('GREEN Phase - Passing Tests', () => {
    it('should succeed when [conditions met]', () => {
      // Arrange - Setup success condition
      // Act - Trigger the action
      // Assert - Verify expected success
    });
  });

  describe('REFACTOR Phase - Quality Improvements', () => {
    it('should handle edge case [specific scenario]', () => {
      // Arrange - Setup edge case
      // Act - Trigger the action
      // Assert - Verify robust handling
    });
  });
});
```

### Phase 2: Advanced Testing Patterns (Weeks 3-4)

#### 2.1 Property-Based Testing
```typescript
// Install fast-check for property-based testing
npm install --save-dev fast-check

// Example: Poker hand evaluation property tests
import fc from 'fast-check';

describe('Hand Evaluator - Property Tests', () => {
  it('should always rank full house higher than flush', () => {
    fc.assert(fc.property(
      fc.array(fc.integer(1, 13), { minLength: 7, maxLength: 7 }),
      (cards) => {
        const fullHouse = createFullHouse(cards);
        const flush = createFlush(cards);
        expect(handEvaluator.compare(fullHouse, flush)).toBeGreaterThan(0);
      }
    ));
  });
});
```

#### 2.2 Mutation Testing Implementation
```bash
# Add mutation testing to catch weak tests
npm install --save-dev stryker-cli @stryker-mutator/jest-runner
```

```json
// stryker.conf.json
{
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts"
  ],
  "testRunner": "jest",
  "coverageAnalysis": "perTest",
  "thresholds": {
    "high": 90,
    "low": 80,
    "break": 75
  }
}
```

#### 2.3 Contract Testing for WebSocket APIs
```typescript
// Contract testing for socket events
describe('Socket Contract Tests', () => {
  const contractTests = [
    {
      event: 'playerAction',
      validPayload: { tableId: 1, action: 'fold', playerId: 'player1' },
      invalidPayloads: [
        { tableId: 'invalid' }, // Invalid type
        { action: 'invalidAction' }, // Invalid action
        {} // Missing required fields
      ]
    }
  ];

  contractTests.forEach(({ event, validPayload, invalidPayloads }) => {
    describe(`${event} contract`, () => {
      it('should accept valid payload', () => {
        expect(() => validateSocketPayload(event, validPayload)).not.toThrow();
      });

      invalidPayloads.forEach((payload, index) => {
        it(`should reject invalid payload ${index + 1}`, () => {
          expect(() => validateSocketPayload(event, payload)).toThrow();
        });
      });
    });
  });
});
```

### Phase 3: Integration & E2E Enhancement (Week 5)

#### 3.1 Advanced Integration Testing
```typescript
// Multi-service integration testing
describe('Game Service Integration', () => {
  let testContainer: Container;

  beforeEach(() => {
    testContainer = createTestContainer({
      tableManager: 'real',
      socketService: 'mock',
      database: 'inmemory'
    });
  });

  it('should handle complete game lifecycle', async () => {
    const gameService = testContainer.get<GameService>('gameService');
    const result = await gameService.playCompleteGame([
      { action: 'join', playerId: 'p1' },
      { action: 'join', playerId: 'p2' },
      { action: 'start' },
      { action: 'fold', playerId: 'p1' }
    ]);

    expect(result.winner).toBe('p2');
    expect(result.gameState.status).toBe('finished');
  });
});
```

#### 3.2 Performance Testing Integration
```typescript
// Performance testing in Jest
describe('Performance Tests', () => {
  it('should handle 100 concurrent socket connections', async () => {
    const startTime = Date.now();
    
    const connections = await Promise.all(
      Array.from({ length: 100 }, () => createSocketConnection())
    );
    
    const connectionTime = Date.now() - startTime;
    expect(connectionTime).toBeLessThan(5000); // 5 second threshold
    
    // Cleanup
    await Promise.all(connections.map(conn => conn.disconnect()));
  });

  it('should process game actions within latency SLA', async () => {
    const { client1, client2 } = await setupTwoPlayerGame();
    
    const actionStart = Date.now();
    await client1.emitAction('fold');
    const actionEnd = Date.now();
    
    expect(actionEnd - actionStart).toBeLessThan(200); // 200ms SLA
  });
});
```

### Phase 4: Test Automation & CI/CD (Week 6)

#### 4.1 GitHub Actions Workflow Enhancement
```yaml
# .github/workflows/tdd-pipeline.yml
name: TDD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests with coverage
        run: npm run test:coverage
        
      - name: Run mutation tests
        run: npm run test:mutation
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Run E2E tests
        run: npm run test:e2e:ci
        
      - name: Performance testing
        run: npm run test:performance
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v1
        
      - name: Quality Gate Check
        run: |
          if [ "${{ steps.test.outputs.coverage }}" -lt "90" ]; then
            echo "Coverage below 90% threshold"
            exit 1
          fi
```

#### 4.2 Test Data Management
```typescript
// Test data builders for consistent test setup
export class GameStateBuilder {
  private gameState: Partial<GameState> = {};

  static create(): GameStateBuilder {
    return new GameStateBuilder();
  }

  withPlayers(count: number): this {
    this.gameState.players = Array.from({ length: count }, (_, i) => 
      PlayerBuilder.create().withId(`player${i + 1}`).build()
    );
    return this;
  }

  withPhase(phase: GamePhase): this {
    this.gameState.phase = phase;
    return this;
  }

  withPot(amount: number): this {
    this.gameState.pot = amount;
    return this;
  }

  build(): GameState {
    return {
      id: 'test-game',
      status: 'playing',
      phase: 'preflop',
      pot: 0,
      players: [],
      ...this.gameState
    } as GameState;
  }
}

// Usage in tests
const gameState = GameStateBuilder
  .create()
  .withPlayers(2)
  .withPhase('flop')
  .withPot(100)
  .build();
```

## TDD Best Practices Implementation

### 1. Test Naming Convention
```typescript
// ✅ Good: Descriptive and behavior-focused
it('should emit gameState event when player folds', () => {});
it('should reject bet when amount exceeds player chips', () => {});
it('should advance to flop when preflop betting completes', () => {});

// ❌ Bad: Implementation-focused
it('should call emitGameState method', () => {});
it('should throw error', () => {});
it('should return true', () => {});
```

### 2. Arrange-Act-Assert Pattern
```typescript
it('should calculate pot correctly after all-in', () => {
  // Arrange
  const initialPot = 100;
  const player = PlayerBuilder.create().withChips(500).build();
  const gameState = GameStateBuilder.create()
    .withPot(initialPot)
    .withPlayers([player])
    .build();

  // Act
  const result = gameService.processAction(gameState, 'allIn', player.id);

  // Assert
  expect(result.gameState.pot).toBe(initialPot + 500);
  expect(result.gameState.players[0].chips).toBe(0);
});
```

### 3. Test Isolation and Independence
```typescript
describe('TableManager', () => {
  let tableManager: TableManager;
  let mockDatabase: jest.Mocked<Database>;

  beforeEach(() => {
    // Fresh instance for each test
    mockDatabase = createMockDatabase();
    tableManager = new TableManager(mockDatabase);
  });

  afterEach(() => {
    // Clean up any side effects
    tableManager.clearAllTables();
    jest.clearAllMocks();
  });
});
```

### 4. Comprehensive Error Testing
```typescript
describe('Error Scenarios', () => {
  it('should handle database connection failure gracefully', async () => {
    mockDatabase.connect.mockRejectedValue(new Error('Connection failed'));

    await expect(tableManager.init()).rejects.toThrow('Failed to initialize tables');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Database connection failed')
    );
  });

  it('should recover from temporary socket disconnection', async () => {
    const client = await createTestClient();
    
    // Simulate disconnection
    client.disconnect();
    
    // Simulate reconnection
    await client.connect();
    
    // Verify state recovery
    const gameState = await client.requestGameState();
    expect(gameState).toBeDefined();
  });
});
```

## Quality Gates & Metrics

### Automated Quality Checks
```bash
# Package.json scripts for TDD workflow
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage --watchAll=false",
    "test:mutation": "stryker run",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "npm run test:e2e:chrome && npm run test:e2e:firefox",
    "test:performance": "jest --config jest.performance.config.js",
    "test:all": "npm run test:coverage && npm run test:integration && npm run test:e2e",
    "quality:check": "npm run test:all && npm run test:mutation"
  }
}
```

### Success Metrics
- **Unit Test Coverage**: 90%+ lines, 85%+ branches
- **Mutation Test Score**: 85%+ mutants killed
- **Integration Test Coverage**: 80%+ critical paths
- **E2E Test Coverage**: 100% user journeys
- **Performance SLA**: <200ms action response time
- **Build Time**: <10 minutes total pipeline

## Implementation Timeline

| Week | Focus Area | Deliverables |
|------|------------|--------------|
| 1 | Test Coverage & Structure | Enhanced unit tests, standardized patterns |
| 2 | Error Scenarios & Edge Cases | Comprehensive negative testing |
| 3 | Property-Based Testing | Fast-check integration, poker rule validation |
| 4 | Mutation Testing | Stryker setup, test quality improvement |
| 5 | Integration & Performance | Multi-service tests, load testing |
| 6 | CI/CD & Automation | Pipeline enhancement, quality gates |

## Monitoring & Continuous Improvement

### Test Metrics Dashboard
```typescript
// Jest custom reporter for metrics collection
class TDDMetricsReporter {
  onRunComplete(contexts: Set<Context>, results: AggregatedResult) {
    const metrics = {
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      coverage: results.coverageMap?.getCoverageSummary(),
      duration: results.testResults.reduce((acc, result) => 
        acc + result.perfStats.end - result.perfStats.start, 0),
      timestamp: new Date().toISOString()
    };

    // Send to monitoring system
    this.sendMetrics(metrics);
  }
}
```

This TDD implementation guide transforms Pure Texas Poker from a good codebase to an exceptional one through systematic testing improvements, ensuring reliability, maintainability, and confidence in production deployments.