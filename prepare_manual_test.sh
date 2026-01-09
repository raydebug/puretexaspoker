#!/bin/bash

# Cleanup function
cleanup() {
    echo "🧹 Stopping services forcefully..."
    kill -9 $BACKEND_PID 2>/dev/null || true
    kill -9 $FRONTEND_PID 2>/dev/null || true
    
    # Force kill anything remaining on the ports
    lsof -ti:3000,3001 | xargs kill -9 2>/dev/null || true
    
    echo "✅ Services stopped."
    exit
}

# Trap SIGINT (Ctrl+C)
trap cleanup SIGINT

echo "🚀 Preparing Manual Test Environment..."

# Cleaning up old processes
echo "🧹 Cleaning up old processes..."
pkill -f "node server.js" 2>/dev/null
pkill -f "react-scripts start" 2>/dev/null

# Create necessary directories
echo "📂 Creating directories..."
mkdir -p selenium/screenshots
mkdir -p selenium/reports

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

echo "⏳ Waiting for services to be ready..."

# Wait for backend
echo "   Waiting for Backend (3001)..."
max_attempts=30
attempt=1
while ! curl -s http://localhost:3001/api/health > /dev/null; do
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ Backend failed to start."
        cleanup
    fi
    printf "."
    sleep 2
    attempt=$((attempt+1))
done
echo "✅ Backend is up!"

# Wait for frontend (just checking port)
echo "   Waiting for Frontend (3000)..."
attempt=1
while ! nc -z localhost 3000; do
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ Frontend failed to start."
        cleanup
    fi
    printf "."
    sleep 2
    attempt=$((attempt+1))
done
echo "✅ Frontend is up!"

echo "✅ Services started successfully."
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"

# Run the manual setup script
echo "⚡ Launching 6 Browser Instances..."
cd selenium
export HEADLESS=false
node manual_setup.js

# Wait for user to finish (manual_setup.js keeps running until Ctrl+C)
wait $! 2>/dev/null

cleanup
