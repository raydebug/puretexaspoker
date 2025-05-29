# Development Workflow Guide

## Table of Contents
1. [Development Process](#development-process)
2. [Code Standards](#code-standards)
3. [Testing Process](#testing-process)
4. [Review Process](#review-process)

## Development Process
1. Check tasks.md for requirements
2. Follow code organization rules:
   - Backend: controllers/, types/, socketHandlers/
   - Frontend: components/, types/, __tests__/
3. Implement and test in this order:
   - Backend changes
   - Frontend changes
   - Tests
   - Documentation

## Code Standards
1. Use TypeScript strict mode
2. Keep components focused and modular
3. Document complex logic
4. Follow existing code style
5. Handle errors appropriately

## Testing Process
1. Write unit tests for new features
2. Add E2E tests for critical paths
3. Run full test suite before submitting
4. Maintain minimum coverage:
   - Unit: 80%
   - E2E: Critical paths

## Review Process
1. Self-review checklist:
   - Tests passing
   - Documentation updated
   - No console errors
   - Types are correct
2. Address review feedback promptly 