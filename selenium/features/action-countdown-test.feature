Feature: Comprehensive Poker Action and Countdown Timer Verification

  As a poker game system
  I want to verify all hand actions work correctly with countdown timers
  So that I can ensure complete UI verification for action execution and timing

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
    And hole cards are dealt according to the test scenario:
      | Player  | Card1 | Card2 |
      | Player1 | A♠    | K♠    |
      | Player2 | Q♥    | J♥    |

  @action-countdown-comprehensive
  Scenario: Complete Poker Hand Actions with Countdown Timer Verification
    # Initial state with countdown timer
    Then I capture comprehensive action countdown verification
    And the current player should see a decision timer
    And I capture screenshot showing countdown timer during "initial" action
    
    # Test RAISE action with countdown
    When the pre-flop betting round begins
    Then the current player should see a decision timer
    And I capture screenshot showing countdown timer during "raise" action
    And Player1 raises to $6
    Then I capture screenshot showing countdown timer during "after_raise" action
    
    # Test CALL action with countdown  
    Then the current player should see a decision timer
    And I capture screenshot showing countdown timer during "call" action
    And Player2 calls $4 more
    Then I capture screenshot showing countdown timer during "after_call" action
    
    # Flop phase actions with countdown
    When the flop is dealt: A♣, Q♠, 9♥
    Then I capture comprehensive action countdown verification
    And the current player should see a decision timer
    And I capture screenshot showing countdown timer during "flop_betting" action
    
    # Test BET action with countdown
    And Player1 bets $8
    Then I capture screenshot showing countdown timer during "after_bet" action
    
    # Test another CALL action with countdown
    Then the current player should see a decision timer
    And I capture screenshot showing countdown timer during "flop_call" action
    And Player2 calls $8
    
    # Turn phase actions with countdown
    When the turn is dealt: K♣
    Then I capture comprehensive action countdown verification
    And the current player should see a decision timer
    And I capture screenshot showing countdown timer during "turn_betting" action
    
    # Test larger BET action with countdown
    And Player1 bets $15
    Then I capture screenshot showing countdown timer during "turn_after_bet" action
    
    # Test FOLD action with countdown (simulate)
    Then the current player should see a decision timer
    And I capture screenshot showing countdown timer during "turn_decision" action
    And Player2 calls $15
    
    # River phase actions with countdown
    When the river is dealt: 10♥
    Then I capture comprehensive action countdown verification
    And the current player should see a decision timer
    And I capture screenshot showing countdown timer during "river_betting" action
    
    # Test final BET action with countdown
    And Player1 bets $20
    Then I capture screenshot showing countdown timer during "river_after_bet" action
    
    # Test ALL-IN action with countdown
    Then the current player should see a decision timer
    And I capture screenshot showing countdown timer during "all_in_decision" action
    And Player2 goes all-in with remaining chips
    Then I capture screenshot showing countdown timer during "after_all_in" action
    
    # Test final CALL action with countdown
    Then the current player should see a decision timer  
    And I capture screenshot showing countdown timer during "final_call_decision" action
    And Player1 calls the all-in
    
    # Showdown with final verification
    Then the pot should contain all remaining chips
    And the showdown should reveal both players' cards
    And I capture comprehensive action countdown verification
    Then I capture screenshot showing countdown timer during "showdown" action
    
    # Verify comprehensive action coverage
    Then I verify all poker hand actions with countdown timers
    And Player2 should win with "straight"
    And the game should end with proper chip distribution