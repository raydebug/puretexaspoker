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
  echo "___COMMAND_TERMINATED___"
  exit $exit_code
}

# Register cleanup to run on script exit or interruption
trap cleanup EXIT INT TERM

# Force cleanup of any existing processes to prevent port conflicts
echo "🔥 Force closing all existing servers to prevent port conflicts..."
./scripts/force-cleanup-servers.sh

# Cleanup old logs and reports
echo "🧹 Cleaning up old logs and reports..."
rm -f backend_log.txt frontend_log.txt selenium/output.log
rm -rf selenium/reports/*.json
rm -rf selenium/screenshots/*.png

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

# Enhanced server readiness verification
echo "⏳ Waiting for servers to be ready..."

# Check backend API endpoint with retry logic
BACKEND_READY=false
for i in {1..20}; do
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
for i in {1..20}; do
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

echo "✅ Both servers are ready! Starting tests..."

# Run tests
echo "🧪 Running Cucumber tests..."
cd selenium
# export HEADLESS=true (now default in test utilities)
export SELENIUM_WAIT_TIMEOUT=30000
export NETWORK_TIMEOUT=30000

# Added timeout command to ensure cucumber itself doesn't hang indefinitely
# Using 10 minutes (600 seconds) as a safety margin
timeout 600 npx cucumber-js features/5-player-comprehensive-game-scenario.feature \
  --require step_definitions/**/*.js \
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

# No marker here, handled by EXIT trap if we exit normally or via cleanup
exit $TEST_EXIT_CODE
