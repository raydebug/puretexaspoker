#!/bin/bash

# Start backend in background
cd /Volumes/Data/work/puretexaspoker/backend
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID"

# Wait for backend to be ready
sleep 10

# Run the test
cd /Volumes/Data/work/puretexaspoker
node test_blinds.js

# Kill backend
kill $BACKEND_PID 2>/dev/null
