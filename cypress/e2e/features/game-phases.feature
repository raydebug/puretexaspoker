Feature: Game Phases
  As a player
  I want to see the current game phase and betting information
  So that I can understand the game state and make appropriate decisions

  Scenario: Game displays correct phase and betting information
    Given I am on the game page
    When I join the game with nickname "PhasePlayer"
    Then I should see "Pre-flop" in the game status
    And I should see "Pot:" in the game status
    And I should see "Current Bet:" in the game status
    When I take a seat
    Then I should see the dealer button
    And I should see the pot display
    And I should see the current bet display
    When it is my turn
    Then I should see "Your Turn" in the game status
    And I should see the betting controls
    When I place a bet of 100
    Then I should see "Chips: 900" displayed
    And I should see the updated pot amount 