Feature: Multiplayer Poker Game Round
  As poker players
  We want to play a complete round of poker with multiple players
  So that we can test all game mechanics and player interactions

  Background:
    Given I am directly on the game page with test data
    And I have 4 players already seated:
      | nickname | seat | chips |
      | Alice    | 1    | 200   |
      | Bob      | 3    | 150   |
      | Charlie  | 5    | 300   |
      | Diana    | 7    | 250   |

  Scenario: Complete multiplayer poker round with all actions
    # Verify initial setup
    Then all 4 players should be seated at the table
    And each player should have their correct chip count
    
    # Start the game (dealer assignment and blinds)
    When the game starts
    Then the dealer button should be assigned
    And small blind should be posted by the appropriate player
    And big blind should be posted by the appropriate player
    And the game status should be "playing"
    And the game phase should be "preflop"
    
    # Pre-flop betting round
    When it's the first player's turn after big blind
    Then the current player should have betting options available
    
    # Player actions in pre-flop
    When "Alice" calls the big blind
    And "Bob" raises to "20"
    And "Charlie" folds
    And "Diana" calls "20"
    And "Alice" calls the raise
    
    # Verify pre-flop results
    Then the pot should contain the correct amount from pre-flop betting
    And 3 players should remain in the hand
    And the game phase should advance to "flop"
    
    # Flop betting round
    When the flop is dealt
    Then 3 community cards should be visible
    And it should be the first active player's turn
    
    When "Alice" checks
    And "Bob" bets "30"
    And "Diana" raises to "60"
    And "Alice" folds
    And "Bob" calls the raise
    
    # Verify flop results
    Then the pot should contain the correct amount after flop betting
    And 2 players should remain in the hand
    And the game phase should advance to "turn"
    
    # Turn betting round
    When the turn card is dealt
    Then 4 community cards should be visible
    And it should be the first active player's turn
    
    When "Bob" checks
    And "Diana" bets "80"
    And "Bob" calls "80"
    
    # Verify turn results
    Then the pot should contain the correct amount after turn betting
    And 2 players should remain in the hand
    And the game phase should advance to "river"
    
    # River betting round
    When the river card is dealt
    Then 5 community cards should be visible
    And it should be the first active player's turn
    
    When "Bob" checks
    And "Diana" bets "100"
    And "Bob" calls "100"
    
    # Showdown
    Then the game phase should advance to "showdown"
    And both players' cards should be revealed
    And the winner should be determined
    And the pot should be awarded to the winner
    And player chip counts should be updated correctly
    
    # Next hand preparation
    Then the game should prepare for the next hand
    And the dealer button should move to the next player
    And the game status should return to "waiting" or start next hand
    
    # Verify final state
    And all players should have updated chip counts
    And the game should be ready for the next round 