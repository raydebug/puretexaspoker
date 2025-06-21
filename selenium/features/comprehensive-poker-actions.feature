Feature: Comprehensive Poker Actions Testing
  As a poker player
  I want to test all possible poker actions and scenarios
  So that I can ensure professional poker rule compliance

  Background:
    Given I am directly on the game page with test data

  Scenario: Test All Basic Poker Actions
    Given I have 3 players seated for basic action testing:
      | nickname    | seat | chips |
      | ActionTest1 | 1    | 1000  |
      | ActionTest2 | 2    | 1000  |
      | ActionTest3 | 3    | 1000  |
    When the game starts and preflop betting begins
    
    # Test Check Action
    Then "ActionTest1" should be able to "check" when no bet is pending
    And the action should be processed correctly
    
    # Test Bet Action
    When "ActionTest2" performs a "bet" action with amount "50"
    Then the bet should be processed and pot should increase
    And "ActionTest2" chip count should decrease by "50"
    
    # Test Call Action
    When "ActionTest3" performs a "call" action with amount "50"
    Then the call should be processed correctly
    And "ActionTest3" chip count should decrease by "50"
    
    # Test Raise Action
    When "ActionTest1" performs a "raise" action with amount "150"
    Then the raise should be processed correctly
    And the current bet should be "150"
    And "ActionTest1" chip count should decrease appropriately
    
    # Test Fold Action
    When "ActionTest2" performs a "fold" action
    Then "ActionTest2" should be marked as folded
    And "ActionTest2" should not participate in further betting

  Scenario: Test All-In Scenarios with Side Pots
    Given I have 4 players with different chip amounts for all-in testing:
      | nickname      | seat | chips |
      | AllInShort    | 1    | 50    |
      | AllInMedium   | 2    | 200   |
      | AllInLarge    | 3    | 500   |
      | AllInHuge     | 4    | 1000  |
    When the game starts and preflop betting begins
    
    # Test All-In with Small Stack
    When "AllInShort" performs an "allIn" action
    Then "AllInShort" should go all-in with "50" chips
    And "AllInShort" chip count should be "0"
    And the all-in should be processed correctly
    
    # Test All-In Call Scenario
    When "AllInMedium" performs a "call" action with amount "50"
    Then "AllInMedium" should call the all-in amount
    And "AllInMedium" chip count should decrease to "150"
    
    # Test All-In Raise
    When "AllInLarge" performs an "allIn" action
    Then "AllInLarge" should go all-in with "500" chips
    And this should create a side pot scenario
    And "AllInLarge" chip count should be "0"
    
    # Test Regular Call to All-In Raise
    When "AllInHuge" performs a "call" action with amount "500"
    Then "AllInHuge" should call the all-in raise
    And "AllInHuge" chip count should decrease to "500"
    
    # Verify Side Pot Creation
    Then side pots should be created correctly
    And the main pot should include all players
    And the side pot should exclude the shortest stack

  Scenario: Test Complex All-In with Multiple Side Pots
    Given I have 5 players with escalating chip amounts:
      | nickname    | seat | chips |
      | Micro1      | 1    | 25    |
      | Small2      | 2    | 100   |
      | Medium3     | 3    | 300   |
      | Large4      | 4    | 600   |
      | Huge5       | 5    | 1200  |
    When the game starts and multiple all-ins occur
    
    # First all-in creates main pot
    When "Micro1" performs an "allIn" action
    Then "Micro1" goes all-in with "25" chips
    
    # Second all-in creates first side pot
    When "Small2" performs an "allIn" action
    Then "Small2" goes all-in with "100" chips
    And a side pot should be created
    
    # Third all-in creates second side pot
    When "Medium3" performs an "allIn" action
    Then "Medium3" goes all-in with "300" chips
    And another side pot should be created
    
    # Regular calls to all-ins
    When "Large4" performs a "call" action with amount "300"
    And "Huge5" performs a "call" action with amount "300"
    
    # Verify Complex Side Pot Structure
    Then multiple side pots should exist
    And pot eligibility should be calculated correctly
    And all players should be assigned to appropriate pots

  Scenario: Test All-In Edge Cases and Professional Rules
    Given I have 3 players for edge case testing:
      | nickname      | seat | chips |
      | EdgeCase1     | 1    | 15    |
      | EdgeCase2     | 2    | 75    |
      | EdgeCase3     | 3    | 500   |
    When the game starts with big blind "20"
    
    # Test All-In with Less Than Call Amount
    When "EdgeCase2" performs a "raise" action with amount "50"
    And "EdgeCase1" performs an "allIn" action
    Then "EdgeCase1" should go all-in with "15" chips even though call is "50"
    And this should be allowed per professional poker rules
    And a side pot should be created correctly
    
    # Test All-In Raise Below Minimum Raise
    When "EdgeCase3" performs an "allIn" action
    Then "EdgeCase3" should go all-in even if raise is below minimum
    And the all-in should be processed as valid
    And the current bet should be updated appropriately

  Scenario: Test Betting Validation and Limits
    Given I have 3 players for validation testing:
      | nickname    | seat | chips |
      | Valid1      | 1    | 300   |
      | Valid2      | 2    | 300   |
      | Valid3      | 3    | 300   |
    When the game starts and betting validation is tested
    
    # Test Minimum Bet Validation
    When "Valid1" attempts to bet below minimum
    Then the bet should be rejected with appropriate error
    
    # Test Maximum Bet Validation (Chip Stack)
    When "Valid1" attempts to bet more than chip stack
    Then the bet should be rejected or converted to all-in
    
    # Test Minimum Raise Validation
    When "Valid2" performs a "bet" action with amount "50"
    And "Valid3" attempts to raise below minimum raise amount
    Then the raise should be rejected with appropriate error
    
    # Test Valid Minimum Raise
    When "Valid3" performs a "raise" action with valid minimum amount
    Then the raise should be accepted and processed

  Scenario: Test Professional Showdown and Hand Evaluation
    Given I have 3 players for showdown testing:
      | nickname     | seat | chips |
      | Showdown1    | 1    | 200   |
      | Showdown2    | 2    | 200   |
      | Showdown3    | 3    | 200   |
    When the game progresses to showdown with multiple players
    
    # Test Hand Revelation
    Then all remaining players' cards should be revealed
    And hand strengths should be evaluated correctly
    
    # Test Winner Determination
    Then the best hand should be identified
    And the winner should be declared correctly
    And the pot should be awarded to the proper winner
    
    # Test Tie Scenarios
    When multiple players have equivalent hands
    Then the pot should be split appropriately
    And odd chips should be distributed per poker rules

  Scenario: Test Side Pot Distribution at Showdown
    Given I have side pot scenario players:
      | nickname    | seat | chips |
      | SidePot1    | 1    | 100   |
      | SidePot2    | 2    | 300   |
      | SidePot3    | 3    | 500   |
    When all players go all-in creating multiple side pots
    And the game reaches showdown
    
    # Test Main Pot Distribution
    Then the main pot should be distributed to eligible winners
    And players should only win pots they're eligible for
    
    # Test Side Pot Distribution
    Then each side pot should be awarded independently
    And the best eligible hand should win each pot
    And pot distribution should follow professional poker rules

  Scenario: Test Turn Order and Position Management
    Given I have 6 players for position testing:
      | nickname    | seat | chips |
      | UTG         | 1    | 500   |
      | UTG1        | 2    | 500   |
      | MP          | 3    | 500   |
      | CO          | 4    | 500   |
      | BTN         | 5    | 500   |
      | SB          | 6    | 500   |
    When the game starts with proper position setup
    
    # Test Preflop Turn Order
    Then the turn order should follow poker position rules
    And UTG should act first preflop
    And action should proceed clockwise
    
    # Test Post-Flop Turn Order
    When the flop is dealt
    Then Small Blind should act first post-flop
    And turn order should be maintained correctly
    
    # Test Dealer Button Movement
    When the hand completes and a new hand begins
    Then the dealer button should move clockwise
    And blind positions should update accordingly
    And turn order should adjust for new positions

  Scenario: Test Betting Round Completion Logic
    Given I have 4 players for round completion testing:
      | nickname    | seat | chips |
      | Round1      | 1    | 400   |
      | Round2      | 2    | 400   |
      | Round3      | 3    | 400   |
      | Round4      | 4    | 400   |
    When betting round completion is tested
    
    # Test All Players Act and Match
    When all players perform matching actions
    Then the betting round should complete automatically
    And the next phase should begin
    
    # Test All-In Round Completion
    When some players go all-in
    Then the betting round should complete when appropriate
    And remaining players should be able to continue betting
    
    # Test Fold-to-Win Scenario
    When all but one player folds
    Then the hand should end immediately
    And the remaining player should win the pot
    And no showdown should occur

  Scenario: Test Real-Time Updates and UI Synchronization
    Given I have 3 players for real-time testing:
      | nickname    | seat | chips |
      | RealTime1   | 1    | 300   |
      | RealTime2   | 2    | 300   |
      | RealTime3   | 3    | 300   |
    When real-time poker actions are performed
    
    # Test Immediate UI Updates
    Then each action should update the UI immediately
    And chip counts should reflect changes instantly
    And pot amounts should update in real-time
    And current player indicators should move correctly
    
    # Test WebSocket Synchronization
    Then all connected clients should receive updates
    And game state should remain synchronized
    And observer mode should work correctly
    
    # Test Action Validation in Real-Time
    Then invalid actions should be rejected immediately
    And appropriate error messages should be displayed
    And the game state should remain consistent 