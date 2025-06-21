Feature: Enhanced Blind System
  As a poker platform administrator
  I want a professional blind system with tournament schedules, dead blind rules, and late entry logic
  So that the platform supports professional poker tournaments and cash games

  Background:
    Given the server is running on "http://localhost:8080"
    And I am in the game lobby
    And there is a test table "Enhanced Blind Test Table" with 8 seats

  Scenario: Tournament Blind Schedule Management
    Given I create a tournament blind schedule:
      | level | smallBlind | bigBlind | ante | duration |
      | 1     | 25         | 50       | 0    | 15       |
      | 2     | 50         | 100      | 10   | 15       |
      | 3     | 100        | 200      | 25   | 20       |
    And I create test players "TourneyPlayer1,TourneyPlayer2,TourneyPlayer3" with 1500 chips each
    And all players join the test table and take seats "1,2,3"
    When I initialize the tournament with the blind schedule
    And the game starts with the tournament schedule
    Then the current blind level should be 1
    And the small blind should be 25
    And the big blind should be 50
    And the ante should be 0
    And the blind level timer should be running

  Scenario: Blind Level Increase with Antes
    Given I have an active tournament with blind schedule
    And the current blind level is 1 with blinds "25/50"
    And the blind level duration has elapsed
    When the system checks for blind level increase
    Then the blind level should increase to 2
    And the small blind should be 50
    And the big blind should be 100
    And the ante should be 10
    And all active players should post the ante
    And the new blind level timer should start

  Scenario: Dead Blind Rules for Seat Changes
    Given I create test players "SeatChangePlayer1,SeatChangePlayer2,SeatChangePlayer3" with 1000 chips each
    And all players join the test table and take seats "1,3,5"
    And the game starts with "SeatChangePlayer1" as dealer
    When "SeatChangePlayer3" changes from seat 5 to seat 7
    And the seat change moves the player past the blind positions
    Then "SeatChangePlayer3" should have a dead blind obligation
    And the dead blind type should be "both"
    And the dead blind reason should be "seat_change"
    When the next hand begins
    Then "SeatChangePlayer3" should be required to post dead blinds
    And the dead blind amount should be posted to the pot

  Scenario: Late Entry Blind Posting Rules
    Given I have an active cash game with blinds "10/20"
    And the game has been running for 5 hands
    And the current dealer is in seat 2
    When "LateEntryPlayer" joins the game in seat 6
    And the seat is after the current blind positions
    Then "LateEntryPlayer" should have a late entry dead blind obligation
    And the dead blind type should be "big"
    And the dead blind reason should be "late_entry"
    When "LateEntryPlayer" is dealt into the next hand
    Then they should post a dead big blind before receiving cards
    And their chip count should decrease by the big blind amount

  Scenario: Late Entry During Blind Positions
    Given I have an active cash game with blinds "10/20"
    And the small blind position is seat 3
    And the big blind position is seat 4
    When "BlindPositionPlayer" joins the game in seat 4 (big blind position)
    Then "BlindPositionPlayer" should have a big blind obligation
    And the dead blind reason should be "late_entry"
    When the hand begins
    Then "BlindPositionPlayer" should post the regular big blind
    And no additional dead blind should be required

  Scenario: Tournament Break Management
    Given I create a tournament with break schedule:
      | level | smallBlind | bigBlind | duration | breakAfter |
      | 1     | 25         | 50       | 10       | false      |
      | 2     | 50         | 100      | 10       | true       |
      | 3     | 100        | 200      | 15       | false      |
    And the tournament is currently at level 2
    When the level 2 duration elapses
    Then the tournament should enter a break period
    And the break duration should be set correctly
    And no new hands should be dealt during the break
    When the break period ends
    Then the blind level should increase to 3
    And normal gameplay should resume

  Scenario: All-In Dead Blind Scenarios
    Given I create test players "AllInPlayer1,AllInPlayer2" with chips "15,1000"
    And all players join the test table and take seats "1,2"
    And the game has blinds "10/20"
    When "AllInPlayer1" has a dead blind obligation for 30 chips
    And "AllInPlayer1" only has 15 chips remaining
    Then "AllInPlayer1" should post an all-in dead blind of 15 chips
    And the remaining dead blind obligation should be waived
    And "AllInPlayer1" should be eligible for side pot creation

  Scenario: Ante Collection with Mixed Stack Sizes
    Given I create test players "AntePlayer1,AntePlayer2,AntePlayer3" with chips "100,50,25"
    And all players join the test table and take seats "1,2,3"
    And the current blind level has an ante of 10
    When the ante collection begins
    Then "AntePlayer1" should post 10 chips as ante
    And "AntePlayer2" should post 10 chips as ante
    And "AntePlayer3" should post an all-in ante of 25 chips
    And the total ante collection should be 45 chips
    And the pot should reflect all ante contributions

  Scenario: Late Entry Deadline Enforcement
    Given I have a tournament with late entry deadline of 30 minutes
    And the tournament started 25 minutes ago
    When "OnTimePlayer" attempts to join
    Then "OnTimePlayer" should be allowed to join
    And they should receive appropriate late entry dead blind obligations
    Given the tournament started 35 minutes ago
    When "LatePlayer" attempts to join
    Then "LatePlayer" should be rejected with "Late entry deadline has passed"

  Scenario: Complex Dead Blind Scenario with Multiple Players
    Given I create test players "Complex1,Complex2,Complex3,Complex4" with 800 chips each
    And all players join the test table and take seats "1,3,5,7"
    And the game starts with blinds "25/50"
    When "Complex2" changes from seat 3 to seat 6
    And "Complex4" joins as late entry in seat 8
    And "Complex1" misses a blind due to temporary disconnection
    Then "Complex2" should have dead blind obligation for "both" due to "seat_change"
    And "Complex4" should have dead blind obligation for "big" due to "late_entry"
    And "Complex1" should have dead blind obligation for "big" due to "missed_blind"
    When the next hand begins
    Then all players should post their respective dead blinds
    And the pot should reflect all dead blind contributions
    And the regular blinds should be posted by the appropriate players

  Scenario: Blind Schedule Information API
    Given I have a tournament with a 5-level blind schedule
    And the tournament is currently at level 3
    And there are 8 minutes remaining in the current level
    When I request the blind schedule summary
    Then the response should include current level information
    And the response should include time remaining in current level
    And the response should include next level blind amounts
    And the response should include total hands played
    And the response should include number of pending dead blinds 