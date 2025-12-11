#!/bin/bash

# =============================================================================
# FORCE CLEANUP SERVERS - Standalone Port Conflict Resolution
# =============================================================================
# This script force-kills all development servers and frees ports 3000 and 3001
# Use this when getting "Port already in use" errors
# =============================================================================

echo "🔥 FORCE CLEANUP: Terminating all development servers..."

# =============================================================================
# STEP 1: Kill Node.js processes by pattern
# =============================================================================

echo "🗑️ Killing Node.js server processes by pattern..."
pkill -f "ts-node src/server.ts" 2>/dev/null && echo "  ✅ Killed backend servers" || echo "  ℹ️ No backend servers running"
pkill -f "react-scripts start" 2>/dev/null && echo "  ✅ Killed React dev servers" || echo "  ℹ️ No React dev servers running"
pkill -f "vite" 2>/dev/null && echo "  ✅ Killed Vite dev servers" || echo "  ℹ️ No Vite dev servers running"
pkill -f "npm start" 2>/dev/null && echo "  ✅ Killed npm start processes" || echo "  ℹ️ No npm start processes running"

# =============================================================================
# STEP 2: Force kill processes using target ports
# =============================================================================

echo "🔥 Force killing processes on target ports..."

# Kill anything on port 3000 (frontend)
PORT_3000_PID=$(lsof -ti:3000 2>/dev/null || true)
if [ ! -z "$PORT_3000_PID" ]; then
    echo "  🔥 Found process $PORT_3000_PID on port 3000 - killing..."
    kill -9 $PORT_3000_PID 2>/dev/null || true
    echo "  ✅ Port 3000 process terminated"
else
    echo "  ✅ Port 3000 is already free"
fi

# Kill anything on port 3001 (backend)  
PORT_3001_PID=$(lsof -ti:3001 2>/dev/null || true)
if [ ! -z "$PORT_3001_PID" ]; then
    echo "  🔥 Found process $PORT_3001_PID on port 3001 - killing..."
    kill -9 $PORT_3001_PID 2>/dev/null || true
    echo "  ✅ Port 3001 process terminated"
else
    echo "  ✅ Port 3001 is already free"
fi

# =============================================================================
# STEP 3: Kill webpack and build tool processes
# =============================================================================

echo "🗑️ Cleaning up build tool processes..."
pkill -f "webpack" 2>/dev/null && echo "  ✅ Killed webpack processes" || echo "  ℹ️ No webpack processes running"
pkill -f "webpack-dev-server" 2>/dev/null && echo "  ✅ Killed webpack-dev-server" || echo "  ℹ️ No webpack-dev-server running"
pkill -f "@esbuild" 2>/dev/null && echo "  ✅ Killed esbuild processes" || echo "  ℹ️ No esbuild processes running"

# =============================================================================
# STEP 4: Kill test-related processes
# =============================================================================

echo "🗑️ Cleaning up test processes..."
pkill -f "cucumber" 2>/dev/null && echo "  ✅ Killed cucumber processes" || echo "  ℹ️ No cucumber processes running"
pkill -f "selenium" 2>/dev/null && echo "  ✅ Killed selenium processes" || echo "  ℹ️ No selenium processes running"
pkill -f "chromedriver" 2>/dev/null && echo "  ✅ Killed chromedriver processes" || echo "  ℹ️ No chromedriver processes running"

# =============================================================================
# STEP 5: Wait and verify
# =============================================================================

echo "⏳ Waiting for processes to terminate..."
sleep 3

echo "🔍 Verifying ports are available..."

# Check port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  ⚠️ WARNING: Port 3000 still in use!"
    echo "  Process details:"
    lsof -Pi :3000 -sTCP:LISTEN | head -5
    exit 1
else
    echo "  ✅ Port 3000 is free and available"
fi

# Check port 3001
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  ⚠️ WARNING: Port 3001 still in use!"
    echo "  Process details:"
    lsof -Pi :3001 -sTCP:LISTEN | head -5
    exit 1
else
    echo "  ✅ Port 3001 is free and available"
fi

# =============================================================================
# SUCCESS
# =============================================================================

echo ""
echo "🎉 SUCCESS: All servers cleaned up successfully!"
echo "   📊 Port 3000 (frontend): Available"
echo "   📊 Port 3001 (backend): Available"
echo "   🚀 Ready to start fresh development servers"
echo ""