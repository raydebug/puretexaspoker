Feature: Betting Actions
  As a player
  I want to perform different betting actions
  So that I can participate in the game according to poker rules

  Scenario: Player can perform various betting actions
    Given I am on the game page
    When I join the game with nickname "BettingPlayer"
    And I take a seat
    And it is my turn
    Then I should see the betting controls
    When I check
    Then the betting round should continue
    When it is my turn again
    And I place a bet of 100
    Then I should see "Chips: 900" displayed
    And the pot should increase by 100
    When it is my turn again
    And I fold
    Then I should see "Folded" in my status
    And I should not see the betting controls 