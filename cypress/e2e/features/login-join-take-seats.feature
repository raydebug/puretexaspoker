Feature: Login, Join Table, and Take Seats
  As a poker player
  I want to login, join a table, and take seats
  So that I can participate in the poker game

  Background:
    Given I am on the poker lobby page
    And tables are loaded and visible

  Scenario: Complete flow from anonymous visitor to seated player
    Given I am browsing anonymously
    And I am not logged in
    When I click the login button
    Then I should be prompted to login first
    
    When I click start playing without entering nickname
    Then I should see error message "Please enter your nickname"
    
    When I login with nickname "TestPlayer"
    Then I should see a welcome message with "TestPlayer" on the top right
    And the online users count should be updated to reflect my login
    And the online users count should increase by 1
    
    When I click join table to visit the game page
    Then I should be on the game page
    And I should see "TestPlayer" in the observers list
    And I should not see "TestPlayer" in the players list
    
    When I take an available seat "1"
    Then seat "1" should be in taken state
    And I should be removed from the observers list
    And I should see "TestPlayer" in the players list at seat "1"
    And I should not see "TestPlayer" in the observers list
    
    When I take another available seat "3"
    Then seat "1" should return to available state
    And seat "3" should be in taken state
    And I should see "TestPlayer" in the players list at seat "3"
    And I should not see "TestPlayer" at seat "1"
    And the players list should reflect this seat change 