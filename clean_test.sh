#!/bin/bash

set -e

echo "🧹 Cleaning up all processes..."
pkill -9 -f "run_verification.sh" || true
pkill -9 -f "ts-node-dev" || true
pkill -9 -f "react-scripts" || true
pkill -9 -f "cucumber" || true
pkill -9 -f "chromedriver" || true
pkill -9 -f "chrome.*--" || true
sleep 5

echo "🧹 Cleaning up old test logs..."
rm -f /Volumes/Data/work/puretexaspoker/test_verification*.log
rm -f /Volumes/Data/work/puretexaspoker/test_run.log

echo "🧹 Cleaning up database..."
rm -f /Volumes/Data/work/puretexaspoker/backend/prisma/dev.db*

echo "⏳ Waiting for system to stabilize (30 seconds)..."
sleep 30

echo "✅ Clean start complete! Running verification test..."
cd /Volumes/Data/work/puretexaspoker
./run_verification.sh
