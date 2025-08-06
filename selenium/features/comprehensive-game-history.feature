Feature: Comprehensive Game History Verification

  As a poker game system  
  I want to verify that game history updates correctly after each poker action by each player
  So that I can validate complete game history tracking throughout the game

  Background:
    Given the database is reset to a clean state
    And the User table is seeded with test players
    And I have exactly 2 players ready to join a poker game
    And all players have starting stacks of $100
    When exactly 2 players join the table in order:
      | Player  | Seat |
      | Player1 | 1    |
      | Player2 | 2    |
    Then all players should be seated correctly:
      | Player  | Seat |
      | Player1 | 1    |
      | Player2 | 2    |
    And the page should be fully loaded for "Player1"
    And the page should be fully loaded for "Player2"
    When I manually start the game for table 1
    Then the game starts with blinds structure:
      | Position    | Player  | Amount |
      | Small Blind | Player1 | $1     |
      | Big Blind   | Player2 | $2     |
    And the pot should be $3
    Then I capture game history after "blinds posted" by "system"

  Scenario: Complete game with comprehensive game history tracking
    # Preflop Action 1: Player1 Raises
    When "Player1" clicks the "RAISE" action button
    And "Player1" raises the bet to $6
    Then I capture game history after "raise" by "Player1"
    And I verify game history shows "raise" action by "Player1" with amount "$6"
    
    # Preflop Action 2: Player2 Calls
    When "Player2" clicks the "CALL" action button
    Then I capture game history after "call" by "Player2"
    And I verify game history shows "call" action by "Player2" with amount "$4"
    
    # Flop Phase
    When the flop cards are dealt
    Then I capture game history after "flop dealt" by "system"
    
    # Flop Action 1: Player1 Bets
    When "Player1" clicks the "BET" action button
    And "Player1" bets $8
    Then I capture game history after "bet" by "Player1"
    And I verify game history shows "bet" action by "Player1" with amount "$8"
    
    # Flop Action 2: Player2 Calls
    When "Player2" clicks the "CALL" action button
    Then I capture game history after "call" by "Player2"
    And I verify game history shows "call" action by "Player2" with amount "$8"
    
    # Turn Phase
    When the turn card is dealt
    Then I capture game history after "turn dealt" by "system"
    
    # Turn Action 1: Player1 Bets
    When "Player1" clicks the "BET" action button
    And "Player1" bets $15
    Then I capture game history after "bet" by "Player1"
    And I verify game history shows "bet" action by "Player1" with amount "$15"
    
    # Turn Action 2: Player2 Calls
    When "Player2" clicks the "CALL" action button
    Then I capture game history after "call" by "Player2"
    And I verify game history shows "call" action by "Player2" with amount "$15"
    
    # River Phase
    When the river card is dealt
    Then I capture game history after "river dealt" by "system"
    
    # River Action 1: Player1 Bets
    When "Player1" clicks the "BET" action button
    And "Player1" bets $20
    Then I capture game history after "bet" by "Player1"
    And I verify game history shows "bet" action by "Player1" with amount "$20"
    
    # River Action 2: Player2 Goes All-In
    When "Player2" clicks the "RAISE" action button
    And "Player2" goes all in
    Then I capture game history after "all-in" by "Player2"
    And I verify game history shows "all-in" action by "Player2" with amount "remaining chips"
    
    # River Action 3: Player1 Calls All-In
    When "Player1" clicks the "CALL" action button
    Then I capture game history after "call all-in" by "Player1"
    And I verify game history shows "call" action by "Player1" with amount "all-in amount"
    
    # Final comprehensive game history capture
    Then I capture comprehensive game history progression