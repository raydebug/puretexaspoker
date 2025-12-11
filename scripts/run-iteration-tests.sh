#!/bin/bash
# TDD Iteration Test Runner
# Executes backend tests followed by Selenium UI tests

set -e  # Exit on any error

echo "🔄 Starting TDD Iteration Test Cycle..."
echo "================================================"

# Function to print colored output
print_status() {
    case $1 in
        "info") echo -e "\033[34mℹ️  $2\033[0m" ;;
        "success") echo -e "\033[32m✅ $2\033[0m" ;;
        "error") echo -e "\033[31m❌ $2\033[0m" ;;
        "warning") echo -e "\033[33m⚠️  $2\033[0m" ;;
    esac
}

# Function to run backend tests
run_backend_tests() {
    print_status "info" "Step 1: Running Backend Tests..."
    
    cd backend
    
    # Check if backend dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_status "warning" "Installing backend dependencies..."
        npm install
    fi
    
    # Run backend tests with coverage
    print_status "info" "Executing Jest tests..."
    npm test -- --coverage --watchAll=false
    
    BACKEND_EXIT_CODE=$?
    
    if [ $BACKEND_EXIT_CODE -ne 0 ]; then
        print_status "error" "Backend tests failed with exit code $BACKEND_EXIT_CODE"
        print_status "error" "Fix failing tests and retry iteration"
        exit 1
    fi
    
    print_status "success" "Backend tests passed!"
    cd ..
}

# Function to run Selenium UI tests
run_selenium_tests() {
    print_status "info" "Step 2: Running Selenium UI Tests..."
    
    # Check if servers are running
    if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
        print_status "warning" "Backend server not running. Starting servers..."
        npm run dev &
        SERVER_PID=$!
        
        # Wait for servers to start
        print_status "info" "Waiting for servers to start..."
        sleep 10
        
        # Check again
        if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
            print_status "error" "Failed to start backend server"
            kill $SERVER_PID 2>/dev/null || true
            exit 1
        fi
    fi
    
    cd selenium
    
    # Check if selenium dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_status "warning" "Installing Selenium dependencies..."
        npm install
    fi
    
    # Run Selenium tests in headless mode for CI
    print_status "info" "Executing Selenium UI tests..."
    npm run test:selenium:headless
    
    SELENIUM_EXIT_CODE=$?
    
    if [ $SELENIUM_EXIT_CODE -ne 0 ]; then
        print_status "error" "Selenium UI tests failed with exit code $SELENIUM_EXIT_CODE"
        print_status "error" "Fix failing UI tests and retry iteration"
        # Clean up server if we started it
        if [ ! -z "$SERVER_PID" ]; then
            kill $SERVER_PID 2>/dev/null || true
        fi
        exit 1
    fi
    
    print_status "success" "Selenium UI tests passed!"
    
    # Clean up server if we started it
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
        print_status "info" "Stopped test servers"
    fi
    
    cd ..
}

# Function to display test summary
display_summary() {
    echo "================================================"
    print_status "success" "🎉 TDD ITERATION CYCLE COMPLETE!"
    echo ""
    print_status "success" "✅ Backend Tests: PASSED"
    print_status "success" "✅ Selenium UI Tests: PASSED"
    echo ""
    print_status "info" "Ready for git commit. Use:"
    echo "  git add ."
    echo "  git commit -m \"[ITERATION-N] [TYPE]: Your commit message\""
    echo "================================================"
}

# Main execution
main() {
    # Check if we're in the project root
    if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "selenium" ]; then
        print_status "error" "Please run this script from the project root directory"
        exit 1
    fi
    
    # Run tests in sequence
    run_backend_tests
    run_selenium_tests
    display_summary
}

# Handle script interruption
trap 'print_status "warning" "Test cycle interrupted"; exit 1' INT TERM

# Execute main function
main "$@"