#!/bin/bash

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# =============================================================================
# FORCE CLOSE ALL SERVERS - Enhanced Port Conflict Resolution
# =============================================================================

echo "🔥 Force closing all existing servers to prevent port conflicts..."

# Kill specific Node.js processes by pattern
echo "🗑️ Killing Node.js server processes..."
pkill -f "ts-node src/server.ts" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true

# Force kill processes using target ports
echo "🗑️ Force killing processes on ports 3000 and 3001..."

# Kill anything on port 3000 (frontend)
PORT_3000_PID=$(lsof -ti:3000 2>/dev/null || true)
if [ ! -z "$PORT_3000_PID" ]; then
    echo "🔥 Killing process $PORT_3000_PID on port 3000"
    kill -9 $PORT_3000_PID 2>/dev/null || true
fi

# Kill anything on port 3001 (backend)
PORT_3001_PID=$(lsof -ti:3001 2>/dev/null || true)
if [ ! -z "$PORT_3001_PID" ]; then
    echo "🔥 Killing process $PORT_3001_PID on port 3001"
    kill -9 $PORT_3001_PID 2>/dev/null || true
fi

# Kill any zombie webpack or development server processes
echo "🗑️ Cleaning up webpack and dev server processes..."
pkill -f "webpack" 2>/dev/null || true
pkill -f "webpack-dev-server" 2>/dev/null || true
pkill -f "@esbuild" 2>/dev/null || true

# Wait for ports to be freed
echo "⏳ Waiting for ports to be freed..."
sleep 3

# Verify ports are free
echo "🔍 Verifying ports are available..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️ WARNING: Port 3000 still in use after cleanup!"
    lsof -Pi :3000 -sTCP:LISTEN
else
    echo "✅ Port 3000 is free"
fi

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️ WARNING: Port 3001 still in use after cleanup!"
    lsof -Pi :3001 -sTCP:LISTEN
else
    echo "✅ Port 3001 is free"
fi

echo "✅ Server cleanup complete!"

echo "🚀 Starting backend server..."
# Start backend in background
cd "$PROJECT_ROOT/backend" && npm start &
BACKEND_PID=$!

echo "🚀 Starting frontend server..."
# Start frontend in background
cd "$PROJECT_ROOT/frontend" && npm start &
FRONTEND_PID=$!

echo "⏳ Waiting for servers to be ready..."
# Give the servers a moment to fully start
sleep 5

# Enhanced server readiness verification
echo "🔍 Testing server connections with comprehensive checks..."

# Check backend API endpoint with retry logic
BACKEND_READY=false
for i in {1..10}; do
    echo "🔍 Backend check attempt $i/10..."
    if curl -s --connect-timeout 2 --max-time 5 http://localhost:3001/api/tables > /dev/null 2>&1; then
        echo "✅ Backend API responding!"
        BACKEND_READY=true
        break
    else
        echo "⏳ Backend not ready, waiting 2 seconds..."
        sleep 2
    fi
done

# Check frontend with retry logic
FRONTEND_READY=false
for i in {1..10}; do
    echo "🔍 Frontend check attempt $i/10..."
    if curl -s --connect-timeout 2 --max-time 5 http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend responding!"
        FRONTEND_READY=true
        break
    else
        echo "⏳ Frontend not ready, waiting 2 seconds..."
        sleep 2
    fi
done

# Verify both servers are ready
if [ "$BACKEND_READY" = true ] && [ "$FRONTEND_READY" = true ]; then
    echo "✅ Both servers are ready and responding!"
    
    # Additional verification: Test table creation API
    echo "🔍 Testing table creation API..."
    if curl -s --connect-timeout 3 --max-time 5 http://localhost:3001/api/tables/1 > /dev/null 2>&1; then
        echo "✅ Table API is functional!"
        SERVER_READY=true
    else
        echo "⚠️ Table API not responding, using wait-on as fallback..."
        npx wait-on http://localhost:3001/api/tables http://localhost:3000 --timeout 15000
        SERVER_READY=$?
    fi
else
    echo "⚠️ One or both servers not responding, using wait-on as fallback..."
    npx wait-on http://localhost:3001/api/tables http://localhost:3000 --timeout 20000
    SERVER_READY=$?
fi

if [ "$SERVER_READY" = true ] || [ $SERVER_READY -eq 0 ]; then
    echo "✅ Both servers are ready! Starting tests..."
    
    # Run tests
    cd "$PROJECT_ROOT/selenium"
    HEADLESS=true SELENIUM_WAIT_TIMEOUT=30000 NETWORK_TIMEOUT=30000 \
    npx cucumber-js features/5-player-comprehensive-game-scenario.feature \
      --require step_definitions/2-player-game-steps.js \
      --require step_definitions/5-player-comprehensive-steps.js \
      --require step_definitions/hooks.js \
      --format @cucumber/pretty-formatter
    
    TEST_EXIT_CODE=$?
else
    echo "❌ Servers failed to start within 30 seconds"
    TEST_EXIT_CODE=1
fi

# =============================================================================
# ENHANCED CLEANUP - Ensure Complete Server Shutdown
# =============================================================================

echo "🧹 Enhanced cleanup - ensuring all processes are terminated..."

# Kill background PIDs first
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true

# Force cleanup using the same method as startup
echo "🗑️ Force killing any remaining processes..."

# Kill specific Node.js processes by pattern
pkill -f "ts-node src/server.ts" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true

# Force kill processes using target ports
PORT_3000_PID=$(lsof -ti:3000 2>/dev/null || true)
if [ ! -z "$PORT_3000_PID" ]; then
    echo "🔥 Final cleanup: Killing process $PORT_3000_PID on port 3000"
    kill -9 $PORT_3000_PID 2>/dev/null || true
fi

PORT_3001_PID=$(lsof -ti:3001 2>/dev/null || true)
if [ ! -z "$PORT_3001_PID" ]; then
    echo "🔥 Final cleanup: Killing process $PORT_3001_PID on port 3001"
    kill -9 $PORT_3001_PID 2>/dev/null || true
fi

# Kill any remaining zombie processes
pkill -f "webpack" 2>/dev/null || true
pkill -f "webpack-dev-server" 2>/dev/null || true
pkill -f "@esbuild" 2>/dev/null || true
pkill -f "cucumber" 2>/dev/null || true
pkill -f "selenium" 2>/dev/null || true

echo "✅ Enhanced cleanup complete!"

exit $TEST_EXIT_CODE