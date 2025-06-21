Feature: Automated Betting Round Completion Logic
  As a poker platform administrator
  I want automatic phase transitions when betting rounds are complete
  So that games flow seamlessly without manual intervention

  Background:
    Given the server is running on "http://localhost:8080"
    And I am in the game lobby
    And there is a test table "Auto Completion Test Table" with 6 seats

  Scenario: Automatic Preflop to Flop Transition
    Given I create test players "AutoPlayer1,AutoPlayer2,AutoPlayer3" with 500 chips each
    And all players join the test table and take seats "1,2,3"
    And the game starts with "AutoPlayer1" as dealer
    When the preflop betting round begins
    And "AutoPlayer2" (first to act) performs "call" action
    And "AutoPlayer3" performs "call" action  
    And "AutoPlayer1" performs "check" action
    Then the preflop betting round should be automatically complete
    And the phase should automatically transition to "flop"
    And I should see 3 community cards dealt automatically
    And I should receive automatic phase transition event "automaticFlop"
    And the system message should show "🎴 Automatic Flop: 3 community cards dealt (betting round completed)"

  Scenario: Automatic Flop to Turn Transition with All Players Checking
    Given I create test players "CheckPlayer1,CheckPlayer2,CheckPlayer3" with 400 chips each
    And all players join the test table and take seats "1,2,3"
    And the game starts and reaches flop phase
    When the flop betting round begins
    And "CheckPlayer2" (first to act) performs "check" action
    And "CheckPlayer3" performs "check" action
    And "CheckPlayer1" performs "check" action
    Then the flop betting round should be automatically complete
    And the phase should automatically transition to "turn"
    And I should see 4 community cards displayed automatically
    And I should receive automatic phase transition event "automaticTurn"
    And the turn order should reset for the new betting round

  Scenario: Automatic Turn to River Transition with Betting Activity
    Given I create test players "TurnPlayer1,TurnPlayer2,TurnPlayer3" with 300 chips each
    And all players join the test table and take seats "1,2,3"
    And the game starts and reaches turn phase
    When the turn betting round begins
    And "TurnPlayer2" (first to act) performs "bet" action with amount "50"
    And "TurnPlayer3" performs "call" action with amount "50"
    And "TurnPlayer1" performs "fold" action
    Then the turn betting round should be automatically complete
    And the phase should automatically transition to "river"
    And I should see 5 community cards displayed automatically
    And I should receive automatic phase transition event "automaticRiver"
    And only 2 players should remain active

  Scenario: Automatic River to Showdown Transition
    Given I create test players "RiverPlayer1,RiverPlayer2" with 250 chips each
    And all players join the test table and take seats "1,2"
    And the game starts and reaches river phase
    When the river betting round begins
    And "RiverPlayer2" (first to act) performs "check" action
    And "RiverPlayer1" performs "check" action
    Then the river betting round should be automatically complete
    And the phase should automatically transition to "showdown"
    And I should receive automatic phase transition event "automaticShowdown"
    And the showdown should determine winner automatically
    And I should receive game completion event "gameComplete"

  Scenario: Automatic Phase Transition with All-In Players
    Given I create test players "AllInPlayer1,AllInPlayer2,AllInPlayer3" with 100 chips each
    And all players join the test table and take seats "1,2,3"
    And the game starts with "AllInPlayer1" as dealer
    When the preflop betting round begins
    And "AllInPlayer2" (first to act) performs "allIn" action
    And "AllInPlayer3" performs "allIn" action
    And "AllInPlayer1" performs "call" action
    Then the preflop betting round should be automatically complete
    And all remaining phases should automatically advance
    And I should see community cards dealt for flop, turn, and river
    And the game should automatically reach showdown
    And the pot should be distributed to the winner automatically

  Scenario: Betting Round Completion with Mixed All-In and Active Players
    Given I create test players "MixedPlayer1,MixedPlayer2,MixedPlayer3,MixedPlayer4" with 200 chips each
    And all players join the test table and take seats "1,2,3,4"
    And the game starts with "MixedPlayer1" as dealer
    When the preflop betting round begins
    And "MixedPlayer2" (first to act) performs "allIn" action with all chips
    And "MixedPlayer3" performs "call" action
    And "MixedPlayer4" performs "fold" action
    And "MixedPlayer1" performs "call" action
    Then the preflop betting round should be automatically complete
    And the phase should automatically transition to "flop"
    And side pots should be created for all-in scenario
    And remaining betting rounds should continue with active players only

  Scenario: Automatic Completion with Single Player Remaining
    Given I create test players "FoldPlayer1,FoldPlayer2,FoldPlayer3" with 150 chips each
    And all players join the test table and take seats "1,2,3"
    And the game starts with "FoldPlayer1" as dealer
    When the preflop betting round begins
    And "FoldPlayer2" (first to act) performs "fold" action
    And "FoldPlayer3" performs "fold" action
    Then the betting round should be automatically complete
    And "FoldPlayer1" should win automatically without showdown
    And the pot should be awarded to "FoldPlayer1" immediately
    And I should receive automatic game completion event

  Scenario: WebSocket Broadcasting of Automatic Transitions
    Given I create test players "WSPlayer1,WSPlayer2" with 300 chips each
    And all players join the test table and take seats "1,2"
    And the game starts with "WSPlayer1" as dealer
    When the preflop betting round begins
    And "WSPlayer2" (big blind) performs "check" action
    And "WSPlayer1" performs "check" action
    Then I should receive WebSocket event "automaticFlop" with game state
    And the event should contain phase transition details
    And the event should have isAutomatic flag set to true
    And all connected clients should receive the same automatic transition
    And the game state should be synchronized across all clients

  Scenario: Turn Order Reset After Automatic Phase Transitions
    Given I create test players "OrderPlayer1,OrderPlayer2,OrderPlayer3" with 400 chips each
    And all players join the test table and take seats "1,2,3"
    And the game starts with "OrderPlayer2" as dealer
    When the preflop betting completes automatically
    And the phase transitions to flop automatically
    Then "OrderPlayer3" should be first to act in flop betting round
    When the flop betting completes automatically
    And the phase transitions to turn automatically
    Then "OrderPlayer3" should be first to act in turn betting round
    And the turn order should be properly maintained throughout

  Scenario: Comprehensive All-In Automatic Progression
    Given I create test players "CompPlayer1,CompPlayer2,CompPlayer3" with 75 chips each
    And all players join the test table and take seats "1,2,3"
    And the game starts with "CompPlayer1" as dealer
    When all players go all-in during preflop
    Then all betting rounds should be skipped automatically
    And community cards should be dealt for flop, turn, and river instantly
    And the showdown should occur immediately
    And the winner should be determined by best 5-card hand
    And side pots should be calculated and distributed correctly
    And I should receive multiple automatic phase transition events
    And the final game completion should be broadcasted to all clients 