Feature: Action History Tracking
  As a poker player or observer
  I want to see a complete history of all game actions
  So that I can review the game progression and track player decisions

  Background:
    Given I am directly on the game page with test data
    And I have 3 players already seated:
      | nickname    | seat | chips |
      | TestPlayer1 | 1    | 500   |
      | TestPlayer2 | 2    | 400   |
      | TestPlayer3 | 3    | 600   |

  Scenario: Action history component visibility and initial state
    Then I should see the action history component
    And the action history should be empty initially
    And the action history should be positioned in the left sidebar below navigation

  Scenario: Recording basic poker actions in history
    When I perform a "bet" action
    Then the action history should show the "bet" action
    And the action history should show 1 total actions
    
    When I perform a "call" action  
    Then the action history should show the "call" action
    And the action history should show 2 total actions
    
    When I perform a "fold" action
    Then the action history should show the "fold" action
    And the action history should show 3 total actions

  Scenario: Action history entry format and content validation
    When I perform a "bet" action
    And I perform a "raise" action
    And I perform a "check" action
    Then each action in history should show player name, action type, and timestamp
    And actions should be displayed in chronological order
    And the action history should show color-coded action types

  Scenario: Real-time action history updates
    Given the action history should be empty initially
    When the action history should update in real-time as actions occur
    Then the action history should reflect the most recent game state
    And new actions should appear without page refresh

  Scenario: Action history persistence across game phases
    # Test that history persists through different game phases
    When I perform a "bet" action
    Then the action history should show the "bet" action
    
    When the game progresses to flop phase
    And I perform a "check" action
    Then the action history should show 2 total actions
    And the action history should show actions from multiple phases
    
    When the game progresses to turn phase  
    And I perform a "raise" action
    Then the action history should show 3 total actions
    And all previous actions should still be visible

  Scenario: Action history with amounts and betting details
    When "TestPlayer1" performs a "bet" action with amount "50"
    Then the action history should show "TestPlayer1 bet $50"
    
    When "TestPlayer2" performs a "raise" action with amount "100" 
    Then the action history should show "TestPlayer2 raise $100"
    
    When "TestPlayer3" performs a "call" action with amount "100"
    Then the action history should show "TestPlayer3 call $100"
    And the action history should show betting amounts correctly

  Scenario: Action history scrolling and capacity
    # Test action history can handle many actions
    When multiple actions are performed in sequence:
      | player      | action | amount |
      | TestPlayer1 | bet    | 25     |
      | TestPlayer2 | call   | 25     |  
      | TestPlayer3 | raise  | 50     |
      | TestPlayer1 | call   | 25     |
      | TestPlayer2 | fold   |        |
      | TestPlayer3 | check  |        |
      | TestPlayer1 | bet    | 75     |
      | TestPlayer3 | call   | 75     |
    Then the action history should show 8 total actions
    And the action history should be scrollable if needed
    And all actions should remain visible in the history

  Scenario: Action history UI integration with game flow
    # Verify action history integrates well with overall game UI
    Then I should see the action history component
    And the action history should not interfere with poker table display
    And the action history should be accessible throughout the game
    And the observers list should be visible below action history

  Scenario: Action history error handling and edge cases
    # Test edge cases and error scenarios
    When an invalid action is attempted
    Then the action history should not show invalid actions
    And the action history should maintain integrity
    
    When the game connection is temporarily lost
    And the connection is restored
    Then the action history should reload correctly
    And no duplicate actions should appear 