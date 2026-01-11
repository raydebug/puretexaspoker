# Lightweight Unit Tests

This directory contains lightweight, fast-running tests for quick validation and debugging during development.

## Test Files

### 1. **test-player-call-action-api.sh** (20 seconds)
**Purpose**: Verify Player CALL action API endpoint works correctly  
**What it tests**:
- Backend server startup
- `POST /api/test_player_action` endpoint
- CALL action execution with amount parameter
- API response format validation

**How to run**:
```bash
bash tests/unit/test-player-call-action-api.sh
```

---

### 2. **verify-player4-call-step-definitions.js** (<1 second)
**Purpose**: Code-level verification without running servers  
**What it tests**:
- "Player calls more (all-in)" step definition includes `performTestPlayerAction` call
- Generic "Player calls $X more" step definition includes `performTestPlayerAction` call
- Related to GH-61 bug fix

**How to run**:
```bash
node tests/unit/verify-player4-call-step-definitions.js
```

---

### 3. **test-mock-backend-server.js** (5 seconds)
**Purpose**: Test Mock Backend Server functionality  
**What it tests**:
- Mock server health endpoint (`/api/health`)
- Game history endpoint response structure
- Phase update endpoint (`/api/test/set-game-phase`)
- Action history tracking

**How to run**:
```bash
node tests/unit/test-mock-backend-server.js
```

---

### 4. **test-session-data-socket-io.js** (5 seconds)
**Purpose**: Validate Socket.IO session data handling  
**What it tests**:
- Socket connection establishment
- `updateUserLocation` event handling
- Session data persistence after location update
- `takeSeat` action with valid session data
- Related to session data bug fix

**How to run** (requires backend running on port 3001):
```bash
node tests/unit/test-session-data-socket-io.js
```

---

### 5. **test-single-screenshot-capture.js** (30 seconds)
**Purpose**: Test Selenium screenshot capture functionality  
**What it tests**:
- WebDriver initialization
- Page navigation
- Screenshot file saving
- Basic UI visibility

**How to run** (requires servers running):
```bash
node tests/unit/test-single-screenshot-capture.js
```

---

### 6. **setup-manual-test-environment.sh** (30 seconds)
**Purpose**: Prepare environment for manual testing  
**What it does**:
- Kills existing processes
- Starts backend server
- Starts frontend application
- Waits for both services to be ready
- Displays ready message

**How to run**:
```bash
bash tests/unit/setup-manual-test-environment.sh
```

Press `Ctrl+C` to stop all services.

---

## Test Execution Speed

| Test | Speed | Category |
|---|---|---|
| verify-player4-call-step-definitions.js | <1 sec | Code verification |
| test-mock-backend-server.js | ~5 sec | Mock server validation |
| test-session-data-socket-io.js | ~5 sec | Socket.IO validation |
| test-player-call-action-api.sh | ~20 sec | API endpoint testing |
| test-single-screenshot-capture.js | ~30 sec | UI capture testing |
| setup-manual-test-environment.sh | ~30 sec | Environment setup |

## Use Cases

**Before Full Test Suite** (run_verification.sh):
- Run `verify-player4-call-step-definitions.js` first (instant feedback)
- Run `test-player-call-action-api.sh` (quick API validation)
- Then run full 5-minute test suite

**During Development**:
- Use `verify-player4-call-step-definitions.js` for code-level checks
- Use `test-mock-backend-server.js` to isolate backend logic
- Use `test-session-data-socket-io.js` for Socket.IO testing

**Manual Testing**:
- Run `setup-manual-test-environment.sh` to launch both servers
- Open http://localhost:3000 in browser
- Test features manually

## Notes

- Tests can be run independently in any order
- Tests clean up processes before starting
- Most tests require `node` and `npm` to be installed
- Socket.IO tests require backend running on port 3001
- Browser-based tests require Chrome/Chromium installed
