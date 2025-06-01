Feature: Player List
  As a player
  I want to see the current player in the players list when taking a seat
  So that I can confirm my presence in the game

  Scenario: Player appears in the players list when taking a seat
    Given I am on the game page
    When I join the game with nickname "TestPlayer"
    Then the online users list should not be visible
    When I take a seat
    Then I should see "Observers" in the online users list
    And I should see "TestPlayer" in the observers list
    Then I should see "Players" in the online users list
    And I should see "TestPlayer" in the players list
    And I should see "(You)" next to my name
    And my name should be highlighted
    When I click on my seat
    Then I should see "Leave Midway"
    And I should see "Stand Up"
    And I should see "Leave Table" 