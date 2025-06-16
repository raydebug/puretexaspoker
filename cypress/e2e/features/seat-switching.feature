Feature: Seat Switching Behavior
  As a poker player
  I want to be able to switch between seats
  So that I can change my position at the table

  Background:
    Given I am on the poker lobby page
    And tables are loaded and visible

  Scenario: Switch between seats successfully
    Given I am browsing anonymously
    And I am not logged in
    When I click the login button
    And I login with nickname "SeatSwitcher"
    And all join table buttons become active now
    When I click one join table button
    Then I should be on the game page
    And I should see "SeatSwitcher" in the observers list
    
    When I take an available seat "2"
    Then seat "2" should be in taken state
    And I should see "SeatSwitcher" in the players list at seat "2"
    And I should not see "SeatSwitcher" in the observers list
    
    When I take another available seat "5"
    Then seat "2" should return to available state
    And seat "5" should be in taken state
    And I should see "SeatSwitcher" in the players list at seat "5"
    And I should not see "SeatSwitcher" at seat "2"
    
    When I take seat "2" again
    Then seat "5" should return to available state
    And seat "2" should be in taken state
    And I should see "SeatSwitcher" in the players list at seat "2"
    And I should not see "SeatSwitcher" at seat "5"
    And "SeatSwitcher" should appear exactly once in the players list
    And "SeatSwitcher" should appear exactly zero times in the observers list 