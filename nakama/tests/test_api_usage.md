# Nakama Backend Testing API Usage Guide

This guide demonstrates how to use the comprehensive testing APIs that have been ported from the Express.js backend to Nakama.

## 🧪 Test RPC Functions

### 1. Create Mock Game
```javascript
// Create a test poker game
const createGameResponse = await client.rpc(session, "test_create_mock_game", {
  tableId: "test-table-1",
  players: [
    { id: "player1", name: "Alice", chips: 1000, seat: 1 },
    { id: "player2", name: "Bob", chips: 1000, seat: 2 },
    { id: "player3", name: "Charlie", chips: 1000, seat: 3 }
  ]
});
```

### 2. Seat Players
```javascript
// Seat a player at a specific position
const seatResponse = await client.rpc(session, "test_take_seat", {
  tableId: "test-table-1",
  playerId: "player1",
  seatNumber: 1,
  buyIn: 1000
});
```

### 3. Start Game
```javascript
// Start the poker game
const startResponse = await client.rpc(session, "test_start_game", {
  tableId: "test-table-1"
});
```

### 4. Simulate Player Actions
```javascript
// Player bets
const betResponse = await client.rpc(session, "test_player_action", {
  tableId: "test-table-1",
  playerId: "player1",
  action: "bet",
  amount: 50
});

// Player calls
const callResponse = await client.rpc(session, "test_player_action", {
  tableId: "test-table-1",
  playerId: "player2",
  action: "call"
});

// Player raises
const raiseResponse = await client.rpc(session, "test_player_action", {
  tableId: "test-table-1",
  playerId: "player3", 
  action: "raise",
  amount: 100
});

// Player folds
const foldResponse = await client.rpc(session, "test_player_action", {
  tableId: "test-table-1",
  playerId: "player1",
  action: "fold"
});
```

### 5. Advance Game Phases
```javascript
// Advance to flop
const flopResponse = await client.rpc(session, "test_advance_phase", {
  tableId: "test-table-1",
  targetPhase: "flop"
});

// Advance to turn
const turnResponse = await client.rpc(session, "test_advance_phase", {
  tableId: "test-table-1",
  targetPhase: "turn"
});

// Advance to river
const riverResponse = await client.rpc(session, "test_advance_phase", {
  tableId: "test-table-1",
  targetPhase: "river"
});

// Advance to showdown
const showdownResponse = await client.rpc(session, "test_advance_phase", {
  tableId: "test-table-1",
  targetPhase: "showdown"
});
```

### 6. Get Game State and History
```javascript
// Get current game state
const gameStateResponse = await client.rpc(session, "test_get_mock_game", {
  tableId: "test-table-1"
});

// Get game action history
const historyResponse = await client.rpc(session, "test_get_game_history", {
  tableId: "test-table-1"
});
```

### 7. Update Game State
```javascript
// Update game state directly (for edge case testing)
const updateResponse = await client.rpc(session, "test_update_mock_game", {
  tableId: "test-table-1",
  updates: {
    pot: 500,
    currentBet: 100,
    phase: "turn"
  }
});
```

### 8. Cleanup Test Games
```javascript
// Clean up all test games
const cleanupResponse = await client.rpc(session, "test_cleanup_games", {});
```

## 🔐 Authentication and User Management APIs

### 1. User Registration
```javascript
const registerResponse = await client.rpc(session, "register_user", {
  username: "testuser",
  email: "test@example.com",
  password: "securepass123",
  displayName: "Test User"
});
```

### 2. Get User Profile
```javascript
const profileResponse = await client.rpc(session, "get_user_profile", {});
```

### 3. Update Profile
```javascript
const updateProfileResponse = await client.rpc(session, "update_user_profile", {
  displayName: "New Display Name",
  avatar: "avatar_url"
});
```

### 4. Check Permissions
```javascript
const permissionResponse = await client.rpc(session, "check_permission", {
  permission: "place_bet"
});
```

### 5. Role Management (Admin Only)
```javascript
// Assign role
const assignRoleResponse = await client.rpc(session, "assign_role", {
  targetUserId: "user123",
  roleName: "moderator"
});

// Ban user
const banResponse = await client.rpc(session, "ban_user", {
  targetUserId: "user123",
  reason: "Violating rules",
  duration: 60 // 60 minutes
});

// Unban user
const unbanResponse = await client.rpc(session, "unban_user", {
  targetUserId: "user123"
});
```

## 🧪 BDD Testing Integration

### Example Cucumber Step Definitions

```javascript
// Seat player step
Given('player {string} takes seat {int} with {int} chips', async function (playerName, seat, chips) {
  const response = await this.client.rpc(this.session, "test_take_seat", {
    tableId: this.tableId,
    playerId: playerName,
    seatNumber: seat,
    buyIn: chips
  });
  
  expect(response.success).toBe(true);
});

// Player action step
When('player {string} {string}', async function (playerName, action) {
  const response = await this.client.rpc(this.session, "test_player_action", {
    tableId: this.tableId,
    playerId: playerName,
    action: action
  });
  
  expect(response.success).toBe(true);
});

// Phase advance step  
When('the game advances to {string}', async function (phase) {
  const response = await this.client.rpc(this.session, "test_advance_phase", {
    tableId: this.tableId,
    targetPhase: phase
  });
  
  expect(response.success).toBe(true);
});

// Verification step
Then('the pot should be {int}', async function (expectedPot) {
  const response = await this.client.rpc(this.session, "test_get_mock_game", {
    tableId: this.tableId
  });
  
  expect(response.data.gameState.pot).toBe(expectedPot);
});
```

## 📊 Advanced Features Migrated

### 1. Role-Based Access Control
- ✅ Player, Spectator, Moderator, Administrator roles
- ✅ Granular permissions system
- ✅ Ban/unban functionality with duration support
- ✅ Role assignment and management

### 2. Comprehensive Testing
- ✅ Complete test_ API suite for BDD testing
- ✅ Mock game creation and management
- ✅ Player action simulation
- ✅ Game phase advancement
- ✅ Action history tracking

### 3. User Management
- ✅ Enhanced user profiles with role information
- ✅ Ban expiration checking
- ✅ Moderation action logging
- ✅ User statistics tracking

### 4. Storage Collections

The Nakama backend uses the following storage collections:

- `user_profiles` - Enhanced user profiles with roles
- `roles` - Role definitions and permissions
- `permissions` - Individual permission definitions
- `moderation_actions` - Moderation history and audit trail
- `test_games` - Test game states for BDD testing
- `player_stats` - Player statistics (backward compatibility)

## 🎯 Migration Status

✅ **Advanced Authentication** - Complete role-based system
✅ **Comprehensive Testing** - Full test_ API suite
⏳ **Tournament Features** - Next phase
⏳ **Game Persistence** - Next phase
⏳ **Error Handling** - Next phase

The Nakama backend now includes all the advanced authentication, user management, and testing infrastructure from the Express.js backend, providing a solid foundation for production poker games with comprehensive BDD testing support.
