# Test Reports

This directory contains individual test reports for each cucumber feature file.

## Report Files

Each feature file generates a corresponding report file:
- `{feature-name}-report.json` - Individual feature test results
- `current-test-report.json` - Current test run summary
- `previous-test-report.json` - Previous test run summary

## Report Structure

Each feature report contains:
- Feature name and timestamp
- Test status (PASS/FAIL)
- Duration and error details
- Summary statistics

## Git Integration

All report files are automatically:
1. Generated after each test run
2. Added to git repository
3. Committed with descriptive messages
4. Available for comparison between runs

## Usage

Reports are automatically generated when running tests with:
```bash
node selenium/run-tests-with-reporting.js [command]
```

The system will:
- Track each scenario's pass/fail status
- Generate detailed reports
- Compare with previous test runs
- Wait for user input after completion
