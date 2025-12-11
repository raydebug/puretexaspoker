# 🎮 Nakama API Documentation – Pure Texas Poker

A comprehensive guide to integrating **Pure Texas Poker** with the **Nakama backend server**, covering authentication, real-time multiplayer, player data storage, custom RPCs, leaderboards, and more.

---

## 🔧 Base Configuration

```javascript
const client = new nakamajs.Client("defaultkey", "127.0.0.1", "7350");
client.ssl = false;
```

---

## 🔐 Authentication

### Device Authentication

```javascript
const session = await client.authenticateDevice({
  id: deviceId,
  create: true,
  username: playerNickname
});
```

### Email Authentication

```javascript
const session = await client.authenticateEmail({
  email: "player@example.com",
  password: "securePassword123",
  create: false
});
```

### Guest Authentication

```javascript
const session = await client.authenticateCustom({
  id: `guest_${Date.now()}`,
  create: true
});
```

---

## 🌐 Real-time Multiplayer

### Socket Connection

```javascript
const socket = client.createSocket(true, false);
await socket.connect(session);

socket.onconnect = () => console.log("Connected");
socket.ondisconnect = () => console.log("Disconnected");
socket.onerror = (err) => console.error("Socket error:", err);
```

---

### Match Management

```javascript
const match = await socket.createMatch("poker_table");
await socket.joinMatch(tableId);
await socket.leaveMatch(tableId);
```

---

### Game Events

```javascript
// Seat Selection
socket.sendMatchState(tableId, 1, JSON.stringify({
  action: "select_seat",
  seatNumber: 3,
  buyInAmount: 100
}));

// Game Action
socket.sendMatchState(tableId, 2, JSON.stringify({
  action: "raise",
  amount: 50
}));

// Chat Message
socket.sendMatchState(tableId, 3, JSON.stringify({
  message: "Good luck!",
  timestamp: Date.now()
}));
```

---

### Event Listeners

```javascript
socket.onmatchstate = (state) => {
  const data = JSON.parse(state.state);
  switch (state.op_code) {
    case 10: updateGameUI(data); break;
    case 11: handlePlayerAction(data); break;
    case 12: displayChatMessage(data); break;
  }
};

socket.onmatchpresence = (presence) => {
  presence.joins.forEach(p => console.log(`${p.username} joined`));
  presence.leaves.forEach(p => console.log(`${p.username} left`));
};
```

---

## 🧾 Player Storage

### Save Stats

```javascript
await client.writeStorageObjects(session, [
  {
    collection: "player_stats",
    key: "profile",
    value: {
      gamesPlayed: 150,
      gamesWon: 75,
      totalWinnings: 2500,
      favoritePosition: "button",
      lastLogin: new Date().toISOString()
    }
  }
]);
```

### Read Stats

```javascript
const result = await client.readStorageObjects(session, {
  object_ids: [{
    collection: "player_stats",
    key: "profile",
    user_id: session.user_id
  }]
});
const stats = result.objects[0]?.value;
```

---

## 🧠 Custom RPCs

```javascript
await client.rpc(session, "evaluate_hand", {
  holeCards: ["AS", "KH"],
  communityCards: ["AD", "KS", "QC", "JH", "TC"]
});

await client.rpc(session, "start_new_hand", {
  tableId: "table-uuid"
});

await client.rpc(session, "process_action", {
  tableId: "table-uuid",
  playerId: session.user_id,
  action: "raise",
  amount: 50
});
```

---

## 🏆 Leaderboards

```javascript
await client.writeLeaderboardRecord(session, "weekly_tournament", {
  score: 1500,
  metadata: { position: 3, prize: 150 }
});

const leaderboard = await client.listLeaderboardRecords(session, "weekly_tournament", null, 20);
```

---

## 🔔 Notifications

```javascript
await client.rpc(session, "send_notification", {
  type: "tournament_reminder",
  userId,
  content: {
    subject: "Tournament Starts Soon!",
    content: "Your game begins in 10 minutes"
  }
});

await client.rpc(session, "invite_to_table", {
  friendId: "friend-uuid",
  tableId: "table-uuid",
  message: "Join me at this table!"
});
```

---

## 👥 Poker Clubs

```javascript
const group = await client.createGroup(session, {
  name: "High Rollers Club",
  description: "Exclusive club for serious players",
  open: false,
  max_count: 50
});

await client.joinGroup(session, group.group.id);

await client.rpc(session, "create_club_tournament", {
  groupId: "club-uuid",
  name: "Weekly Club Championship",
  buyIn: 100,
  startTime: "2025-01-20T19:00:00Z",
  maxPlayers: 30
});
```

---

## 🚨 Error Handling

```javascript
try {
  await client.rpc(session, "process_action", actionData);
} catch (err) {
  switch (err.code) {
    case 3: console.error("Invalid input:", err.message); break;
    case 5: console.error("Not found:", err.message); break;
    case 6: console.error("Already exists:", err.message); break;
    case 9: console.error("Precondition failed:", err.message); break;
    default: console.error("Unexpected error:", err);
  }
}
```

| Code | Error                | Description                          |
|------|----------------------|--------------------------------------|
| 1001 | INSUFFICIENT_CHIPS   | Not enough chips                     |
| 1002 | OUT_OF_TURN          | Acted out of turn                    |
| 1003 | INVALID_BET_SIZE     | Invalid bet size                     |
| 1004 | TABLE_FULL           | Table is at capacity                 |
| 1005 | GAME_IN_PROGRESS     | Cannot join while hand is active     |
| 1006 | MINIMUM_PLAYERS      | Not enough players to start game     |

---

## 📊 Rate Limits

| Operation        | Limit         | Window        |
|------------------|---------------|---------------|
| Game Actions     | 10/sec        | Per player    |
| Chat Messages    | 5/min         | Per player    |
| Table Creation   | 3/hr          | Per player    |
| RPC Calls        | 100/min       | Per session   |

---

## 🧩 WebSocket Op Codes

| Op Code | Type                  | Description                   |
|--------:|-----------------------|-------------------------------|
| 1       | `seat_action`         | Seat selection or leave       |
| 2       | `game_action`         | Bet, call, raise, fold, etc.  |
| 3       | `chat_message`        | Player messages               |
| 10      | `game_state`          | Full game state update        |
| 11      | `player_action_result`| Server-validated action       |
| 12      | `chat_broadcast`      | Broadcast chat to table       |
| 13      | `hand_complete`       | Hand result summary           |
| 14      | `player_eliminated`   | Player out of chips           |