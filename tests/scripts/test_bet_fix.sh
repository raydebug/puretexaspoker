#!/bin/bash

echo "🧪 Testing the fixed /api/test/bet endpoint..."
echo

echo "1. Checking initial action history for table 1..."
INITIAL=$(curl -s http://localhost:3001/api/tables/1/actions/history)
INITIAL_COUNT=$(echo "$INITIAL" | grep -o '"count":[0-9]*' | cut -d':' -f2)
echo "   Initial actions: $INITIAL_COUNT"

echo
echo "2. Making Player1 bet \$5 using fixed API..."
BET_RESULT=$(curl -s -X POST http://localhost:3001/api/test/bet \
  -H "Content-Type: application/json" \
  -d '{"tableId": 1, "playerName": "Player1", "amount": 5}')

BET_SUCCESS=$(echo "$BET_RESULT" | grep -o '"success":[^,]*' | cut -d':' -f2)
echo "   Bet API response: $BET_SUCCESS"

if [ "$BET_SUCCESS" = "false" ]; then
  echo "   Error details: $BET_RESULT"
fi

echo
echo "3. Checking action history after bet..."
FINAL=$(curl -s http://localhost:3001/api/tables/1/actions/history)
FINAL_COUNT=$(echo "$FINAL" | grep -o '"count":[0-9]*' | cut -d':' -f2)
echo "   Final actions: $FINAL_COUNT"

echo
echo "4. Looking for bet actions specifically..."
BET_ACTIONS=$(echo "$FINAL" | grep -o '"action":"bet"' | wc -l)
echo "   Bet actions found: $BET_ACTIONS"

echo
if [ "$BET_ACTIONS" -gt 0 ]; then
  echo "🎯 RESULT: ✅ SUCCESS - Bet action was saved!"
  echo "✅ The fix worked! Game history will now show post-preflop actions."
else
  echo "🎯 RESULT: ❌ FAILED - Bet action not saved"
  echo "❌ The fix did not work. Need to investigate further."
  echo "   Final response: $FINAL"
fi