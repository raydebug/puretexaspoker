Feature: 3-Player Complete Game Scenario (UI-Only)
  As a poker game system
  I want to execute a complete 3-player Texas Hold'em game using only UI interactions
  So that I can validate stable multi-player game mechanics with optimal browser connection management

  @stable-3-player
  Scenario: Complete 3-Player Game - Setup to River (Comprehensive)
    # DATABASE RESET
    Given the database is reset to a clean state
    And the User table is seeded with test players
    
    # GAME SETUP - 3 Players for Optimal Stability
    Given I have exactly 3 players ready to join a poker game
    And all players have starting stacks of $100
    When exactly 3 players join the table in order:
      | Player   | Seat | Stack |
      | Player1  | 1    | $100  |
      | Player2  | 2    | $100  |
      | Player3  | 3    | $100  |
    Then all players should be seated correctly:
      | Player  | Seat |
      | Player1 | 1    |
      | Player2 | 2    |
      | Player3 | 3    |
    
    # PAGE LOADING VERIFICATION
    When the page should be fully loaded for "Player1"
    And the page should be fully loaded for "Player2"
    And the page should be fully loaded for "Player3"
    
    # MANUAL GAME START WITH COUNTDOWN
    When I manually start the game for table 1
    Then the game starts with blinds structure:
      | Position    | Player  | Amount |
      | Small Blind | Player1 | $1     |
      | Big Blind   | Player2 | $2     |
    And the pot should be $3
    
    # HOLE CARDS DEALING
    When hole cards are dealt according to the test scenario:
      | Player  | Card1 | Card2 |
      | Player1 | A♠    | K♠    |
      | Player2 | Q♥    | Q♦    |
      | Player3 | 8♣    | 9♣    |
    Then each player should see their own hole cards
    And each player should see 2 face-down cards for other players
    
    # PRE-FLOP BETTING ROUND
    When the pre-flop betting round begins
    Then force all players to join game rooms
    And manually trigger game state update from backend
    And verify current player information in all browsers
    And Player3 raises to $6
    And Player1 calls $5 more
    And Player2 re-raises to $16
    And Player3 calls $10 more
    And Player1 folds
    Then the pot should be $35
    And 2 players should remain in the hand: Player2, Player3
    And Player1 should have $94 remaining
    
    # FLOP BETTING ROUND
    When the flop is dealt: K♣, Q♠, 9♥
    And Player2 checks
    And Player3 bets $20
    And Player2 calls $20
    Then the pot should be $75
    And both players should see the 3 flop cards
    And Player2 should have top set with Q♥Q♦
    And Player3 should have two pair with 9♣9♥
    
    # TURN BETTING ROUND
    When the turn is dealt: J♠
    And Player2 bets $30
    And Player3 calls $30
    Then the pot should be $135
    And both players should see the turn card J♠
    
    # RIVER BETTING ROUND
    When the river is dealt: 10♥
    And Player2 bets $48
    And Player3 goes all-in with remaining chips
    And Player2 calls the all-in
    Then the pot should contain all remaining chips
    And the showdown should reveal both players' cards
    And Player2 should win with Queens full of Kings
    And the game should end with proper chip distribution

  @quick-3-player
  Scenario: Quick 3-Player Setup Test
    Given the database is reset to a clean state
    And the User table is seeded with test players
    Given I have exactly 3 players ready to join a poker game
    When exactly 3 players join the table in order:
      | Player   | Seat | Stack |
      | Player1  | 1    | $100  |
      | Player2  | 2    | $100  |
      | Player3  | 3    | $100  |
    Then all players should be seated correctly:
      | Player  | Seat |
      | Player1 | 1    |
      | Player2 | 2    |
      | Player3 | 3    |
    When the page should be fully loaded for "Player1"
    And the page should be fully loaded for "Player2"
    And the page should be fully loaded for "Player3"
    Then all 3 players should have stable WebSocket connections