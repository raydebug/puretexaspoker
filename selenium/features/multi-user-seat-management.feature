Feature: Multi-User Seat Management with Multiple Browser Instances
  As a poker platform with multiple concurrent users
  I want to ensure proper seat management across multiple browser instances
  So that users can join, take seats, and change seats without conflicts

  Background:
    Given the server is running on "http://localhost:8080"
    And the frontend is running on "http://localhost:3000"
    And I have a clean poker table "MultiUserTable" with 6 seats

  @multi-browser
  Scenario: Multiple Users Join Table and Take Different Seats
    Given I have 4 browser instances ready
    When user "Player1" joins from browser instance 1
    And user "Player2" joins from browser instance 2
    And user "Player3" joins from browser instance 3
    And user "Player4" joins from browser instance 4
    And all users navigate to table "MultiUserTable"
    Then all 4 users should see the same table state
    And all seats should be available

    When "Player1" takes seat 1 with buy-in 500
    Then "Player1" should be seated at seat 1 in all browser instances
    And seat 1 should be marked as occupied in all browser instances
    And "Player1" should have 500 chips displayed

    When "Player2" takes seat 3 with buy-in 750
    Then "Player2" should be seated at seat 3 in all browser instances
    And seat 3 should be marked as occupied in all browser instances
    And "Player2" should have 750 chips displayed

    When "Player3" takes seat 5 with buy-in 600
    Then "Player3" should be seated at seat 5 in all browser instances
    And seat 5 should be marked as occupied in all browser instances
    And "Player3" should have 600 chips displayed

    When "Player4" takes seat 2 with buy-in 800
    Then "Player4" should be seated at seat 2 in all browser instances
    And seat 2 should be marked as occupied in all browser instances
    And "Player4" should have 800 chips displayed

    And seats 4 and 6 should remain available in all browser instances
    And the total seated players should be 4 in all browser instances

  @multi-browser @seat-switching
  Scenario: Users Change Seats Successfully
    Given I have 3 browser instances with users seated:
      | user    | browser | initial_seat | buy_in |
      | Player1 | 1       | 1            | 500    |
      | Player2 | 2       | 3            | 750    |
      | Player3 | 3       | 5            | 600    |
    And all users can see the current seating arrangement

    When "Player1" attempts to move from seat 1 to seat 4
    Then the seat change should be successful in all browser instances
    And "Player1" should now be at seat 4 with 500 chips
    And seat 1 should be available in all browser instances
    And seat 4 should be occupied by "Player1" in all browser instances

    When "Player2" attempts to move from seat 3 to seat 6
    Then the seat change should be successful in all browser instances
    And "Player2" should now be at seat 6 with 750 chips
    And seat 3 should be available in all browser instances
    And seat 6 should be occupied by "Player2" in all browser instances

    When "Player3" attempts to move from seat 5 to seat 1
    Then the seat change should be successful in all browser instances
    And "Player3" should now be at seat 1 with 600 chips
    And seat 5 should be available in all browser instances
    And seat 1 should be occupied by "Player3" in all browser instances

    And the final seating arrangement should be:
      | seat | player  | chips |
      | 1    | Player3 | 600   |
      | 4    | Player1 | 500   |
      | 6    | Player2 | 750   |
    And seats 2, 3, and 5 should be available in all browser instances

  @multi-browser @seat-conflicts
  Scenario: Seat Conflict Prevention and Resolution
    Given I have 3 browser instances with users seated:
      | user    | browser | initial_seat | buy_in |
      | Player1 | 1       | 1            | 500    |
      | Player2 | 2       | 3            | 750    |
      | Player3 | 3       | 5            | 600    |

    When "Player1" attempts to take seat 3 (occupied by Player2)
    Then the action should be rejected with "Seat is already taken"
    And "Player1" should remain at seat 1
    And "Player2" should remain at seat 3
    And the error should be displayed in browser instance 1

    When "Player2" and "Player3" simultaneously attempt to take seat 2
    Then only one of them should succeed in taking seat 2
    And the other should receive "Seat is already taken" error
    And the seat assignment should be consistent across all browser instances
    And no user should lose their original seat until successfully moved

  @multi-browser @return-to-previous-seat
  Scenario: Users Can Return to Previously Occupied Seats
    Given I have 2 browser instances with users seated:
      | user    | browser | initial_seat | buy_in |
      | Player1 | 1       | 2            | 500    |
      | Player2 | 2       | 4            | 750    |

    When "Player1" moves from seat 2 to seat 6
    Then "Player1" should be at seat 6 in all browser instances
    And seat 2 should be available in all browser instances

    When "Player2" moves from seat 4 to seat 2
    Then "Player2" should be at seat 2 in all browser instances
    And seat 4 should be available in all browser instances

    When "Player1" attempts to return to seat 4 (previously occupied by Player2)
    Then the seat change should be successful
    And "Player1" should be at seat 4 in all browser instances
    And seat 6 should be available in all browser instances

    When "Player2" attempts to return to seat 6 (previously occupied by Player1)
    Then the seat change should be successful
    And "Player2" should be at seat 6 in all browser instances
    And seat 2 should be available in all browser instances

    And the final arrangement should show:
      | seat | player  |
      | 4    | Player1 |
      | 6    | Player2 |

  @multi-browser @real-time-updates
  Scenario: Real-time Updates Across All Browser Instances
    Given I have 4 browser instances with users as observers
    And all users are viewing table "MultiUserTable"

    When "Player1" joins and takes seat 1 with buy-in 1000
    Then all browser instances should immediately show:
      | seat | player  | chips | status   |
      | 1    | Player1 | 1000  | occupied |

    When "Player2" joins and takes seat 3 with buy-in 800
    Then all browser instances should immediately show:
      | seat | player  | chips | status   |
      | 1    | Player1 | 1000  | occupied |
      | 3    | Player2 | 800   | occupied |

    When "Player1" moves from seat 1 to seat 5
    Then all browser instances should immediately show:
      | seat | player  | chips | status    |
      | 1    |         |       | available |
      | 3    | Player2 | 800   | occupied  |
      | 5    | Player1 | 1000  | occupied  |

    When "Player2" leaves the table
    Then all browser instances should immediately show:
      | seat | player  | chips | status    |
      | 1    |         |       | available |
      | 3    |         |       | available |
      | 5    | Player1 | 1000  | occupied  |

  @multi-browser @game-start-conditions
  Scenario: Game Start with Multiple Seated Users
    Given I have 5 browser instances with users seated:
      | user    | browser | seat | buy_in |
      | Player1 | 1       | 1    | 500    |
      | Player2 | 2       | 2    | 600    |
      | Player3 | 3       | 4    | 750    |
      | Player4 | 4       | 5    | 800    |
      | Player5 | 5       | 6    | 900    |

    When the minimum players requirement is met (2+ players)
    Then the "Start Game" button should be enabled in all browser instances
    And all seated players should see their ready status

    When "Player1" clicks "Start Game"
    Then the game should start for all players
    And all browser instances should show:
      | phase   | status  |
      | preflop | playing |
    And blinds should be assigned correctly
    And all players should receive hole cards
    And the game state should be synchronized across all browser instances

  @multi-browser @stress-test
  Scenario: High-Frequency Seat Changes Stress Test
    Given I have 6 browser instances with users ready
    When all 6 users attempt to join the table simultaneously
    And they perform rapid seat changes in this sequence:
      | time | user    | action                  |
      | 0s   | Player1 | take seat 1             |
      | 0s   | Player2 | take seat 2             |
      | 1s   | Player3 | take seat 3             |
      | 1s   | Player1 | move to seat 4          |
      | 2s   | Player4 | take seat 1             |
      | 2s   | Player2 | move to seat 5          |
      | 3s   | Player5 | take seat 2             |
      | 3s   | Player6 | take seat 6             |
      | 4s   | Player3 | move to seat 1          |
      | 4s   | Player4 | move to seat 3          |

    Then the final seating arrangement should be consistent across all browser instances
    And no seat should have multiple occupants
    And no user should be assigned to multiple seats
    And all seat changes should be properly logged
    And the UI should reflect the correct final state in all browser instances 