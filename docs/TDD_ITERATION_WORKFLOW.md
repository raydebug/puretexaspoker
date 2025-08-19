# TDD Iteration Process Workflow
## Pure Texas Poker - Systematic Development Cycle

### Iteration Cycle Overview
```
1. DESIGN → 2. IMPLEMENT/FIX → 3. RUN TESTS → 4. COMMIT → REPEAT
    ↓              ↓                ↓           ↓
  Feature      Code Changes    Backend +    Git Commit
  Design       + Backend       Selenium     + Next
               Tests + UI      UI Tests     Iteration
               Tests
```

## Iteration Process Implementation

### Phase 1: DESIGN
Define clear requirements and test specifications before coding.

#### Design Template
```markdown
## Iteration N: [Feature Name]

### Requirements
- [ ] Business Logic: [What the feature should do]
- [ ] Backend API: [Endpoints/methods needed]
- [ ] Frontend UI: [User interface changes]
- [ ] Database: [Schema changes if any]

### Test Strategy
- [ ] Backend Unit Tests: [Core logic tests]
- [ ] Backend Integration Tests: [Service interaction tests]
- [ ] Selenium UI Tests: [User workflow tests]

### Definition of Done
- [ ] All backend tests pass
- [ ] All Selenium UI tests pass
- [ ] Code review completed
- [ ] Ready for commit
```

### Phase 2: IMPLEMENT/FIX
Code implementation with test-first approach.

#### Implementation Checklist
```bash
# Backend Implementation Order
1. Write failing backend tests
2. Implement minimum code to pass tests
3. Write Selenium UI tests (if UI changes)
4. Refactor code while keeping tests green
```

### Phase 3: RUN TESTS
Automated test execution in sequence.

#### Test Execution Script
```bash
#!/bin/bash
# File: scripts/run-iteration-tests.sh

echo "🔄 Starting TDD Iteration Test Cycle..."

# Step 1: Backend Tests
echo "📋 Running Backend Tests..."
cd backend
npm test
BACKEND_EXIT_CODE=$?

if [ $BACKEND_EXIT_CODE -ne 0 ]; then
    echo "❌ Backend tests failed. Fix code and retry."
    exit 1
fi

echo "✅ Backend tests passed!"

# Step 2: Selenium UI Tests
echo "🌐 Running Selenium UI Tests..."
cd ../selenium
npm run test:selenium:headless
SELENIUM_EXIT_CODE=$?

if [ $SELENIUM_EXIT_CODE -ne 0 ]; then
    echo "❌ Selenium UI tests failed. Fix code and retry."
    exit 1
fi

echo "✅ All tests passed! Ready for commit."
exit 0
```

### Phase 4: COMMIT
Structured git commit process.

#### Commit Template
```bash
# Commit message format
[ITERATION-N] [TYPE]: Brief description

- Feature: [What was implemented]
- Tests: [What tests were added/updated]
- Backend: [Backend changes summary]
- Frontend: [Frontend changes summary]

Backend Tests: ✅ [X/Y passed]
Selenium Tests: ✅ [X/Y passed]
```

## Sample Iteration Implementation

Let me demonstrate this process with a real feature implementation: