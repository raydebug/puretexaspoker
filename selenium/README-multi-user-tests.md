# Multi-User Seat Management Tests

This directory contains comprehensive tests for multi-user seat management functionality, including multiple browser instances testing the seat switching features that were critical for the poker platform.

## 🎯 What This Tests

- **Multi-browser seat management**: Multiple users taking and changing seats simultaneously
- **Real-time synchronization**: All browser instances show consistent state
- **Seat switching bug fix**: Users can return to previously occupied seats
- **Conflict prevention**: Proper handling of simultaneous seat requests
- **Stress testing**: Rapid seat changes and edge cases

## 🚀 Quick Demo

For a visual demonstration with multiple browser windows:

```bash
# Start the servers first
npm run start

# In another terminal, run the interactive demo
cd selenium
node run-multi-user-demo.js
```

This will open 4 browser windows showing Alice, Bob, Charlie, and Diana joining a table, taking seats, and changing seats in real-time.

## 🧪 Running the Full Test Suite

### Prerequisites

1. **Start the servers**:
```bash
npm run start  # Starts both frontend (3000) and backend (8080)
```

2. **Run in headed mode** (to see browsers):
```bash
cd selenium
HEADLESS=false npm run test:selenium:cucumber
```

3. **Run specific multi-user tests**:
```bash
cd selenium
HEADLESS=false npx cucumber-js features/multi-user-seat-management.feature --require step_definitions/**/*.js
```

## 📋 Test Scenarios

### 1. Multiple Users Join Table and Take Different Seats
- 4 users join simultaneously
- Each takes a different seat with different buy-ins
- Verifies real-time updates across all browser instances

### 2. Users Change Seats Successfully  
- Users move between seats
- Tests the seat switching functionality
- Validates that players can return to previously occupied seats

### 3. Seat Conflict Prevention and Resolution
- Tests simultaneous seat requests
- Validates proper error handling
- Ensures only one user can occupy a seat

### 4. Real-time Updates Across All Browser Instances
- Verifies WebSocket synchronization
- Tests immediate UI updates
- Validates consistent state across all clients

### 5. High-Frequency Seat Changes Stress Test
- Rapid seat changes in sequence
- Tests system robustness under load
- Validates final state consistency

## 🛠️ Technical Implementation

### Browser Management
- Multiple Chrome instances with proper positioning
- Automatic cleanup after each test scenario
- Support for both headed and headless modes

### State Verification
- Comprehensive table state comparison across browsers
- Real-time synchronization checking
- Seat occupancy and chip count validation

### Error Handling
- Graceful cleanup on test failure
- Proper browser instance management
- Timeout handling for WebSocket operations

## 🔧 Configuration

### Environment Variables
- `HEADLESS=false` - Run in headed mode (default for demo)
- `BROWSER=chrome` - Browser to use for testing
- `FRONTEND_URL=http://localhost:3000` - Frontend URL
- `BACKEND_URL=http://localhost:8080` - Backend URL

### Test Timeouts
- Element waiting: 5 seconds
- State synchronization: 1 second
- Action propagation: 500ms

## 📊 Expected Results

When running successfully, you should see:
- ✅ All browser instances showing identical table states
- ✅ Smooth seat assignments and changes
- ✅ Proper conflict prevention
- ✅ Real-time UI updates
- ✅ Consistent chip counts and player names

## 🐛 Troubleshooting

### Common Issues

1. **"Element not found" errors**:
   - Ensure frontend is running on port 3000
   - Check that table components have proper test IDs

2. **State inconsistency across browsers**:
   - Verify WebSocket connections are working
   - Check backend WebSocket broadcasting

3. **Browser cleanup issues**:
   - Tests automatically clean up browsers
   - Manual cleanup: `pkill -f chrome` if needed

4. **Timeout errors**:
   - Increase wait times in step definitions
   - Check network latency between frontend/backend

### Debug Mode

Add logging to see detailed test execution:
```bash
DEBUG=selenium* npm run test:selenium:cucumber
```

## 🎮 Interactive Demo Features

The `run-multi-user-demo.js` script provides:
- 4 browser windows positioned for optimal viewing
- Step-by-step demonstration with console logging
- Real-time state verification
- Conflict prevention demonstration
- 30-second observation window before cleanup

Perfect for demonstrating the multi-user functionality to stakeholders or for debugging seat management issues.

## 🔗 Related Files

- `features/multi-user-seat-management.feature` - Cucumber scenarios
- `step_definitions/multi-user-seat-management-steps.js` - Test implementation
- `run-multi-user-demo.js` - Interactive demonstration script
- `config/selenium.config.js` - WebDriver configuration 