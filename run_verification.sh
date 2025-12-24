#!/bin/bash

# Kill any existing processes
echo "🧹 Cleaning up old processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Create necessary directories
echo "📂 Creating directories..."
mkdir -p selenium/reports
mkdir -p selenium/screenshots

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

# Manual wait loop for both services
echo "⏳ Waiting for services..."

# Wait for backend
for i in {1..60}; do
  if curl -s http://localhost:3001/api/test/test-route > /dev/null; then
    echo "✅ Backend is up!"
    break
  fi
  echo -n "."
  sleep 1
done

# Wait for frontend (simple TCP check via nc or curl)
for i in {1..60}; do
  if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is up!"
    break
  fi
  echo -n "."
  sleep 1
done

if [ $? -ne 0 ]; then
  echo "❌ Backend failed to start. Check backend_log.txt"
  cat backend_log.txt
  exit 1
fi
echo "✅ Backend started successfully"

# Run tests
echo "🧪 Running Cucumber tests..."
cd selenium
export HEADLESS=true
export SELENIUM_WAIT_TIMEOUT=30000
export NETWORK_TIMEOUT=30000

npx cucumber-js features/5-player-comprehensive-game-scenario.feature \
  --require step_definitions/2-player-game-steps.js \
  --require step_definitions/5-player-comprehensive-steps.js \
  --require step_definitions/hooks.js \
  --format @cucumber/pretty-formatter \
  --format json:reports/cucumber-report.json

TEST_EXIT_CODE=$?

cd ..

# Report results
echo "📊 Test execution finished with exit code $TEST_EXIT_CODE"

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ Tests PASSED"
else
  echo "❌ Tests FAILED"
fi

# Check for report
if [ -f "selenium/reports/cucumber-report.json" ]; then
  echo "✅ JSON report generated: selenium/reports/cucumber-report.json"
else
  echo "❌ JSON report missing"
fi

# Check for screenshots
SCREENSHOT_COUNT=$(find selenium/screenshots -name "*.png" | wc -l)
echo "📸 Found $SCREENSHOT_COUNT screenshots in selenium/screenshots"

# Clean up services
echo "🧹 Stopping services..."
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null

exit $TEST_EXIT_CODE
