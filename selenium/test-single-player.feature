Feature: Single Player Test
  As a test runner
  I want to test single player functionality
  So that I can isolate issues

  Scenario: Single Player Join Test
    Given the database is reset to a clean state
    And the User table is seeded with test players
    Given I have 1 player ready to join a poker game
    And all players have starting stacks of $100
    When players join the table in order:
      | Player  | Seat | Stack |
      | Player1 | 1    | $100  |
    Then all players should be seated correctly:
      | Player  | Seat |
      | Player1 | 1    | 