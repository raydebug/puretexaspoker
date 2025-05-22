Feature: Online Users List
  As a player
  I want to see the correct online users list with status changes
  So that I can track player presence and status

  Scenario: Online users list updates with player status changes
    Given I am on the game page
    When I join the game with nickname "Player1"
    Then the online users list should not be visible
    When I take a seat
    Then I should see "Players" in the online users list
    And I should see "Player1" in the players list
    And I should see "(You)" next to my name
    And I should see "Observers" in the online users list
    When I set my status to "away"
    Then I should see "(Away)" next to my name
    And my name should appear with reduced opacity
    When I set my status to "back"
    Then I should not see "(Away)" next to my name
    And my name should appear with full opacity
    When I stand up
    Then I should see "Player1" in the observers list
    And I should not see "(You)" next to my name
    When I leave the table
    Then the online users list should not be visible 