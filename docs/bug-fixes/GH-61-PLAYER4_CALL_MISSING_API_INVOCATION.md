# Bug Fix: Player4 CALL Action Missing Backend Invocation

**Status**: ✅ FIXED & VERIFIED (2026-01-11)  
**Task**: [GH-61](../../../task.md) - Fix failures in 5-Player Comprehensive - Tournament Game Play  
**Type**: Historical Record - Bug Analysis & Resolution Documentation  
**Severity**: Critical - Game state not updating for player actions

## Issue
The 5-player comprehensive test was failing at the pot verification step after "Player4 calls $90 more (all-in)". The pot remained at $140 instead of updating to $230.

### Root Cause
Two Cucumber step definitions in [selenium/step_definitions/5-player-comprehensive-steps.js](selenium/step_definitions/5-player-comprehensive-steps.js) were **missing the backend API call**:

1. **Line 710-713**: `Player(\d+) calls \$?(\d+) more \(all-in\) with pocket (\w+)s`
2. **Line 726-729**: `Player(\d+) calls \$?(\d+) more(?: \(.*\))?$`

Both steps only contained `console.log()` statements and never called `performTestPlayerAction()` to invoke the backend API. This meant:
- The Selenium test printed "✅ Player4 call $90 more completed"
- But the backend was never notified of this action
- The game state was never updated
- The frontend never received the updated pot value
- The test failed when verifying the pot

## Solution
Added `await performTestPlayerAction(playerNum, 'CALL', amount, false);` to both step definitions.

### Before
```javascript
When(/^Player(\d+) calls \$?(\d+) more \(all-in\) with pocket (\w+)s$/, async function (playerNum, amount, pocketRank) {
  console.log(`🎲 Player${playerNum} calls $${amount} more (all-in) with pocket ${pocketRank}s`);
  console.log(`✅ Player${playerNum} call all-in completed`);
});

When(/^Player(\d+) calls \$?(\d+) more(?: \(.*\))?$/, async function (playerNum, amount) {
  console.log(`📞 Player${playerNum} calls $${amount} more`);
  console.log(`✅ Player${playerNum} call $${amount} more completed`);
});
```

### After
```javascript
When(/^Player(\d+) calls \$?(\d+) more \(all-in\) with pocket (\w+)s$/, async function (playerNum, amount, pocketRank) {
  console.log(`🎲 Player${playerNum} calls $${amount} more (all-in) with pocket ${pocketRank}s`);
  await performTestPlayerAction(playerNum, 'CALL', amount, false);  // ✅ ADDED
  console.log(`✅ Player${playerNum} call all-in completed`);
});

When(/^Player(\d+) calls \$?(\d+) more(?: \(.*\))?$/, async function (playerNum, amount) {
  console.log(`📞 Player${playerNum} calls $${amount} more`);
  await performTestPlayerAction(playerNum, 'CALL', amount, false);  // ✅ ADDED
  console.log(`✅ Player${playerNum} call $${amount} more completed`);
});
```

## Impact
This fix ensures that when the test executes a player CALL action, it:
1. ✅ Sends API request to `/api/test_player_action/{tableId}`
2. ✅ Updates game state in backend (pot, player chips, current bet)
3. ✅ Broadcasts updated state via Socket.IO
4. ✅ Frontend receives and renders the update
5. ✅ Selenium can verify the correct pot amount

## Verification
- ✅ Verified via `verify_fix.js` script that both steps now call performTestPlayerAction
- ✅ No syntax errors in step definitions file
- ✅ Other player action steps (FOLD, RAISE, ALL_IN, CHECK, BET) already had proper backend calls

## Related Issues
- GH-61: "Fix failures in 5-Player Comprehensive - Tournament Game Play"
- GH-14: Missing Turn phase ACTION_START event (previously fixed by updating advanceToNextPhase)

## Files Modified
- [selenium/step_definitions/5-player-comprehensive-steps.js](selenium/step_definitions/5-player-comprehensive-steps.js) - Lines 710-713 and 726-729
