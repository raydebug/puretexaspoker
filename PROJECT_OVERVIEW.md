## PROJECT_OVERVIEW.md

> **Purpose**: This document describes the structure of the Pure Texas Poker project, the role of each major file/module, key reusable functions, constants, and test cases.
> **Maintainers**: Only update this document with approval to ensure alignment with CLAUDE.md reuse policy.

---

### 📁 Source Files

#### Backend Core (TypeScript)
| File/Module                          | Purpose / Description                                                   |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `backend/src/server.ts`              | Main Express server entry point with Socket.io integration             |
| `backend/src/app.ts`                 | Express application setup with middleware and route configuration       |
| `backend/src/db.ts`                  | Prisma database client initialization and connection                    |
| `backend/src/services/TableManager.ts` | Central service managing all table state, players, and game logic   |
| `backend/src/services/handEvaluator.ts` | Poker hand evaluation logic (straight flush, full house, etc.)      |
| `backend/src/services/deckService.ts`   | Card deck management, shuffling, and dealing operations             |
| `backend/src/services/seatManager.ts`   | Player seating, blind positions, and turn order management          |
| `backend/src/services/LocationManager.ts` | Tracks user locations (table/seat attributes)                      |
| `backend/src/socketHandlers/consolidatedHandler.ts` | Unified WebSocket event handling for game actions    |

#### Frontend Core (TypeScript React)
| File/Module                          | Purpose / Description                                                   |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `frontend/src/App.tsx`               | Main React application router and global state management              |
| `frontend/src/pages/GamePage.tsx`    | Main game interface with table view and player actions                 |
| `frontend/src/pages/LobbyPage.tsx`   | Table browsing and selection interface                                 |
| `frontend/src/services/socketService.ts` | WebSocket communication layer with game state management          |
| `frontend/src/components/Game/PokerTable.tsx` | Main poker table visualization component                    |
| `frontend/src/components/PlayerActions.tsx` | Game action buttons (bet, call, fold, raise)                    |
| `frontend/src/components/ActionHistory.tsx` | Game history and action log display                            |

#### API Routes
| File/Module                          | Purpose / Description                                                   |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `backend/src/routes/tables.ts`       | REST API endpoints for table operations (create, join, list)           |
| `backend/src/routes/players.ts`      | Player management API (authentication, profiles)                       |
| `backend/src/routes/testRoutes.ts`   | Testing endpoints with `test_` prefix for mock game management         |
| `backend/src/routes/chat.ts`         | Chat system API endpoints                                               |

---

### 🔁 Reusable Functions / Utilities

#### Backend Utilities
| Function / Method                | Location                              | Description / Usage                                      |
| -------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| `generateInitialTables()`        | `backend/src/utils/tableUtils.ts`     | Creates default poker tables with betting limits        |
| `evaluateHand(holeCards, board)` | `backend/src/services/handEvaluator.ts` | Determines poker hand strength and ranking            |
| `shuffleDeck()`                  | `backend/src/services/deckService.ts` | Fisher-Yates shuffle for card deck randomization        |
| `getNextToAct()`                 | `backend/src/services/seatManager.ts` | Determines next player in turn order                    |
| `calculateSidePots()`            | `backend/src/services/sidePotManager.ts` | Handles all-in scenarios with multiple pots          |
| `validateGameAction()`           | `backend/src/services/TableManager.ts` | Validates player actions (bet amounts, turn order)     |

#### Frontend Utilities
| Function / Method                | Location                              | Description / Usage                                      |
| -------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| `formatCurrency(amount)`         | `frontend/src/utils/formatUtils.ts`   | Formats chip amounts as currency ($1,000)              |
| `getTableDisplayName()`          | `frontend/src/utils/tableUtils.ts`    | Generates user-friendly table names                    |
| `connectSocket()`                | `frontend/src/services/socketService.ts` | Establishes WebSocket connection with reconnection  |
| `validateNickname()`             | `frontend/src/services/socketService.ts` | Validates user nickname format and availability      |

#### Test Utilities
| Function / Method                | Location                              | Description / Usage                                      |
| -------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| `createMockGame()`               | `backend/src/__tests__/testUtils.ts`  | Creates test game scenarios with players and states    |
| `simulatePlayerAction()`         | `backend/src/__tests__/testUtils.ts`  | Simulates poker actions for automated testing          |
| `takeScreenshot()`               | `selenium/step_definitions/*.js`      | Captures browser screenshots for visual test evidence  |

---

### 🧪 Test Scripts

#### Backend Tests (Jest)
| Test File                                    | Description / Coverage                              | Related Modules                 |
| -------------------------------------------- | --------------------------------------------------- | ------------------------------- |
| `backend/src/__tests__/handEvaluatorService.test.ts` | Tests poker hand evaluation accuracy     | `services/handEvaluator.ts`     |
| `backend/src/__tests__/seatManagement.test.ts`      | Validates player seating and turn order  | `services/seatManager.ts`       |
| `backend/src/__tests__/fivePlayerGameComplete.test.ts` | Complete 5-player game simulation      | `services/TableManager.ts`      |
| `backend/src/__tests__/services/TableManager.test.ts` | Core table management functionality    | `services/TableManager.ts`      |
| `backend/src/__tests__/deckService.test.ts`         | Card dealing and deck management tests   | `services/deckService.ts`       |

#### Frontend Tests (Jest + React Testing Library)
| Test File                                    | Description / Coverage                              | Related Modules                 |
| -------------------------------------------- | --------------------------------------------------- | ------------------------------- |
| `frontend/src/__tests__/App.test.tsx`       | Main application routing and component rendering    | `App.tsx`                       |
| `frontend/src/__tests__/socketService.test.ts` | WebSocket communication layer testing            | `services/socketService.ts`     |

#### UI Tests (Selenium + Cucumber)
| Test File                                    | Description / Coverage                              | Related Modules                 |
| -------------------------------------------- | --------------------------------------------------- | ------------------------------- |
| `selenium/features/2-player-focused-game.feature` | Complete 2-player UI verification           | `pages/GamePage.tsx`            |
| `selenium/features/2-player-complete-game-scenario.feature` | 2-player game scenarios             | `components/Game/PokerTable.tsx` |
| `selenium/features/5-player-complete-game-scenario.feature` | Multi-player game testing           | `services/socketService.ts`     |
| `selenium/step_definitions/2-player-focused-steps.js` | Focused UI verification steps            | UI verification utilities        |

---

### 🧷 Constants & Config

#### Backend Configuration
| Constant / Config Key            | File                                  | Description                                    |
| -------------------------------- | ------------------------------------- | ---------------------------------------------- |
| `DEFAULT_BUY_IN`                 | `backend/src/utils/tableUtils.ts`     | Default player buy-in amount ($100)           |
| `SMALL_BLIND`, `BIG_BLIND`       | `backend/src/services/blindManager.ts` | Default blind structure ($1, $2)             |
| `MAX_PLAYERS_PER_TABLE`          | `backend/src/services/TableManager.ts` | Maximum seats per table (9)                  |
| `WEBSOCKET_HEARTBEAT_INTERVAL`   | `backend/src/socketHandlers/consolidatedHandler.ts` | WebSocket ping interval   |
| `TEST_TABLE_PREFIX`              | `backend/src/routes/testRoutes.ts`     | Prefix for test data (`test_`)                |

#### Frontend Configuration
| Constant / Config Key            | File                                  | Description                                    |
| -------------------------------- | ------------------------------------- | ---------------------------------------------- |
| `SOCKET_URL`                     | `frontend/src/services/socketService.ts` | WebSocket server endpoint                   |
| `RECONNECT_ATTEMPTS`             | `frontend/src/services/socketService.ts` | Maximum reconnection attempts (5)           |
| `SCREENSHOT_DIR`                 | `selenium/step_definitions/*.js`       | Directory for UI test screenshots            |
| `DEFAULT_TIMEOUT`                | `selenium/config/selenium.config.js`   | Default test timeout (30000ms)              |

#### Database Schema Constants
| Constant / Config Key            | File                                  | Description                                    |
| -------------------------------- | ------------------------------------- | ---------------------------------------------- |
| `USER_ROLES`                     | `backend/prisma/schema.prisma`         | Player role enumeration                       |
| `GAME_PHASES`                    | `backend/src/types/shared.ts`          | Poker phases (preflop, flop, turn, river)    |
| `PLAYER_ACTIONS`                 | `backend/src/types/shared.ts`          | Valid actions (bet, call, fold, raise)       |

---

### 🧩 Shared UI Components

#### React Components
| Component / Template             | Location                              | Description                            |
| -------------------------------- | ------------------------------------- | -------------------------------------- |
| `PokerTable`                     | `frontend/src/components/Game/PokerTable.tsx` | Main table visualization        |
| `PlayerActions`                  | `frontend/src/components/PlayerActions.tsx` | Action button interface           |
| `ActionHistory`                  | `frontend/src/components/ActionHistory.tsx` | Game history display              |
| `OnlineList`                     | `frontend/src/components/OnlineList.tsx` | Online players and observers list    |
| `SeatSelectionDialog`            | `frontend/src/components/Game/SeatSelectionDialog.tsx` | Seat selection modal   |
| `GameStartCountdown`             | `frontend/src/components/GameStartCountdown.tsx` | Game start timer           |

#### Styling Components
| Component / Template             | Location                              | Description                            |
| -------------------------------- | ------------------------------------- | -------------------------------------- |
| `GlobalStyles`                   | `frontend/src/styles/GlobalStyles.tsx` | Application-wide CSS styles          |
| `theme`                          | `frontend/src/styles/theme.ts`        | Color palette and design tokens       |
| `styled.d.ts`                    | `frontend/src/styles/styled.d.ts`     | TypeScript definitions for styled-components |

---

### 🎯 Key Architectural Patterns

#### Table-Only Architecture
- All logic uses `table` and `tableId` as core entities (not `game` or `gameId`)
- WebSocket events follow `table:${tableId}` room pattern
- Database associations reference `tableId` as UUID strings

#### Real-time Communication
- Socket.io for bidirectional WebSocket events
- Unified event handling in `consolidatedHandler.ts`
- Client-side state synchronization via `socketService.ts`

#### Auto-Seat Testing Pattern
- UI tests use `/auto-seat?player=X&table=Y&seat=Z&buyin=100` URLs
- Bypasses lobby for direct game entry in automated tests
- Critical for reliable Selenium test execution

---

### 📌 Notes / To-Document

* [ ] Document `backend/src/services/MemoryCache.ts` caching strategies
* [ ] Add reusable WebSocket event emission patterns
* [ ] Create template for standard error responses in API routes
* [ ] Document screenshot comparison utilities in Selenium tests
* [ ] Add constants for poker hand rankings and card values
* [ ] Document the relationship between `LocationManager` and `TableManager`