Feature: Multiplayer Poker Game Round
  As a poker player
  I want to play poker and observe multiplayer game mechanics
  So that I can experience the full poker game flow

  Background:
    Given I am directly on the game page with test data
    And I have 1 players already seated:
      | nickname   | seat | chips |
      | TestPlayer | 1    | 200   |

  Scenario: Complete poker game flow from UI perspective
    # Verify initial setup
    Then all 1 players should be seated at the table
    And each player should have their correct chip count
    
    # Wait for game elements to be available
    When I wait for the poker game interface to load
    Then I should see the poker table with all UI elements
    And I should see my player information displayed correctly
    
    # Test betting controls availability
    When the betting controls become available
    Then the current player should have betting options available
    And I should be able to interact with betting buttons
    
    # Test basic poker actions via UI
    When I perform a "call" action
    Then the action should be reflected in the UI
    And the pot amount should update
    
    When I perform a "raise" action with amount "20"
    Then the raise should be processed via UI
    And my chip count should decrease appropriately
    
    When I perform a "check" action
    Then the check action should be confirmed in UI
    
    # Test community cards display
    When community cards are dealt
    Then I should see community cards displayed
    And the cards should be visually rendered correctly
    
    # Test different game phases
    When the game progresses through phases
    Then I should see phase indicators in the UI
    And the game status should update accordingly
    
    # Test pot and chip management
    When betting actions affect the pot
    Then the pot display should update in real-time
    And player chip counts should reflect changes
    
    # Test game controls and interactions
    When I interact with various game controls
    Then all controls should respond appropriately
    And the UI should provide proper feedback
    
    # Test game state persistence
    When the game state changes
    Then the UI should maintain consistency
    And all player information should remain accurate
    
    # Test responsive UI elements
    When I view different parts of the game interface
    Then all elements should be properly displayed
    And the layout should be functional and clear 