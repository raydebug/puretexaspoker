Feature: Player Decision Time Limit with Circle Countdown
  As a poker platform ensuring fair and timely gameplay
  I want each player to have a 10-second decision time limit with visual countdown
  So that games move at an appropriate pace and players can't stall indefinitely

  Background:
    Given the server is running on "http://localhost:3001"
    And the frontend is running on "http://localhost:3000"
    And I have a clean poker table "TimeoutTable" with 6 seats

  @timeout @circle-countdown
  Scenario: Player Decision Timer Shows Circle Countdown
    Given I have 3 browser instances with players seated:
      | player    | browser | seat | initial_chips |
      | TimerUser1| 1       | 1    | 500          |
      | TimerUser2| 2       | 2    | 500          |
      | TimerUser3| 3       | 3    | 500          |
    When the game starts automatically with enough players
    And the preflop betting round begins
    Then the current player should see a circle countdown timer
    And the timer should be set to 10 seconds
    And the circle should visually count down from 10 to 0
    And other players should see the countdown timer for the active player's seat
    And the timer should be visible in the seat area

  @timeout @auto-fold
  Scenario: Player Auto-Folds After 10 Seconds of Inactivity
    Given I have 3 browser instances with players seated:
      | player     | browser | seat | initial_chips |
      | ActiveUser | 1       | 1    | 500          |
      | SlowUser   | 2       | 2    | 500          |
      | FastUser   | 3       | 3    | 500          |
    When the game starts automatically with enough players
    And the preflop betting round begins
    And "SlowUser" is the current player to act
    When "SlowUser" does not take any action within 10 seconds
    Then "SlowUser" should be automatically folded
    And the action should move to the next player
    And the pot should remain accurate
    And all browser instances should reflect the auto-fold
    And "SlowUser" should be marked as folded in all browsers

  @timeout @action-before-timeout
  Scenario: Player Makes Decision Before Timer Expires
    Given I have 3 browser instances with players seated:
      | player      | browser | seat | initial_chips |
      | QuickUser1  | 1       | 1    | 500          |
      | QuickUser2  | 2       | 2    | 500          |
      | QuickUser3  | 3       | 3    | 500          |
    When the game starts automatically with enough players
    And the preflop betting round begins
    And "QuickUser3" is the current player to act
    When "QuickUser3" performs a "call" action after 5 seconds
    Then the countdown timer should disappear
    And the action should process normally
    And the turn should move to the next player
    And no auto-fold should occur

  @timeout @multiple-rounds
  Scenario: Timer Applies to All Betting Rounds
    Given I have 3 browser instances with players seated:
      | player       | browser | seat | initial_chips |
      | RoundUser1   | 1       | 1    | 500          |
      | RoundUser2   | 2       | 2    | 500          |
      | RoundUser3   | 3       | 3    | 500          |
    When the game starts automatically with enough players
    And the preflop betting round begins
    And all players call to complete preflop
    When the flop is dealt and flop betting begins
    Then each player should have a 10-second timer for their decisions
    When the turn is dealt and turn betting begins
    Then each player should have a 10-second timer for their decisions
    When the river is dealt and river betting begins
    Then each player should have a 10-second timer for their decisions

  @timeout @visual-indicators
  Scenario: Circle Countdown Timer Visual Design Requirements
    Given I have 2 browser instances with players seated:
      | player     | browser | seat | initial_chips |
      | VisualUser1| 1       | 1    | 500          |
      | VisualUser2| 2       | 2    | 500          |
    When the game starts automatically with enough players
    And "VisualUser2" is the current player to act
    Then the countdown timer should have these visual properties:
      | property           | requirement                    |
      | shape              | circular/ring                  |
      | color_full         | green (#4CAF50)               |
      | color_warning      | yellow (#FFC107) at 5 seconds |
      | color_critical     | red (#F44336) at 2 seconds    |
      | position           | within the player's seat area |
      | size               | 40px diameter                 |
      | animation          | smooth countdown transition   |
      | text_display       | remaining seconds in center   |
    And the timer should be clearly visible to all players
    And the timer should not obstruct other UI elements

  @timeout @edge-cases
  Scenario: Timeout Edge Cases and Error Handling
    Given I have 4 browser instances with players seated:
      | player     | browser | seat | initial_chips |
      | EdgeUser1  | 1       | 1    | 500          |
      | EdgeUser2  | 2       | 2    | 500          |
      | EdgeUser3  | 3       | 3    | 500          |
      | EdgeUser4  | 4       | 4    | 500          |
    When the game starts automatically with enough players
    And "EdgeUser4" is the current player to act
    # Test disconnection during countdown
    When "EdgeUser4" disconnects during the countdown timer
    Then the timer should continue counting down
    And "EdgeUser4" should be auto-folded when timer expires
    And the game should continue to the next player
    # Test reconnection
    When "EdgeUser4" reconnects after being auto-folded
    Then "EdgeUser4" should remain folded for the current hand
    And should be able to participate in the next hand

  @timeout @performance
  Scenario: Timer Performance with Multiple Players
    Given I have 6 browser instances with players seated:
      | player     | browser | seat | initial_chips |
      | PerfUser1  | 1       | 1    | 500          |
      | PerfUser2  | 2       | 2    | 500          |
      | PerfUser3  | 3       | 3    | 500          |
      | PerfUser4  | 4       | 4    | 500          |
      | PerfUser5  | 5       | 5    | 500          |
      | PerfUser6  | 6       | 6    | 500          |
    When the game starts automatically with enough players
    And multiple betting rounds occur with timeouts
    Then all timers should be synchronized across all browsers
    And timer animations should be smooth and responsive
    And no timer drift should occur between browser instances
    And CPU usage should remain reasonable during countdown animations

  @timeout @accessibility
  Scenario: Timer Accessibility Features
    Given I have 2 browser instances with players seated:
      | player    | browser | seat | initial_chips |
      | A11yUser1 | 1       | 1    | 500          |
      | A11yUser2 | 2       | 2    | 500          |
    When the game starts automatically with enough players
    And "A11yUser1" is the current player to act
    Then the countdown timer should have accessibility features:
      | feature              | requirement                           |
      | aria_label           | "10 seconds remaining to make decision" |
      | role                 | "timer"                              |
      | aria_live            | "polite"                             |
      | screen_reader_updates| Every 5 seconds and final 3 seconds |
      | keyboard_navigation  | Timer should not interfere           |
      | color_blind_support  | Patterns/shapes in addition to colors|
    And the timer should be compatible with screen readers
    And the timer should not rely solely on color for information

  @timeout @integration
  Scenario: Timer Integration with Existing Game Features
    Given I have 3 browser instances with players seated:
      | player     | browser | seat | initial_chips |
      | IntUser1   | 1       | 1    | 500          |
      | IntUser2   | 2       | 2    | 500          |
      | IntUser3   | 3       | 3    | 500          |
    When the game starts automatically with enough players
    And chat messages are being sent during gameplay
    And sound effects are enabled
    And "IntUser2" is the current player to act
    Then the countdown timer should work correctly with:
      | feature           | expected_behavior                    |
      | chat_system       | Timer visible while chat is active  |
      | sound_effects     | Timer ticking sound if enabled      |
      | action_buttons    | Buttons remain clickable during countdown |
      | game_animations   | Timer doesn't conflict with card animations |
      | seat_management   | Timer pauses if player disconnects  |
    And all game features should remain functional during countdown 