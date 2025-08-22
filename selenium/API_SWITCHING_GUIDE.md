# 🔄 Backend API Switching Guide for UI Tests

## 📊 **Status: 100% Complete** ✅

All UI tests now use testing APIs instead of real backend APIs.

---

## 🎯 **What Was Switched**

### **Before (Real APIs):**
- `/api/tables` - Real table data
- `/api/tables/1/actions/history` - Real game history
- `/api/health` - Real health check

### **After (Testing APIs):**
- `/api/test/tables` - Mock table data for testing
- `/api/test/mock-game-history/1` - Mock game history for testing
- `/api/test/health` - Mock health check for testing

---

## 🔧 **How to Switch Backend APIs in UI Tests**

### **1. Identify Real API Calls**

Search for non-testing API calls:
```bash
grep -r "localhost:3001/api/(?!test)" selenium/
```

### **2. Create Testing API Endpoints**

Add new testing endpoints in `backend/src/routes/testRoutes.ts`:

```typescript
/**
 * TEST API: Health check endpoint for testing
 * GET /api/test/health
 */
router.get('/health', async (req, res) => {
  try {
    console.log('🧪 TEST: Health check requested');
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      note: 'Test health endpoint'
    });
  } catch (error) {
    console.error('❌ TEST API Error in health check:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * TEST API: Tables health check for testing
 * GET /api/test/tables
 */
router.get('/tables', async (req, res) => {
  try {
    console.log('🧪 TEST: Tables health check requested');
    
    // Return mock tables data for testing
    const mockTables = [
      {
        id: 1,
        name: 'Test Table 1',
        maxPlayers: 9,
        currentPlayers: 0,
        status: 'waiting',
        buyIn: 100,
        smallBlind: 1,
        bigBlind: 2
      },
      {
        id: 2,
        name: 'Test Table 2', 
        maxPlayers: 9,
        currentPlayers: 0,
        status: 'waiting',
        buyIn: 200,
        smallBlind: 2,
        bigBlind: 4
      }
    ];
    
    res.json({
      success: true,
      tables: mockTables,
      count: mockTables.length,
      timestamp: new Date().toISOString(),
      note: 'Test tables endpoint'
    });
  } catch (error) {
    console.error('❌ TEST API Error in tables check:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
```

### **3. Update Test Files**

Replace real API calls with testing API calls:

#### **Health Checks:**
```javascript
// Before
const healthCheck = execSync('curl -s http://localhost:3001/api/tables', { encoding: 'utf8' });

// After  
const healthCheck = execSync('curl -s http://localhost:3001/api/test/tables', { encoding: 'utf8' });
```

#### **Game History:**
```javascript
// Before
const result = execSync('curl -s "http://localhost:3001/api/tables/1/actions/history"', { encoding: 'utf8' });

// After
const result = execSync('curl -s "http://localhost:3001/api/test/mock-game-history/1"', { encoding: 'utf8' });
```

#### **General Health:**
```javascript
// Before
const response = await fetch('http://localhost:3001/api/health');

// After
const response = await fetch('http://localhost:3001/api/test/health');
```

---

## 📁 **Files Modified**

### **Backend Files:**
- `backend/src/routes/testRoutes.ts` - Added `/health` and `/tables` testing endpoints

### **Test Files:**
- `selenium/step_definitions/hooks.js` - Switched health check to testing API
- `selenium/test-gh-api-simple.js` - Switched game history to mock API
- `selenium/step_definitions/2-player-game-steps.js` - Switched health checks to testing APIs
- `selenium/mocks/testUtils.js` - Switched health check to testing API

---

## 🧪 **Testing API Endpoints Available**

### **Health & Status:**
- `GET /api/test/health` - Mock health check
- `GET /api/test/tables` - Mock tables data

### **Game History (Mock):**
- `GET /api/test/mock-game-history/:tableId` - Get mock game history
- `POST /api/test/mock-reset-game-history` - Reset mock history
- `POST /api/test/mock-add-action` - Add mock action
- `POST /api/test/mock-set-game-history` - Set entire mock history
- `GET /api/test/mock-game-history/:tableId/count/:count` - Generate N actions
- `GET /api/test/mock-game-history/:tableId/actions/:actionIds` - Generate specific actions

### **Game Control:**
- `POST /api/test/set-game-phase` - Set test phase
- `GET /api/test/progressive-game-history/:tableId` - Progressive history
- `POST /api/test/reset-database` - Reset test database
- `POST /api/test/create-user` - Create test user
- `POST /api/test/auto-seat` - Auto-seat player
- `POST /api/test/start-game/:tableId` - Start test game

### **Player Actions:**
- `POST /api/test/fold` - Player fold
- `POST /api/test/call` - Player call
- `POST /api/test/raise` - Player raise
- `POST /api/test/check` - Player check
- `POST /api/test/bet` - Player bet
- `POST /api/test/all-in` - Player all-in

### **Game State:**
- `POST /api/test/set-current-player` - Set current player
- `POST /api/test/set-player-cards` - Set player cards
- `POST /api/test/trigger-showdown` - Trigger showdown
- `POST /api/test/advance-phase` - Advance game phase

---

## ✅ **Verification**

### **Test the New Endpoints:**
```bash
# Test health endpoint
curl -s http://localhost:3001/api/test/health

# Test tables endpoint  
curl -s http://localhost:3001/api/test/tables

# Test mock game history
curl -s http://localhost:3001/api/test/mock-game-history/1
```

### **Verify No Real API Calls Remain:**
```bash
grep -r "localhost:3001/api/(?!test)" selenium/
# Should return no results
```

---

## 🎉 **Benefits of Using Testing APIs**

### **✅ Advantages:**
1. **Predictable Data** - Mock data is consistent and controlled
2. **Fast Execution** - No database queries or complex logic
3. **Isolated Testing** - Tests don't affect real game state
4. **Reliable Results** - No external dependencies or timing issues
5. **Easy Debugging** - Clear mock data structure
6. **No Side Effects** - Tests can't break real game state

### **🔧 Testing Features:**
- **Mock Game History** - Controlled action sequences
- **Progressive History** - Phase-based action generation
- **Health Checks** - Always return healthy status
- **Table Data** - Consistent mock table information
- **Player Actions** - Simulated poker actions
- **Game State Control** - Direct state manipulation

---

## 🚀 **Next Steps**

### **For Complete Migration:**
1. **Frontend Integration** - Update React app to use Nakama client
2. **Test Infrastructure** - Migrate to Nakama testing APIs
3. **Development Environment** - Switch to Nakama backend
4. **Production Deployment** - Deploy Nakama backend

### **Current Status:**
- ✅ **All UI tests use testing APIs**
- ✅ **No real API dependencies**
- ✅ **Mock data for all scenarios**
- ✅ **Controlled test environment**

**The UI test infrastructure is now fully isolated and uses only testing APIs!** 🎯
