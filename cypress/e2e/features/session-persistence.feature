Feature: Session Persistence
  As a player
  I want my game session to persist across page reloads
  So that I can maintain my game state and continue playing

  Scenario: Player session persists after page reload
    Given I am on the game page
    When I join the game with nickname "PersistentPlayer"
    Then I should see "PersistentPlayer" displayed
    And I should see "Chips: 1000" displayed
    When I take a seat
    Then I should see my player seat
    When I reload the page
    Then I should see "PersistentPlayer" displayed
    And I should see "Chips: 1000" displayed
    And I should see my player seat
    And I should be in the same seat position
    And my game state should be preserved

  Scenario: Player session persists after connection loss
    Given I am on the game page
    When I join the game with nickname "PersistentPlayer"
    And I take a seat
    Then I should see my player seat
    When I simulate a connection loss
    Then I should see a reconnection message
    When the connection is restored
    Then I should see "PersistentPlayer" displayed
    And I should see my player seat
    And my game state should be preserved 