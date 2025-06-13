# API Documentation

## Overview
This document describes all API endpoints for the Texas Hold'em Poker game. All API endpoints are prefixed with `/api/v1`.

## Authentication
- Bearer token authentication required for all endpoints except `/auth`
- Token format: `Bearer <jwt_token>`
- Token expiration: 24 hours

## Rate Limiting
- 100 requests per minute per IP
- 1000 requests per hour per user

## Common Response Formats
All responses follow this format:
```json
{
  "success": boolean,
  "data": any,
  "error": {
    "code": string,
    "message": string
  }
}
```

## Error Codes
- `AUTH_001`: Authentication required
- `AUTH_002`: Invalid token
- `AUTH_003`: Token expired
- `GAME_001`: Game not found
- `GAME_002`: Invalid game state
- `PLAYER_001`: Player not found
- `PLAYER_002`: Invalid player action

## Endpoints

### Authentication
#### POST /api/v1/auth/login
Login with username and password.

Request:
```json
{
  "username": string,
  "password": string
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": string,
    "user": {
      "id": string,
      "username": string
    }
  }
}
```

### Game Management
#### POST /api/v1/games
Create a new game.

Request:
```json
{
  "maxPlayers": number,
  "buyIn": number,
  "smallBlind": number,
  "bigBlind": number
}
```

Response:
```json
{
  "success": true,
  "data": {
    "gameId": string,
    "status": "waiting",
    "players": []
  }
}
```

#### GET /api/v1/games/{gameId}
Get game state.

Response:
```json
{
  "success": true,
  "data": {
    "id": string,
    "status": "waiting" | "playing" | "finished",
    "players": [
      {
        "id": string,
        "name": string,
        "chips": number,
        "position": number,
        "cards": Card[],
        "isActive": boolean,
        "isDealer": boolean,
        "currentBet": number
      }
    ],
    "pot": number,
    "communityCards": Card[],
    "currentPlayer": string,
    "currentBet": number,
    "phase": "preflop" | "flop" | "turn" | "river" | "showdown"
  }
}
```

### Player Actions
#### POST /api/v1/games/{gameId}/actions
Perform a player action.

Request:
```json
{
  "type": "bet" | "call" | "raise" | "fold" | "check",
  "amount": number // required for bet and raise
}
```

Response:
```json
{
  "success": true,
  "data": {
    "gameState": GameState,
    "action": {
      "type": string,
      "playerId": string,
      "amount": number
    }
  }
}
```

## Types

### Card
```typescript
interface Card {
  rank: string;
  suit: string;
  isVisible?: boolean;
}
```

### GameState
```typescript
interface GameState {
  id: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentPlayerId: string | null;
  currentPlayerPosition: number;
  dealerPosition: number;
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  status: 'waiting' | 'playing' | 'finished';
  currentBet: number;
  minBet: number;
  smallBlind: number;
  bigBlind: number;
}
```

### Player
```typescript
interface Player {
  id: string;
  name: string;
  chips: number;
  isActive: boolean;
  isDealer: boolean;
  currentBet: number;
  position: number;
  seatNumber: number;
  isAway: boolean;
  cards: Card[];
  avatar: Avatar;
}
```

### Avatar
```typescript
interface Avatar {
  type: 'default' | 'image' | 'initials';
  imageUrl?: string;
  initials?: string;
  color: string;
}
```

## WebSocket Events

### Server -> Client
- `gameState`: Current game state
- `playerJoined`: New player joined
- `playerLeft`: Player left
- `gameStarted`: Game started
- `playerAction`: Player performed an action
- `dealCards`: Cards dealt
- `roundEnd`: Round ended
- `gameEnd`: Game ended

### Client -> Server
- `joinGame`: Join a game
- `leaveGame`: Leave a game
- `playerAction`: Perform an action
- `ready`: Ready to start

## Versioning
Current version: v1
Breaking changes will be introduced in new versions (v2, v3, etc.) 