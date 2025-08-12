# Fixed 5-Player Test Command

## 🛠️ **Improvements Made:**

1. **Increased Timeout**: Added 30-second timeout for browser setup step
2. **Better Browser Management**: Added delays between browser creations to prevent resource exhaustion
3. **Improved Navigation**: Added retry logic with 3 attempts and longer waits
4. **Missing Step Definitions**: Added 30+ missing step definitions for poker actions
5. **Error Handling**: Better error handling and logging

## 🎯 **Enhanced 5-Player Test Command:**

```bash
HEADLESS=false \
SELENIUM_WAIT_TIMEOUT=30000 \
NETWORK_TIMEOUT=30000 \
npx cucumber-js features/5-player-comprehensive-game-scenario.feature \
  --require step_definitions/2-player-game-steps.js \
  --require step_definitions/5-player-comprehensive-steps.js \
  --require step_definitions/hooks.js
```

## 🔧 **Key Fixes:**

### **Timeout Issues:**
- Browser setup step now has 30-second timeout instead of 5 seconds
- Navigation retries with 3 attempts and 2-second delays
- Extended wait times for page loading

### **Resource Management:**
- 1-second delay between browser creations
- Better cleanup of failed browser instances
- Improved error handling for connection issues

### **Missing Step Definitions:**
Added support for:
- Complex poker actions (check-raise, slowplay, trap, etc.)
- Multi-way pot scenarios
- All-in situations with multiple players
- Flop/turn/river card dealing
- Position-based actions (UTG, CO, BTN, SB, BB)
- Pot verification with player counts

## ✅ **Expected Results:**
- **Browser Setup**: Should create 5 browser instances successfully
- **Navigation**: Should navigate all players to game page with retries
- **Step Definitions**: No more "undefined" errors for common poker actions
- **Screenshots**: Should capture failure screenshots if issues occur
- **Better Error Messages**: More informative logging for debugging

## 🔍 **If Still Having Issues:**
1. **Check System Resources**: Close other browser instances
2. **Frontend Server**: Ensure `http://localhost:3000` is running
3. **Backend Server**: Ensure `http://localhost:3001` is running
4. **Memory**: 5 browsers require significant RAM (~2GB+)

**The improvements should resolve the timeout and navigation issues you were experiencing!**