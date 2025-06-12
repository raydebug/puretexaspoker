# Manual Test: Observer to Player Transition

## 🎯 Purpose
This test demonstrates that the "Invalid session data" bug has been fixed and shows the observer-to-player transition working correctly.

## 🚀 Prerequisites
1. Both servers running:
   - Backend: http://localhost:3001
   - Frontend: http://localhost:3000

## 📝 Test Steps

### Step 1: Open Browser
1. Open Chrome/Firefox
2. Navigate to: `http://localhost:3000`
3. Open Developer Console (F12) to see logs

### Step 2: Join Table as Observer
1. Look for "Join" or "Join Table" buttons
2. Click on any available table's "Join" button
3. Enter nickname: `TestUser123`
4. Click "Join" or "Enter"

**Expected**: You should navigate to `/game/X` page

### Step 3: Verify Observer Status
1. Look for observer count (should show 1)
2. Look for your username in observers list
3. Look for available seats (empty seats should be clickable)

**Expected**: You appear as an observer, not as a player

### Step 4: Take a Seat
1. Click on any empty seat
2. **Wait for buy-in dialog** (this is where the bug used to occur)
3. Enter buy-in amount: `500`
4. Click "Confirm" or "Take Seat"

**Expected**: 
- ✅ NO "Invalid session data" error
- ✅ You move from observers list to players list  
- ✅ Your username appears in the seat
- ✅ Observer count decreases by 1

### Step 5: Verify Player Status
1. Observer count should be 0 (or decreased by 1)
2. Your username should appear in the seat you selected
3. You should have chips (500) displayed
4. You are now a player, not an observer

## 🐛 What to Watch For

### ✅ SUCCESS Indicators:
- Smooth transition from observer to player
- No error messages
- Username moves from observers list to seat
- Observer count updates correctly

### ❌ FAILURE Indicators:
- "Invalid session data. Please rejoin the table." error
- User disconnects when trying to take seat
- Username disappears entirely
- Observer count doesn't update

## 🔧 Backend Logging
Watch the backend console for these logs:
```
DEBUG: Backend received takeSeat event - seatNumber: X, buyIn: Y
DEBUG: Backend session data check: {gameId: true, tableId: true, ...}
DEBUG: Backend successfully seated player in seat X
```

If you see "Invalid session data" in the logs, the bug is still present.

## 📸 Screenshots
If testing with Cypress, screenshots are saved in:
`cypress/screenshots/observer-to-player-transition.cy.ts/`

## 🎉 Expected Final State
- User successfully seated at poker table
- Transition from observer to player complete
- No session data errors
- Ready to play poker!

---

## 🔄 Restart Servers if Needed
```bash
# Kill existing processes
pkill -f "npm start"

# Start backend
cd backend && npm start &

# Start frontend  
cd frontend && npm start &
``` 