Feature: Join Game
  As a player
  I want to join the poker game
  So that I can participate in the game

  Scenario: Player joins the game and interacts with the table
    Given I am on the game page
    When I join the game with nickname "TestPlayer"
    Then I should see my player seat
    And I should see "TestPlayer" displayed
    And I should see "Chips: 1000" displayed
    When I open the seat menu
    Then I should see "Leave Midway"
    And I should see "Stand Up"
    And I should see "Leave Table"
    When I set my status to "away"
    Then I should see the away status icon
    When I set my status to "back"
    Then I should not see the away status icon 