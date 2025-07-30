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
    When I manually start the game for table 1
    Then the game starts with blinds structure:
      | Position    | Player  | Amount |
      | Small Blind | Player1 | $1     |
      | Big Blind   | Player2 | $2     |
    And the pot should be $3

  @quick-2-player
  Scenario: Quick 2-Player Setup Test
    # Background setup already completed
    Then game setup should be complete for 2 players

  @comprehensive-2-player
  Scenario: Complete 2-Player Texas Hold'em Game with Specific Cards and Actions
    # Background setup already completed
    When hole cards are dealt according to the test scenario:
      | Player  | Card1 | Card2 |
      | Player1 | A♠    | K♠    |
      | Player2 | Q♥    | J♥    |
    Then each player should see their own hole cards
    And each player should see 2 face-down cards for other players
    When the pre-flop betting round begins
    Then force all players to join game rooms
    And manually trigger game state update from backend
    And verify current player information in all browsers
    And the current player should see a decision timer
    And Player1 raises to $6
    And the current player should see a decision timer
    And Player2 calls $4 more
    Then the pot should be $12
    And 2 players should remain in the hand: Player1, Player2
    When the flop is dealt: A♣, Q♠, 9♥
    And Player1 bets $8
    And Player2 calls $8
    Then the pot should be $28
    And both players should see the 3 flop cards
    And Player1 should have top pair with A♠
    And Player2 should have top pair with Q♥
    When the turn is dealt: K♣
    And Player1 bets $15
    And Player2 calls $15
    Then the pot should be $58
    And both players should see the turn card K♣
    And Player1 should have two pair with A♠K♠
    And Player2 should have straight draw potential
    When the river is dealt: 10♥
    And Player1 bets $20
    And Player2 goes all-in with remaining chips
    And Player1 calls the all-in
    Then the pot should contain all remaining chips
    And the showdown should reveal both players' cards
    And Player2 should win with "straight"
    And the game should end with proper chip distribution

  @heads-up-poker
  Scenario: Heads-Up Pre-Flop All-In
    # Background setup already completed
    When hole cards are dealt according to the test scenario:
      | Player  | Card1 | Card2 |
      | Player1 | A♠    | A♥    |
      | Player2 | K♣    | K♦    |
    Then each player should see their own hole cards
    When the pre-flop betting round begins
    And Player1 goes all-in with remaining chips
    And Player2 calls the all-in
    Then the pot should contain all remaining chips
    And the showdown should reveal both players' cards
    And Player1 should win with "pair of aces"
    And the game should end with proper chip distribution