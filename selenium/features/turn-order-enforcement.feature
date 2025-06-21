Feature: Professional Turn Order Enforcement
  As a poker platform administrator
  I want to ensure strict turn order enforcement with professional out-of-turn action rejection
  So that the game maintains integrity and follows official Texas Hold'em rules

  Background:
    Given the server is running on "http://localhost:8080"
    And I am in the game lobby
    And there is a test table "Turn Order Test Table" with 5 seats

  Scenario: Strict Turn Order Validation in Preflop Betting
    Given I create test players "TurnPlayer1,TurnPlayer2,TurnPlayer3" with 500 chips each
    And all players join the test table and take seats "1,2,3"
    And the game starts with "TurnPlayer1" as dealer
    When the preflop betting round begins
    Then "TurnPlayer3" should be first to act (left of big blind)
    When "TurnPlayer1" attempts to "call" out of turn
    Then I should see turn order violation error "OUT OF TURN: It is currently TurnPlayer3's turn to act"
    And "TurnPlayer1" action should be rejected
    And the current player should still be "TurnPlayer3"

  Scenario: Out-of-Turn Action Rejection with Professional Error Messages
    Given I create test players "OrderPlayer1,OrderPlayer2,OrderPlayer3,OrderPlayer4" with 400 chips each
    And all players join the test table and take seats "1,2,3,4"
    And the game starts with "OrderPlayer2" as dealer
    When the preflop betting round begins
    Then "OrderPlayer4" should be first to act
    When "OrderPlayer1" attempts to "bet" with amount "50" out of turn
    Then I should see turn order violation error "OUT OF TURN: It is currently OrderPlayer4's turn to act"
    When "OrderPlayer2" attempts to "raise" to "100" out of turn
    Then I should see turn order violation error "OUT OF TURN: It is currently OrderPlayer4's turn to act"
    When "OrderPlayer3" attempts to "fold" out of turn
    Then I should see turn order violation error "OUT OF TURN: It is currently OrderPlayer4's turn to act"
    And the current player should still be "OrderPlayer4"
    And no out-of-turn actions should have been processed

  Scenario: Turn Order Enforcement During Flop Betting
    Given I create test players "FlopPlayer1,FlopPlayer2,FlopPlayer3" with 300 chips each
    And all players join the test table and take seats "1,2,3"
    And the game starts and completes preflop betting
    When the flop is dealt
    And the flop betting round begins
    Then "FlopPlayer2" should be first to act (left of dealer)
    When "FlopPlayer3" attempts to "check" out of turn
    Then I should see turn order violation error "OUT OF TURN: It is currently FlopPlayer2's turn to act"
    When "FlopPlayer1" attempts to "bet" with amount "30" out of turn
    Then I should see turn order violation error "OUT OF TURN: It is currently FlopPlayer2's turn to act"
    And the current player should still be "FlopPlayer2"

  Scenario: Turn Order with Folded Players
    Given I create test players "FoldPlayer1,FoldPlayer2,FoldPlayer3,FoldPlayer4" with 250 chips each
    And all players join the test table and take seats "1,2,3,4"
    And the game starts with "FoldPlayer1" as dealer
    When the preflop betting round begins
    And "FoldPlayer2" (first to act) performs "fold"
    Then the turn should move to "FoldPlayer3"
    When "FoldPlayer2" attempts to "call" (after folding)
    Then I should see turn order violation error "Cannot perform call: you have folded and are no longer active"
    When "FoldPlayer1" attempts to "raise" to "80" out of turn
    Then I should see turn order violation error "OUT OF TURN: It is currently FoldPlayer3's turn to act"
    And the current player should still be "FoldPlayer3"

  Scenario: Turn Order Enforcement with All-In Players
    Given I create test players "AllInPlayer1,AllInPlayer2,AllInPlayer3" with 100 chips each
    And all players join the test table and take seats "1,2,3"
    And the game starts with "AllInPlayer3" as dealer
    When the preflop betting round begins
    And "AllInPlayer2" (first to act) performs "allIn"
    Then the turn should move to "AllInPlayer3"
    When "AllInPlayer2" attempts to "bet" after going all-in
    Then I should see turn order violation error "Cannot perform bet: you have folded and are no longer active"
    When "AllInPlayer1" attempts to "call" out of turn
    Then I should see turn order violation error "OUT OF TURN: It is currently AllInPlayer3's turn to act"

  Scenario: Action-Specific Turn Order Validations
    Given I create test players "ValidPlayer1,ValidPlayer2" with 200 chips each
    And all players join the test table and take seats "1,2"
    And the game starts with "ValidPlayer1" as dealer
    When the preflop betting round begins
    And "ValidPlayer2" (big blind) checks when they should call
    Then I should see turn order violation error "Cannot check: there is a bet of 5 to call"
    When "ValidPlayer2" performs "call" correctly
    And the turn moves to "ValidPlayer1"
    And "ValidPlayer1" attempts to "call" when no bet exists
    Then I should see turn order violation error "Cannot call: no bet to call. Use check instead"

  Scenario: Turn Order During Multiple Betting Rounds
    Given I create test players "RoundPlayer1,RoundPlayer2,RoundPlayer3" with 500 chips each
    And all players join the test table and take seats "1,2,3"
    And the game progresses through preflop, flop, and turn phases
    When the river betting round begins
    Then "RoundPlayer2" should be first to act (left of dealer)
    When "RoundPlayer3" attempts to "bet" with amount "100" out of turn
    Then I should see turn order violation error "OUT OF TURN: It is currently RoundPlayer2's turn to act"
    When "RoundPlayer1" attempts to "check" out of turn
    Then I should see turn order violation error "OUT OF TURN: It is currently RoundPlayer2's turn to act"
    And the current player should remain "RoundPlayer2"

  Scenario: Turn Order Enforcement During Showdown Phase
    Given I create test players "ShowdownPlayer1,ShowdownPlayer2" with 300 chips each
    And all players join the test table and take seats "1,2"
    And the game reaches showdown phase
    When "ShowdownPlayer1" attempts to "bet" with amount "50"
    Then I should see turn order violation error "Cannot perform bet: hand is showdown"
    When "ShowdownPlayer2" attempts to "fold"
    Then I should see turn order violation error "Cannot perform fold: hand is showdown"

  Scenario: Turn Order Validation Error Messages Include Player Names
    Given I create test players "NamedPlayer1,NamedPlayer2,NamedPlayer3" with 400 chips each
    And all players join the test table and take seats "1,2,3"
    And the game starts with "NamedPlayer2" as dealer
    When the preflop betting round begins
    Then "NamedPlayer1" should be first to act
    When "NamedPlayer2" attempts to "call" out of turn
    Then I should see turn order violation error containing "It is currently NamedPlayer1's turn to act"
    When "NamedPlayer3" attempts to "raise" to "75" out of turn
    Then I should see turn order violation error containing "It is currently NamedPlayer1's turn to act"

  Scenario: Turn Order Recovery After Invalid Attempts
    Given I create test players "RecoveryPlayer1,RecoveryPlayer2,RecoveryPlayer3" with 350 chips each
    And all players join the test table and take seats "1,2,3"
    And the game starts with "RecoveryPlayer1" as dealer
    When the preflop betting round begins
    And "RecoveryPlayer3" attempts multiple out-of-turn actions
    Then all out-of-turn attempts should be rejected
    And the current player should remain "RecoveryPlayer2"
    When "RecoveryPlayer2" performs "call" correctly
    Then the turn should properly advance to "RecoveryPlayer3"
    And the game should continue normally 