# Selenium Test Suite

This directory contains Selenium WebDriver-based tests that provide comprehensive cross-browser testing capabilities for the poker application.

## Structure

```
selenium/
├── config/
│   └── selenium.config.ts     # WebDriver configuration and management
├── features/                  # Cucumber feature files
├── step_definitions/          # Selenium WebDriver step definitions
│   ├── hooks.ts              # Before/After hooks for setup/teardown
│   ├── common-steps.ts       # Common step definitions
│   ├── authentication-steps.ts # Authentication-related steps
│   └── login-join-take-seats-steps.ts # Feature-specific steps
├── utils/
│   └── webdriverHelpers.ts   # WebDriver utility functions
├── reports/                  # Test execution reports
├── screenshots/              # Screenshots (taken on failures)
└── cucumber.config.js        # Cucumber configuration
```

## Installation

The Selenium dependencies are already included in the main package.json. To install:

```bash
npm install
```

## Running Tests

### Basic Commands

```bash
# Run all Selenium Cucumber tests (Chrome, default)
npm run test:selenium

# Run with specific browser
npm run test:selenium:chrome
npm run test:selenium:firefox  
npm run test:selenium:edge

# Run in headless mode
npm run test:selenium:headless

# Run in headed mode (with visible browser)
npm run test:selenium:headed

# Run all browsers
npm run test:selenium:all

# Run all tests
npm run test:all
```

### Environment Variables

You can customize the test execution with environment variables:

```bash
# Browser selection
BROWSER=chrome npm run test:selenium
BROWSER=firefox npm run test:selenium
BROWSER=edge npm run test:selenium

# Headless mode
HEADLESS=true npm run test:selenium
HEADLESS=false npm run test:selenium

# Custom URLs
BASE_URL=http://localhost:3000 npm run test:selenium
API_URL=http://localhost:3001 npm run test:selenium

# Window size
WINDOW_WIDTH=1920 WINDOW_HEIGHT=1080 npm run test:selenium

# Timeout settings
TIMEOUT=15000 npm run test:selenium
```

## Features

- **Cross-browser testing**: Supports Chrome, Firefox, and Edge
- **Headless execution**: Can run with or without visible browser
- **Screenshot capture**: Automatically captures screenshots on test failures
- **Flexible selectors**: Uses multiple fallback strategies to find elements
- **WebDriver management**: Automatic driver setup and cleanup
- **Parallel execution**: Can run multiple browsers in sequence or parallel
- **Rich reporting**: Generates JSON and pretty-formatted reports

## Browser Support

| Browser | Driver | Status |
|---------|--------|--------|
| Chrome  | chromedriver | ✅ Supported |
| Firefox | geckodriver  | ✅ Supported |
| Edge    | edgedriver   | ✅ Supported |

## Test Development

### Writing New Step Definitions

1. Add steps to appropriate file in `step_definitions/`
2. Use the `WebDriverHelpers` class for common operations
3. Follow the existing patterns for error handling and logging

Example:
```typescript
import { Given, When, Then } from '@cucumber/cucumber'
import { WebDriverHelpers } from '../utils/webdriverHelpers'

When('I click the {string} button', async function(buttonText: string) {
  const helpers: WebDriverHelpers = this.helpers
  await helpers.click(`button:contains("${buttonText}")`)
  console.log(`✅ Clicked ${buttonText} button`)
})
```

### Best Practices

1. **Use data-testid attributes** when possible for reliable element selection
2. **Implement fallback selectors** for robustness
3. **Add meaningful console logs** for debugging
4. **Handle timing issues** with appropriate waits
5. **Take screenshots** on important steps or failures
6. **Keep steps atomic** and reusable across features

## Troubleshooting

### Common Issues

1. **WebDriver not found**: Ensure chromedriver, geckodriver, or edgedriver are installed
2. **Element not found**: Check if element exists and is visible before interaction
3. **Timing issues**: Use explicit waits instead of sleep when possible
4. **Browser crashes**: Check if browser version is compatible with driver version

### Debug Mode

To debug tests:
1. Set `HEADLESS=false` to see browser actions
2. Add `await helpers.takeScreenshot('debug-point')` at investigation points
3. Use `await helpers.sleep(5000)` to pause execution
4. Check console logs for detailed step execution

## Integration with CI/CD

The Selenium tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Selenium Tests
  run: |
    npm run start &
    sleep 30
    npm run test:selenium:headless
    npm run test:selenium:firefox -- --headless
```

## Test Coverage

The Selenium test suite provides comprehensive coverage including:

- **User Authentication**: Login, registration, and session management
- **Table Management**: Joining tables, seat selection, and observer mode
- **Game Flow**: Complete poker game scenarios and betting actions
- **Real-time Features**: WebSocket communication and live updates
- **Error Handling**: Connection issues and recovery scenarios
- **Cross-browser Compatibility**: Consistent behavior across Chrome, Firefox, and Edge

The test suite uses Cucumber BDD features to ensure clear, maintainable test scenarios that can be understood by both technical and non-technical stakeholders. 