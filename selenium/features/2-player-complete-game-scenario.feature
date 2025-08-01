Feature: 2-Player Complete Game Scenario (UI-Only)

  As a poker game system
  I want to execute a complete 2-player Texas Hold'em game using only UI interactions
  So that I can validate heads-up poker mechanics with minimal browser overhead

  Background:
    Given the database is reset to a clean state
    And the User table is seeded with test players
    And I have exactly 2 players ready to join a poker game
    And all players have starting stacks of $100
    When exactly 2 players join the table in order:
      | Player  | Seat |
      | Player1 | 1    |
      | Player2 | 2    |
    Then all players should be seated correctly:
      | Player  | Seat |
      | Player1 | 1    |
      | Player2 | 2    |
    And the page should be fully loaded for "Player1"
    And the page should be fully loaded for "Player2"
    And the action buttons should be visible at bottom center in this screenshot
    When I manually start the game for table 1
    Then the game starts with blinds structure:
      | Position    | Player  | Amount |
      | Small Blind | Player1 | $1     |
      | Big Blind   | Player2 | $2     |
    And the pot should be $3
    And the action buttons should be visible at bottom center in this screenshot

  @quick-2-player
  Scenario: Quick 2-Player Setup Test
    # Background setup already completed
    Then game setup should be complete for 2 players
    And the observers list should always be empty with seated players

  @comprehensive-2-player
  Scenario: Complete 2-Player Texas Hold'em Game with Specific Cards and Actions
    # Background setup already completed
    When hole cards are dealt according to the test scenario:
      | Player  | Card1 | Card2 |
      | Player1 | A♠    | K♠    |
      | Player2 | Q♥    | J♥    |
    Then I capture screenshot "05_hole_cards_dealt_player1" for Player1
    And I capture screenshot "06_hole_cards_dealt_player2" for Player2
    And each player should see their own hole cards
    And each player should see 2 face-down cards for other players
    And the action buttons should be visible at bottom center in this screenshot
    When the pre-flop betting round begins
    Then I capture screenshot "07_preflop_betting_start_player1" for Player1
    And I capture screenshot "08_preflop_betting_start_player2" for Player2
    And force all players to join game rooms
    And manually trigger game state update from backend
    And verify current player information in all browsers
    And the enhanced action buttons should be visible for the current player
    And the action buttons should have enhanced styling with color variants
    And the action buttons should be visible at bottom center in this screenshot
    And the current player should see a decision timer
    And Player1 raises to $6
    Then I capture screenshot "09_preflop_action_player1" for Player1
    And I capture screenshot "10_preflop_action_player2" for Player2
    And the action buttons should be visible at bottom center in this screenshot
    And the current player should see a decision timer
    And Player2 calls $4 more
    And the action buttons should be visible at bottom center in this screenshot
    Then the pot should be $12
    And 2 players should remain in the hand: Player1, Player2
    And the action buttons should show only for the current player
    And the action buttons should be visible at bottom center in this screenshot
    When the flop is dealt: A♣, Q♠, 9♥
    Then I capture screenshot "11_flop_dealt_player1" for Player1
    And I capture screenshot "12_flop_dealt_player2" for Player2
    And the action buttons should be visible at bottom center in this screenshot
    And Player1 bets $8
    Then I capture screenshot "13_flop_betting_player1" for Player1
    And the action buttons should be visible at bottom center in this screenshot
    And Player2 calls $8
    Then I capture screenshot "14_flop_betting_player2" for Player2
    And the action buttons should be visible at bottom center in this screenshot
    Then the pot should be $28
    And both players should see the 3 flop cards
    And Player1 should have top pair with A♠
    And Player2 should have top pair with Q♥
    And the bet input field should have modern styling
    When the turn is dealt: K♣
    Then I capture screenshot "15_turn_dealt_player1" for Player1
    And I capture screenshot "16_turn_dealt_player2" for Player2
    And the action buttons should be visible at bottom center in this screenshot
    And Player1 bets $15
    Then I capture screenshot "17_turn_betting_player1" for Player1
    And the action buttons should be visible at bottom center in this screenshot
    And Player2 calls $15
    Then I capture screenshot "18_turn_betting_player2" for Player2
    And the action buttons should be visible at bottom center in this screenshot
    Then the pot should be $58
    And both players should see the turn card K♣
    And Player1 should have two pair with A♠K♠
    And Player2 should have straight draw potential
    And the action button container should have dark theme styling
    When the river is dealt: 10♥
    Then I capture screenshot "19_river_dealt_player1" for Player1
    And I capture screenshot "20_river_dealt_player2" for Player2
    And the action buttons should be visible at bottom center in this screenshot
    And Player1 bets $20
    Then I capture screenshot "21_river_betting_player1" for Player1
    And the action buttons should be visible at bottom center in this screenshot
    And Player2 goes all-in with remaining chips
    Then I capture screenshot "22_river_betting_player2" for Player2
    And the action buttons should be visible at bottom center in this screenshot
    And Player1 calls the all-in
    And the action buttons should be visible at bottom center in this screenshot
    Then the pot should contain all remaining chips
    And the showdown should reveal both players' cards
    Then I capture screenshot "23_showdown_player1" for Player1
    And I capture screenshot "24_showdown_player2" for Player2
    And Player2 should win with "straight"
    And the game should end with proper chip distribution
    And the observers list should always be empty with seated players

  @heads-up-poker
  Scenario: Heads-Up Pre-Flop All-In
    # Background setup already completed
    When hole cards are dealt according to the test scenario:
      | Player  | Card1 | Card2 |
      | Player1 | A♠    | A♥    |
      | Player2 | K♣    | K♦    |
    Then each player should see their own hole cards
    And the action buttons should be visible at bottom center in this screenshot
    When the pre-flop betting round begins
    And the action buttons should be visible at bottom center in this screenshot
    And Player1 goes all-in with remaining chips
    And the action buttons should be visible at bottom center in this screenshot
    And Player2 calls the all-in
    And the action buttons should be visible at bottom center in this screenshot
    Then the pot should contain all remaining chips
    And the showdown should reveal both players' cards
    And Player1 should win with "pair of aces"
    And the game should end with proper chip distribution