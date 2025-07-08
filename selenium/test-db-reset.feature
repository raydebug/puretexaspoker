Feature: Database Reset Test
  As a test runner
  I want to verify database reset works
  So that tests use consistent table IDs

  Scenario: Reset database and verify first table
    Given the database is reset to a clean state
    Then the first table should be available for testing 