# Project Guidelines: Texas Hold'em Poker

This document serves as the unified rulebook for project development, testing, and communication.

## 1. Development Workflow
- **State the Goal:** Summarize the target of each interaction (bug/feature/design).
- **Reuse First:** Scan the project to avoid duplication. Reuse existing methods, constants, and helpers.
- **Plan → Implement:** Identify issues, design a solution, then implement.
- **Commit Practices:** Git commit each improvement with a message ≤ 200 characters. Keep communication, documentation, and code tidy/compact.
- **Documentation:** Maintain `PROJECT_OVERVIEW.md`, `test_results_history.md`, and `API_DOCS.md`. Update `README.md` and `task.md` with significant changes.

## 2. Language & Communication Policy
- **Communication Language:** Use **Chinese** for all direct communication with the user.
- **Code & Documentation:** All code, comments, documentation (artifacts, plans, logs), and commit messages must be in **English**. Never use Chinese in the codebase or project documents.

## 3. Testing Policy (Strict)
- **Test Integrity:** Never change or bypass existing tests without explicit permission.
- **Feature Files:** Never modify a `.feature` file just to make a failing test pass. Fix the underlying code first.
- **Script Wording:** Cucumber steps must be simple, accurate, and specific (e.g., mention specific error messages).
- **Manual Verification:** Add debug logging and diagnostics when tests fail.

### 3.1 UI & Screenshot Verification
- **One-to-One Logs:** Each `x.feature` must have a corresponding `x_screenshots.md`.
- **Screenshot Evidence:** Take screenshots for both pass and fail results. Never remove previously passed entries in the log.
- **Browser Policy:** Reuse existing browser instances unless unstable. Cleanup Chrome instances (`kill -9`) before starting a new suite.

## 4. Technical Architecture & Practices
### 4.1 Table-Only Architecture
- Use `table` and `tableId` as the core entity for all poker state, seating, and actions.
- Eliminate all references to `game` or `gameId`.

### 4.2 Logging Standards
- **Principle:** Ultra-compact, information-dense using full words.
- **Format:** `[LEVEL] Time Component: Event | Data1:Value1 Data2:Value2`
- **Components:** `AUTH`, `SOCKET`, `GAME`, `DATABASE`, `API`, `SEAT`, `POT`, `CARD`.

### 4.3 Database & State
- **IDs:** Player records and tables must use UUID strings.
- **Seat Management:** Backend must prevent duplicate assignments. Frontend must handle `alreadySeated` as a success.

### 4.4 WebSocket Core Events
- **Backend Emits:** `authenticated`, `tableJoined`, `seatTaken`.
- **Frontend Emits:** `authenticate`, `joinTable`, `takeSeat`.

## 5. Infrastructure Management
- **Ports:** Run the backend on port 3001. Handle `EADDRINUSE` by restarting servers.
- **Server Execution:** Run servers in separate terminals; do not kill them within test scripts.
