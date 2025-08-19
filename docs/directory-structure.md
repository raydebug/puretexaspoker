# Project Directory Structure

This document describes the cleaned and organized directory structure of the Pure Texas Poker project.

## Root Directory Structure

```
puretexaspoker/
├── backend/                    # Backend server application
│   ├── src/                   # Source code
│   ├── prisma/                # Database schema and migrations
│   ├── coverage/              # Test coverage reports
│   └── dist/                  # Built output
├── frontend/                   # Frontend React application
│   ├── src/                   # Source code
│   ├── public/                # Static assets
│   └── dist/                  # Built output
├── docs/                       # Project documentation
├── tests/                      # Testing infrastructure
│   ├── manual/                # Manual test scripts
│   └── scripts/               # Test automation scripts
├── selenium/                   # UI/E2E test automation
│   ├── features/              # Cucumber feature files
│   ├── step_definitions/      # Test step implementations
│   ├── screenshots/           # Test evidence screenshots
│   └── reports/               # Test execution reports
├── scripts/                    # Project utility scripts
├── logs/                       # Application and test logs
├── tools/                      # Development and debugging tools
│   └── debug/                 # Debug scripts
├── config/                     # Configuration files
└── node_modules/              # Dependencies
```

## Directory Purposes

### `/backend/`
Backend server application using Express.js, Socket.IO, and Prisma ORM.
- `src/` - TypeScript source code
- `prisma/` - Database schema and migrations
- `coverage/` - Jest test coverage reports
- `dist/` - Compiled JavaScript output

### `/frontend/`
React frontend application with TypeScript and Vite.
- `src/` - React components and application logic
- `public/` - Static assets served by the web server
- `dist/` - Built production assets

### `/docs/`
Centralized project documentation including:
- API documentation
- Design documents
- User guides
- Technical specifications

### `/tests/`
Testing infrastructure and test scripts:
- `manual/` - Manual testing scripts and utilities
- `scripts/` - Automated test execution scripts

### `/selenium/`
End-to-end UI testing with Selenium WebDriver and Cucumber:
- `features/` - Gherkin feature files
- `step_definitions/` - JavaScript step implementations
- `screenshots/` - Test evidence and visual verification
- `reports/` - Test execution reports

### `/scripts/`
Project utility scripts for development and deployment:
- Server startup scripts
- Development workflow automation
- Test execution orchestration

### `/logs/`
Application and test execution logs:
- Server logs (backend, frontend)
- Test execution logs
- Debug output

### `/tools/`
Development and debugging tools:
- `debug/` - Debugging scripts for game state and UI

## Moved Files Summary

### From Root to `/logs/`
- `*.log` files (backend.log, frontend.log, dev.log, etc.)

### From Root to `/tests/manual/`
- `test-*.js` files
- `*test*.js` files
- `capture-*.js` files
- `check_players.js`

### From Root to `/tests/scripts/`
- `test_bet_fix.sh`

### From Root to `/tools/debug/`
- `debug_*.js` files

### From Root to `/docs/`
- `GAME_HISTORY_FIX_VERIFICATION.md`
- `ITERATION_01_DESIGN.md`
- `TDD_IMPLEMENTATION_GUIDE.md`
- `TDD_ITERATION_WORKFLOW.md`

### From Root to `/tests/`
- `test_results_history.md`
- `cucumber.js`

## Benefits of Reorganization

1. **Clean Root Directory** - Only essential project files remain in root
2. **Logical Grouping** - Related files are organized together
3. **Easy Navigation** - Clear separation of concerns
4. **Better Maintenance** - Easier to find and manage files
5. **Improved Development** - Reduced clutter improves developer experience
6. **Version Control** - Cleaner git history and easier to track changes

## Preserved Files in Root

The following essential files remain in the root directory:
- `CLAUDE.md` - Claude AI instructions
- `PROJECT_OVERVIEW.md` - High-level project overview
- `README.md` - Project introduction and setup
- `package.json` - Project dependencies and scripts
- `package-lock.json` - Dependency lock file
- `.gitignore` - Git ignore patterns

## Configuration

Configuration files are centralized where possible:
- Individual projects (backend/frontend) maintain their own configs
- Shared configurations are documented in the respective project directories