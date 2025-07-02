Feature: Seat Change Without Additional Buy-in
  As a poker player already seated at a table
  I want to change to a different seat without having to buy in again
  So that I can maintain my current chip stack and adjust my position

  Background:
    Given the server is running on "http://localhost:3001"
    And the frontend is running on "http://localhost:3000"
    And I have a clean poker table with 9 seats
    And there are no other players at the table

  @seat-change @no-buyin
  Scenario: Player changes seat without additional buy-in requirement
    Given I am logged in as "Player1"
    And I join the poker table as an observer
    When I take seat 2 with buy-in of 1000 chips
    Then I should be seated at seat 2 with 1000 chips
    And my total chip stack should be 1000

    When I attempt to change from seat 2 to seat 5
    Then the seat change should be successful
    And I should be seated at seat 5 with 1000 chips
    And my total chip stack should remain 1000
    And seat 2 should now be available
    And no additional buy-in should be required

  @seat-change @multiple-changes
  Scenario: Player makes multiple seat changes maintaining chip stack
    Given I am logged in as "Player1"
    And I join the poker table as an observer
    When I take seat 1 with buy-in of 750 chips
    Then I should be seated at seat 1 with 750 chips

    When I change from seat 1 to seat 3
    Then I should be seated at seat 3 with 750 chips
    And seat 1 should be available

    When I change from seat 3 to seat 7
    Then I should be seated at seat 7 with 750 chips
    And seat 3 should be available

    When I change from seat 7 to seat 4
    Then I should be seated at seat 4 with 750 chips
    And seat 7 should be available

    And my chip stack should consistently be 750 throughout all changes
    And no buy-in dialogs should have appeared after the initial seating

  @seat-change @different-buyin-amounts
  Scenario: Players with different initial buy-ins maintain their amounts when changing seats
    Given I am logged in as "Player1"
    And "Player2" is logged in and at the same table
    
    When I take seat 1 with buy-in of 500 chips
    And "Player2" takes seat 3 with buy-in of 1200 chips
    Then I should have 500 chips at seat 1
    And "Player2" should have 1200 chips at seat 3

    When I change from seat 1 to seat 6
    And "Player2" changes from seat 3 to seat 8
    Then I should have 500 chips at seat 6
    And "Player2" should have 1200 chips at seat 8
    And our chip amounts should be preserved from our original buy-ins

  @seat-change @buyin-dialog-behavior
  Scenario: Seat change dialog should not show buy-in input for existing players
    Given I am logged in as "Player1"
    And I join the poker table as an observer
    And I take seat 2 with buy-in of 800 chips

    When I click on an available seat 5
    Then a seat selection dialog should appear
    And the dialog should NOT contain a buy-in input field
    And the dialog should show my current chip amount of 800
    And the confirm button should be available immediately

    When I confirm the seat change
    Then I should be moved to seat 5 with 800 chips
    And no additional buy-in should be deducted

  @seat-change @ui-validation
  Scenario: UI correctly displays chip preservation during seat changes
    Given I am logged in as "Player1"
    And I take seat 1 with buy-in of 600 chips
    And the UI shows me with 600 chips at seat 1

    When I initiate a seat change to seat 4
    Then during the seat change process:
      | element           | expected_state                    |
      | chip_display      | continues showing 600             |
      | seat_1            | shows as transitioning/changing   |
      | seat_4            | shows as being selected           |
      | buyin_input       | should not be present             |
      | total_chips       | remains 600 throughout           |

    When the seat change completes
    Then I should be at seat 4 with exactly 600 chips
    And my chip total should match my original buy-in amount
    And the UI should accurately reflect the preserved chip amount

  @seat-change @edge-cases  
  Scenario: Seat change preserves chips in various game states
    Given I am logged in as "Player1"
    And I take seat 2 with buy-in of 1000 chips

    # Test seat change while game is waiting to start
    When the game is in "waiting" state
    And I change to seat 5
    Then my chips should remain 1000
    And the seat change should be successful

    # Test seat change during different game phases (if game starts)
    When other players join to start a game
    And the game is in "preflop" phase
    And it's not my turn to act
    And I change to seat 7
    Then my chips should remain 1000
    And my position in the game should be updated accordingly

    # Verify chip preservation across all states
    And my chip count should never have changed from the original 1000 