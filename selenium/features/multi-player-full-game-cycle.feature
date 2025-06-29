Feature: Multi-Player Full Game Cycle with Comprehensive Actions
  As a poker platform supporting multiple concurrent players
  I want to verify complete game cycles with all poker actions across multiple browser instances
  So that chip calculations and game state remain accurate through extended gameplay

  Background:
    Given the server is running on "http://localhost:3001"
    And the frontend is running on "http://localhost:3000"
    And I have a clean poker table "FullGameTable" with 6 seats

  @multi-browser @full-game-cycle
  Scenario: Three Complete Games with All Poker Actions
    Given I have 3 browser instances with players seated:
      | player   | browser | seat | initial_chips |
      | Player1  | 1       | 1    | 150          |
      | Player2  | 2       | 2    | 150          |
      | Player3  | 3       | 3    | 150          |
    And all players can see the initial seating arrangement
    And all players have their starting chip counts verified

    # GAME 1: Basic Actions with Mixed Outcomes
    When the game starts automatically with enough players
    Then the game should start in all browser instances
    And blinds should be posted correctly:
      | player  | blind_type | amount | remaining_chips |
      | Player1 | small      | 5      | 995            |
      | Player2 | big        | 10     | 990            |
    And all players should receive 2 hole cards each
    And the pot should show 15 chips

    # Preflop Round - Game 1
    When the preflop betting round begins
    Then "Player3" should be first to act
    When "Player3" performs a "call" action with amount 10
    Then "Player3" should have 990 chips remaining
    And the pot should show 25 chips

    When "Player4" performs a "raise" action with amount 30
    Then "Player4" should have 970 chips remaining
    And the pot should show 55 chips
    And the current bet should be 30

    When "Player5" performs a "fold" action
    Then "Player5" should be marked as folded
    And "Player5" should have 1000 chips remaining

    When "Player1" performs a "call" action with amount 25
    Then "Player1" should have 970 chips remaining
    And the pot should show 80 chips

    When "Player2" performs a "call" action with amount 20
    Then "Player2" should have 970 chips remaining
    And the pot should show 100 chips

    When "Player3" performs a "call" action with amount 20
    Then "Player3" should have 970 chips remaining
    And the pot should show 120 chips

    Then the preflop betting round should be complete
    And 4 players should remain active

    # Flop Round - Game 1
    When the flop is dealt with 3 community cards
    Then all browser instances should show 3 community cards
    And the phase should be "flop"

    When the flop betting round begins
    Then "Player1" should be first to act
    When "Player1" performs a "check" action
    When "Player2" performs a "bet" action with amount 50
    Then "Player2" should have 920 chips remaining
    And the pot should show 170 chips

    When "Player3" performs a "call" action with amount 50
    Then "Player3" should have 920 chips remaining
    And the pot should show 220 chips

    When "Player4" performs a "raise" action with amount 150
    Then "Player4" should have 820 chips remaining
    And the pot should show 370 chips

    When "Player1" performs a "fold" action
    Then "Player1" should be marked as folded

    When "Player2" performs a "call" action with amount 100
    Then "Player2" should have 820 chips remaining
    And the pot should show 470 chips

    When "Player3" performs a "fold" action
    Then "Player3" should be marked as folded

    Then the flop betting round should be complete
    And 2 players should remain active

    # Turn and River - Game 1
    When the turn card is dealt
    Then all browser instances should show 4 community cards
    When the turn betting round completes with actions
    When the river card is dealt  
    Then all browser instances should show 5 community cards
    When the river betting round completes with final actions
    When the showdown occurs
    Then the winner should be determined and pot distributed
    And all chip counts should be accurate in all browser instances

    # 15-Second Break Before Next Game
    Then there should be a 15-second countdown break before the next game
    And all players should see the countdown timer
    And the countdown should display remaining time
    When the countdown reaches zero
    Then the next game should be ready to start

    # GAME 2: All-In Scenarios
    When the second game begins
    Then the dealer button should move appropriately
    When players execute all-in scenarios:
      | player | action | amount | creates_side_pot |
      | Player1 | all-in | all    | false           |
      | Player2 | call   | match  | true            |
      | Player3 | fold   | 0      | false           |
      | Player4 | call   | match  | true            |
      | Player5 | fold   | 0      | false           |
    Then side pots should be calculated correctly
    When the hand completes
    Then chip distribution should be accurate across all browsers

    # GAME 3: Complex Mixed Actions
    When the third game begins
    And players execute complex betting patterns throughout all streets
    Then all actions should be processed correctly
    And final chip counts should be mathematically correct

    # Final Verification
    Then after 3 complete games:
      | verification_type | expected_result |
      | total_chips       | 750            |
      | chip_consistency  | true           |
      | game_state_sync   | true           |
      | ui_accuracy       | true           |
    And all browser instances should show identical final states

  @multi-browser @countdown-break
  Scenario: 15-Second Countdown Break Between Games
    Given I have 3 browser instances with players seated:
      | player   | browser | seat | initial_chips |
      | Alpha    | 1       | 1    | 200          |
      | Beta     | 2       | 2    | 200          |
      | Gamma    | 3       | 3    | 200          |
    And all players can see the initial seating arrangement
    And all players have their starting chip counts verified

    # Complete First Game Quickly
    When the game starts automatically with enough players
    Then the game should start in all browser instances
    And blinds should be posted correctly:
      | player | blind_type | amount | remaining_chips |
      | Alpha  | small      | 5      | 195            |
      | Beta   | big        | 10     | 190            |
    
    # Fast-track to game completion for countdown testing
    When all players fold except one
    Then the hand should complete quickly
    And the winner should be determined and pot distributed

    # Test 15-Second Countdown Break
    Then there should be a 15-second countdown break before the next game
    And all players should see the countdown timer
    And the countdown should display remaining time
    And the countdown should show approximately 15 seconds initially
    And the countdown should decrease over time
    When the countdown reaches zero
    Then the next game should be ready to start
    And the dealer button should have moved to the next position
    And all players should be ready for the next hand

    # Verify Second Game Starts Properly
    When the second game begins automatically
    Then blinds should be posted for the new hand
    And all players should receive new hole cards
    And the game state should be fresh and ready

  @multi-browser @stress-test-actions
  Scenario: High-Frequency Action Execution Across Multiple Games
    Given I have 4 browser instances with players seated:
      | player  | browser | seat | initial_chips |
      | Alpha   | 1       | 1    | 800          |
      | Beta    | 2       | 3    | 800          |
      | Gamma   | 3       | 5    | 800          |
      | Delta   | 4       | 6    | 800          |

    When players execute rapid action sequences across 3 games:
      | game | player | actions_sequence                    |
      | 1    | Alpha  | call,raise,call,fold               |
      | 1    | Beta   | call,call,raise,call               |
      | 1    | Gamma  | raise,call,call,check              |
      | 1    | Delta  | fold,observe,observe,observe       |
      | 2    | Alpha  | all-in                             |
      | 2    | Beta   | call,all-in                        |
      | 2    | Gamma  | fold                               |
      | 2    | Delta  | fold                               |
      | 3    | Alpha  | check,call,raise,call              |
      | 3    | Beta   | bet,call,check,call                |
      | 3    | Gamma  | call,raise,call,all-in             |
      | 3    | Delta  | call,call,fold                     |

    Then all actions should be processed correctly
    And chip calculations should remain accurate throughout
    And no race conditions should occur
    And all browser instances should maintain synchronization

  @multi-browser @edge-cases
  Scenario: Edge Cases in Multi-Player Games
    Given I have 6 browser instances with players seated:
      | player    | browser | seat | initial_chips |
      | EdgeCase1 | 1       | 1    | 100          |
      | EdgeCase2 | 2       | 2    | 500          |
      | EdgeCase3 | 3       | 3    | 1000         |
      | EdgeCase4 | 4       | 4    | 50           |
      | EdgeCase5 | 5       | 5    | 2000         |
      | EdgeCase6 | 6       | 6    | 25           |

    # Test edge cases with different chip stacks
    When edge case scenarios are executed:
      | scenario_type        | description                           |
      | micro_stack_all_in   | Player with 25 chips goes all-in     |
      | short_stack_strategy | Player with 50 chips strategic play  |
      | big_stack_pressure   | Player with 2000 chips dominates     |
      | multiple_all_ins     | Multiple players all-in same hand    |
      | side_pot_complexity  | Complex side pot calculations        |
      | disconnect_reconnect | Player disconnect during action      |

    Then all edge cases should be handled correctly
    And chip integrity should be maintained
    And game state should remain consistent across all browsers
    And error handling should be robust

  @multi-browser @performance-test
  Scenario: Performance Test with Extended Gameplay
    Given I have 6 browser instances ready for extended gameplay
    When 10 consecutive games are played with full action coverage
    And each game includes all possible poker actions
    And chip tracking is monitored throughout
    Then the system should maintain performance standards:
      | metric                 | threshold |
      | action_response_time   | < 2s      |
      | ui_update_latency      | < 1s      |
      | chip_calculation_time  | < 500ms   |
      | browser_sync_delay     | < 1s      |
      | memory_usage_stable    | true      |
    And all browser instances should remain responsive
    And no memory leaks should occur

  @multi-browser @page-refresh-persistence
  Scenario: Cross-Browser Online State Consistency During Page Refresh
    Given I have 4 browser instances with players online:
      | player    | browser | seat | status    | chips |
      | Refresh1  | 1       | 1    | seated    | 300   |
      | Refresh2  | 2       | 3    | seated    | 250   |
      | Observer1 | 3       | null | observing | 0     |
      | Observer2 | 4       | null | observing | 0     |
    And all players can see the complete online state across browsers
    And the online user count shows 4 users in all browser instances
    And all seated players are visible in all browsers
    And all observers are visible in all browsers

    # Test 1: Seated Player Page Refresh
    When "Refresh1" refreshes their browser page
    Then "Refresh1" should be automatically reconnected to their seat
    And "Refresh1" should still be in seat 1 with 300 chips
    And the online user count should remain 4 in all browsers
    And all other browsers should show "Refresh1" as still seated
    And no players should appear as disconnected in any browser
    And the game state should be identical across all browsers

    # Test 2: Observer Page Refresh  
    When "Observer1" refreshes their browser page
    Then "Observer1" should be automatically reconnected as observer
    And the online user count should remain 4 in all browsers
    And all browsers should show "Observer1" in the observers list
    And seated players should remain unchanged in all browsers
    And the UI state should be consistent across all browsers

    # Test 3: Multiple Simultaneous Refreshes
    When "Refresh2" and "Observer2" refresh their browsers simultaneously
    Then both should be automatically reconnected within 5 seconds
    And the online user count should remain 4 in all browsers
    And "Refresh2" should still be in seat 3 with 250 chips
    And "Observer2" should still be in the observers list
    And no temporary disconnections should be visible in any browser
    And all game data should remain synchronized

    # Test 4: Refresh During Active Game
    Given the game is actively running with current player "Refresh1"
    When "Refresh1" refreshes during their turn
    Then "Refresh1" should be reconnected and it's still their turn
    And action buttons should be immediately available to "Refresh1"
    And other browsers should show "Refresh1" as the current player
    And the turn timer should continue correctly in all browsers
    And the game flow should not be interrupted

    # Test 5: Network Quality Variations
    When "Refresh1" has a slow page reload (simulated 8-second load)
    Then other browsers should show "Refresh1" as temporarily away
    And the online count should remain 4 but with status indicators
    When "Refresh1" fully reconnects after the slow load
    Then all browsers should show "Refresh1" as fully connected
    And the status indicators should clear in all browsers
    And the game state should be perfectly restored

    # Final Verification
    Then after all refresh tests:
      | verification_type        | expected_result |
      | total_online_users       | 4              |
      | seated_players_count     | 2              |
      | observers_count          | 2              |
      | ui_consistency          | true           |
      | no_phantom_disconnects  | true           |
      | state_synchronization   | perfect        |
    And all browser instances should show identical online states
    And no refresh artifacts should be visible in any browser 