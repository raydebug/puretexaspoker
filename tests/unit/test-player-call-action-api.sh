#!/bin/bash
# Quick test to verify Player4 CALL fix works

echo "🧪 Running quick verification test for Player4 CALL action fix..."

# Kill any existing processes
echo "🔥 Cleaning up old processes..."
killall -9 node 2>/dev/null
killall -9 chromedriver 2>/dev/null
pkill -f chrome 2>/dev/null
sleep 2

# Start backend and frontend
echo "🚀 Starting servers..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

cd "$PROJECT_ROOT/backend"
npm run build > /dev/null 2>&1
npm start > ../backend_test.log 2>&1 &
BACKEND_PID=$!

cd "$PROJECT_ROOT/frontend"
npm start > ../frontend_test.log 2>&1 &
FRONTEND_PID=$!

# Wait for servers
echo "⏳ Waiting for servers to start..."
sleep 15

# Test the API directly
echo "📝 Testing Player CALL action API..."

# Create a test table and players
curl -s -X POST http://localhost:3001/api/test/reset_database > /dev/null

echo "✅ Database reset"

# Test the player action endpoint
RESPONSE=$(curl -s -X POST http://localhost:3001/api/test_player_action/1 \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player1",
    "nickname": "Player1",
    "action": "CALL",
    "amount": "50"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Player CALL action API works"
  echo "Response: $RESPONSE"
else
  echo "❌ Player CALL action API failed"
  echo "Response: $RESPONSE"
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 1
fi

# Clean up
echo "🧹 Cleaning up..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
sleep 2

echo "✅ Quick verification test passed!"
