#!/bin/bash

# Cleanup function to ensure all processes are terminated
cleanup() {
  local exit_code=$?
  echo "🧹 Cleaning up services (Exit code: $exit_code)..."
  
  # Kill background PIDs if they exist
  [ ! -z "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null || true
  [ ! -z "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
  
  # Force cleanup using the robust method to ensure everything is dead
  if [ -f "./scripts/force-cleanup-servers.sh" ]; then
    ./scripts/force-cleanup-servers.sh > /dev/null 2>&1
  fi
  
  echo "✅ Cleanup complete."
  exit $exit_code
}

# Register cleanup to run on script exit or interruption
trap cleanup EXIT INT TERM

# Force cleanup of any existing processes to prevent port conflicts
echo "🔥 Force closing all existing servers to prevent port conflicts..."
./scripts/force-cleanup-servers.sh

echo "🔪 Killing all Google Chrome instances..."
pkill -f "Google Chrome" || true
sleep 1

# Cleanup old logs
rm -f backend_log.txt frontend_log.txt

# Start backend
echo "🚀 Starting backend..."
cd backend
npm start > ../backend_log.txt 2>&1 &
BACKEND_PID=$!
cd ..

# Start frontend
echo "🚀 Starting frontend..."
cd frontend
npm start > ../frontend_log.txt 2>&1 &
FRONTEND_PID=$!
cd ..

# Enhanced server readiness verification
echo "⏳ Waiting for servers to be ready..."

# Check backend API endpoint with retry logic
BACKEND_READY=false
for i in {1..30}; do
    echo -n "."
    if curl -s --connect-timeout 2 --max-time 5 http://localhost:3001/api/tables > /dev/null 2>&1; then
        echo -e "\n✅ Backend API responding!"
        BACKEND_READY=true
        break
    else
        sleep 2
    fi
done

# Check frontend with retry logic
FRONTEND_READY=false
for i in {1..30}; do
    echo -n "."
    if curl -s --connect-timeout 2 --max-time 5 http://localhost:3000 > /dev/null 2>&1; then
        echo -e "\n✅ Frontend responding!"
        FRONTEND_READY=true
        break
    else
        sleep 2
    fi
done

# Verify both servers are ready
if [ "$BACKEND_READY" = false ] || [ "$FRONTEND_READY" = false ]; then
    echo -e "\n❌ One or both servers failed to start within time limit."
    echo "Check backend_log.txt and frontend_log.txt for details."
    exit 1
fi

echo "✅ Both servers are ready! Launching browser instances..."

# Function to open isolated browser instance
open_isolated_browser() {
    local url="$1"
    local name="$2"
    
    echo "🔌 Opening $name..."
    
    # Try to find Google Chrome for isolated sessions (best for manual testing multiple users)
    if [ -d "/Applications/Google Chrome.app" ]; then
        # Create a temp directory for this user's profile
        local profile_dir=$(mktemp -d -t "poker_profile_${name}")
        # Launch Chrome with new instance and specific user data dir
        open -n -a "Google Chrome" --args --user-data-dir="$profile_dir" --no-first-run "$url"
    else
        # Fallback to default browser (likely just a new tab, which shares LocalStorage)
        echo "⚠️  Google Chrome not found. Opening in default browser (Session conflict possible!)."
        open "$url"
    fi
    sleep 2
}

# Open browser instances for 3 players
# Using buyin=200 (max allowed)
open_isolated_browser "http://localhost:3000/auto-seat?player=Player1&table=1&seat=1&buyin=200" "Player 1"
open_isolated_browser "http://localhost:3000/auto-seat?player=Player2&table=1&seat=2&buyin=200" "Player 2"
open_isolated_browser "http://localhost:3000/auto-seat?player=Player3&table=1&seat=3&buyin=200" "Player 3"
# open_isolated_browser "http://localhost:3000/auto-seat?player=Player4&table=1&seat=4&buyin=200" "Player 4"
# open_isolated_browser "http://localhost:3000/auto-seat?player=Player5&table=1&seat=5&buyin=200" "Player 5"

# Open auto-start page to kick off the game once players are seated
echo "🎬 Opening Auto-Start Controller..."
# The controller doesn't strictly need isolation but good to have
open_isolated_browser "http://localhost:3000/auto-start-game?table=1&min=3&wait=60" "Auto-Start Controller"

echo ""
echo "✨ ENVIRONMENT READY! ✨"
echo "--------------------------------------------------------"
echo "3 Players have been launched in isolated Chrome instances."
echo "Buying-in with \$200 (Max)."
echo "--------------------------------------------------------"
echo "👉 Press Ctrl+C to stop the servers and cleanup."
echo "--------------------------------------------------------"

# Wait indefinitely until user terminates
wait
