// Import testing library
import '@testing-library/cypress/add-commands';

// Import custom commands
import './commands.ts';

// DO NOT create sessions here - they will be created in the beforeEach hooks of each test file
// This avoids the "Cannot call cy.session() outside a running test" error 