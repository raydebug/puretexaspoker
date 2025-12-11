# Pure Texas Poker - Nakama Backend

This directory contains the Nakama server-side implementation of Pure Texas Poker, converted from the original Express.js/Socket.io backend.

## 🎯 Conversion Progress

### ✅ Completed
- **Project Structure**: TypeScript setup with proper type definitions
- **Match Handlers**: Core poker table logic converted from WebSocket handlers to Nakama match handlers
- **RPC Functions**: REST API endpoints converted to Nakama RPC functions
- **Game Logic**: Poker game mechanics (dealing, betting, actions) implemented in Nakama
- **Docker Setup**: Docker compose configuration for Nakama + CockroachDB

### 🔄 In Progress
- **Authentication**: Converting Express auth to Nakama authentication hooks
- **Hand Evaluation**: Integrating poker hand evaluation logic
- **Storage Migration**: Converting Prisma/SQLite operations to Nakama storage

### 📋 TODO
- **Frontend Integration**: Update React frontend to use Nakama client
- **AI Players**: Convert AI player service to work with Nakama
- **Testing**: Create comprehensive test suite for Nakama implementation
- **Performance**: Optimize match handlers and storage operations

## 🏗️ Architecture

### Match Handlers (`src/match_handlers/poker_table.ts`)
Converts the original WebSocket event handlers to Nakama match functions:

- **`pokerTableInit`**: Initialize new poker table match
- **`pokerTableJoin/Leave`**: Handle player connections
- **`pokerTableLoop`**: Process game messages and actions
- **`pokerTableSignal`**: Handle admin commands

### RPC Functions (`src/rpc_handlers/table_rpcs.ts`)
Converts REST API endpoints to Nakama RPC calls:

- **`create_table`**: Create new poker table
- **`join_table`**: Join existing table
- **`take_seat`/`leave_seat`**: Seat management
- **`get_table_list`**: Browse available tables
- **`get_player_stats`**: Player statistics
- **`get_game_history`**: Game history

### Authentication Hooks (`src/main.ts`)
Handles player authentication and session management:

- **Before/After Authentication**: Initialize player data
- **Storage Setup**: Player stats, game history

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- TypeScript

### Build and Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build TypeScript**:
   ```bash
   npm run build
   ```

3. **Start Nakama server**:
   ```bash
   docker-compose up --build
   ```

The server will be available at:
- **HTTP API**: `http://localhost:7350`
- **gRPC**: `localhost:7349`
- **Console**: `http://localhost:7351`

### Development

- **Watch mode**: `npm run dev`
- **Clean build**: `npm run clean && npm run build`

## 📡 API Usage

### Client Connection
```javascript
import { Client } from "@heroiclabs/nakama-js";

const client = new Client("defaultkey", "127.0.0.1", "7350", false);
const session = await client.authenticateDevice({ id: deviceId, create: true });
```

### Create and Join Table
```javascript
// Create table
const result = await client.rpc(session, "create_table", {
  tableName: "High Stakes",
  stakes: "$5/$10",
  maxPlayers: 6
});

// Join match
const socket = client.createSocket();
await socket.connect(session);
await socket.joinMatch(result.matchId);
```

### Game Actions
```javascript
// Take seat
socket.sendMatchState(matchId, 1, JSON.stringify({
  action: "take_seat",
  seatNumber: 3,
  buyInAmount: 200
}));

// Player action
socket.sendMatchState(matchId, 2, JSON.stringify({
  action: "raise",
  amount: 50
}));
```

## 🔄 Migration Guide

### From Original Backend

1. **Authentication**: 
   - Replace Express JWT with Nakama sessions
   - Use device authentication for guests
   - Email authentication for registered users

2. **Real-time Communication**:
   - Replace Socket.io events with Nakama match messages
   - Use op codes for message types (see `OpCodes` in poker_table.ts)

3. **Database Operations**:
   - Replace Prisma calls with Nakama storage operations
   - Use collections: `player_stats`, `game_history`, `poker_tables`

4. **Game State Management**:
   - Move from in-memory maps to Nakama match state
   - Leverage Nakama's built-in presence and matchmaking

### Frontend Changes Required

1. **Replace Socket.io with Nakama client**:
   ```javascript
   // Before: Socket.io
   socket.emit('takeSeat', { tableId, seatNumber, buyIn });
   
   // After: Nakama
   socket.sendMatchState(matchId, OpCodes.SEAT_ACTION, JSON.stringify({
     action: 'take_seat',
     seatNumber,
     buyInAmount: buyIn
   }));
   ```

2. **Update authentication flow**:
   ```javascript
   // Before: Custom JWT
   const response = await fetch('/api/auth/login', { ... });
   
   // After: Nakama
   const session = await client.authenticateEmail(email, password);
   ```

## 🎮 Game Flow

1. **Authentication**: Player authenticates with Nakama
2. **Table Discovery**: Call `get_table_list` RPC to browse tables
3. **Join Match**: Use `join_table` RPC to get match ID, then join match
4. **Take Seat**: Send `SEAT_ACTION` message to take a seat
5. **Game Play**: Send `GAME_ACTION` messages for poker actions
6. **Real-time Updates**: Receive `GAME_STATE` broadcasts with updates

## 🔧 Configuration

### Environment Variables
- `NAKAMA_CONSOLE_USERNAME`: Console admin username
- `NAKAMA_CONSOLE_PASSWORD`: Console admin password

### Match Configuration
- **Tick Rate**: 1 per second
- **Max Players**: 6 per table + 4 observers
- **Timeout**: 30 seconds for player actions

## 📊 Storage Collections

- **`player_stats`**: Player statistics and profiles
- **`game_history`**: Historical game data
- **`poker_tables`**: Table metadata for discovery

## 🔐 Security

- **Rate Limiting**: Built into Nakama (see nakama-api.md)
- **Input Validation**: All RPC and match message data validated
- **Authorization**: Match-level permissions for game actions

## 🐛 Debugging

1. **Enable Debug Logging**: Set Nakama log level to DEBUG
2. **Console Access**: Use Nakama console at `http://localhost:7351`
3. **Storage Browser**: Inspect player data and game state
4. **Match Inspector**: Monitor active matches and messages

## 📚 References

- [Nakama Documentation](https://heroiclabs.com/docs/)
- [Nakama JavaScript Client](https://github.com/heroiclabs/nakama-js)
- [Original API Documentation](../docs/nakama-api.md) 