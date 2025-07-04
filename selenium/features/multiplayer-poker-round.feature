Feature: Multiplayer Poker Game Round
  As a poker player
  I want to play poker and observe multiplayer game mechanics
  So that I can experience the full poker game flow

  Background:
    Given I am directly on the game page with test data
    And I have 5 players already seated:
      | nickname    | seat | chips |
      | TestPlayer1 | 1    | 200   |
      | TestPlayer2 | 2    | 150   |
      | TestPlayer3 | 3    | 300   |
      | TestPlayer4 | 5    | 250   |
      | TestPlayer5 | 6    | 180   |

  Scenario: Complete poker game flow from UI perspective
    # Verify initial setup
    Then all 5 players should be seated at the table
    And each player should have their correct chip count
    And players should be visible in their seats
    And each player should be verified in their correct seat with proper order
    
    # Wait for game elements to be available
    When I wait for the poker game interface to load
    Then I should see the poker table with all UI elements
    And I should see my player information displayed correctly
    
    # Test preflop betting round with all players
    When the game starts and preflop betting begins
    Then the current player should have betting options available
    And I should be able to interact with betting buttons
    And I should see the action history component
    And the action history should be empty initially
    
    # Simulate a realistic preflop betting round
    When "TestPlayer3" performs a "check" action  
    Then the action should be reflected in the UI
    And the pot amount should update to "0"
    And the turn should move to "TestPlayer4"
    And the action history should show the "check" action
    
    When "TestPlayer2" performs a "check" action
    Then the action should be reflected in the UI
    And the pot amount should update to "0"
    And the turn should move to "TestPlayer4"
    
    When "TestPlayer4" performs a "check" action
    Then the action should be reflected in the UI
    And the turn should move to "TestPlayer5"
    
    When "TestPlayer5" performs a "check" action
    Then the action should be reflected in the UI
    And the turn should move to "TestPlayer1"
    
    When "TestPlayer1" performs a "check" action
    Then the action should be reflected in the UI
    And the preflop betting round should be complete
    And the pot should remain "0" with all checks
    
    # Test flop phase with community cards
    When the flop is dealt with 3 community cards
    Then I should see 3 community cards displayed
    And the cards should be visually rendered correctly
    And the phase indicator should show "flop"
    
    # Flop betting round with remaining players (TestPlayer3 folded preflop)
    When the flop betting round begins
    Then "TestPlayer1" should be first to act
    
    When "TestPlayer1" performs a "check" action
    And "TestPlayer2" performs a "bet" action with amount "20"
    And "TestPlayer4" performs a "call" action with amount "20"
    And "TestPlayer5" performs a "fold" action
    And "TestPlayer1" performs a "call" action with amount "20"
    Then the flop betting round should be complete
    And 5 players should remain active
    
    # Test turn phase
    When the turn card is dealt
    Then I should see 4 community cards displayed
    And the phase indicator should show "turn"
    
    # Turn betting round
    When the turn betting round begins
    And "TestPlayer1" performs a "check" action
    And "TestPlayer2" performs a "check" action
    And "TestPlayer4" performs a "check" action
    Then the turn betting round should be complete
    
    # Test river phase
    When the river card is dealt
    Then I should see 5 community cards displayed
    And the phase indicator should show "river"
    
    # Final betting round
    When the river betting round begins
    And "TestPlayer1" performs a "check" action
    And "TestPlayer2" performs a "bet" action with amount "40"
    And "TestPlayer4" performs a "fold" action
    And "TestPlayer1" performs a "call" action with amount "40"
    Then the river betting round should be complete
    
    # Test showdown and winner determination
    When the showdown phase begins
    Then the remaining players' cards should be revealed
    And the winner should be determined
    And the pot should be awarded to the winner
    And the game should display final results
    
    # Test UI state consistency throughout
    Then all player chip counts should be accurate
    And the pot display should show correct final amount
    And the game controls should be properly disabled
    And the winner celebration should be displayed
    And the action history should show actions from multiple phases
    And each action in history should show player name, action type, and timestamp 