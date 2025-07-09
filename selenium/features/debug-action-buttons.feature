Feature: Debug Action Buttons Issue
  As a test developer
  I want to debug why action buttons are not appearing
  So that I can fix the UI rendering issue

  Scenario: Debug Action Buttons After Game Start
    Given the database is reset to a clean state
    And the User table is seeded with test players
    Given I have 3 players ready to join a poker game
    And all players have starting stacks of $100
    When players join the table in order:
      | Player  | Seat | Stack |
      | Player1 | 1    | $100  |
      | Player2 | 2    | $100  |
      | Player3 | 3    | $100  |
    Then all players should be seated correctly:
      | Player  | Seat |
      | Player1 | 1    |
      | Player2 | 2    |
      | Player3 | 3    |
    When I manually start the game for table 1
    Then the game starts with blinds structure:
      | Position    | Player  | Amount |
      | Small Blind | Player1 | $1     |
      | Big Blind   | Player2 | $2     |
    And the pot should be $3
    When hole cards are dealt according to the test scenario:
      | Player  | Card1 | Card2 |
      | Player1 | 6♠    | 8♦    |
      | Player2 | A♥    | Q♥    |
      | Player3 | J♣    | K♣    |
    Then each player should see their own hole cards
    When the pre-flop betting round begins
    Then force all players to join game rooms
    And manually trigger game state update from backend
    And verify current player information in all browsers
    And debug action buttons for Player3 