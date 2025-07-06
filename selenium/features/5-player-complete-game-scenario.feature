Feature: 5-Player Complete Game Scenario (UI-Only)
  As a poker game system
  I want to execute a complete 5-player Texas Hold'em game using only UI interactions
  So that I can validate complex multi-player game mechanics with pure frontend testing

  @comprehensive-50-percent
  Scenario: 50% Coverage - Setup + Pre-Flop + Basic Flop (Comprehensive)
    # DATABASE RESET
    Given the database is reset to a clean state
    And the User table is seeded with test players
    # GAME SETUP (20% coverage)
    Given I have 5 players ready to join a poker game
    And all players have starting stacks of $100
    When players join the table in order:
      | Player   | Seat | Stack |
      | Player1  | 1    | $100  |
      | Player2  | 2    | $100  |
      | Player3  | 3    | $100  |
      | Player4  | 4    | $100  |
      | Player5  | 5    | $100  |
    Then all players should be seated correctly:
      | Player  | Seat |
      | Player1 | 1    |
      | Player2 | 2    |
      | Player3 | 3    |
      | Player4 | 4    |
      | Player5 | 5    |
    
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
      | Player1 | 6♠    | 8♦    |
      | Player2 | A♥    | Q♥    |
      | Player3 | J♣    | K♣    |
      | Player4 | J♠    | 10♠   |
      | Player5 | Q♦    | 2♦    |
    Then each player should see their own hole cards
    
    # PRE-FLOP BETTING (Adds 15% coverage - total 35%)
    When the pre-flop betting round begins
      And Player4 raises to $6
  And Player5 calls $6
  And Player1 folds
  And Player2 re-raises to $16
  And Player3 calls $10 more
  And Player4 calls $10 more
  And Player5 folds
    Then the pot should be $54
    And 2 players should remain in the hand: Player2, Player3
    
    # BASIC FLOP (Adds 15% coverage - total 50%)
    When the flop is dealt: K♣, Q♥, 10♦
    And Player2 checks
    And Player3 bets $20
    And Player2 calls $20
    Then the pot should be $94
    And both players should see the 3 flop cards
    And Player2 should have top pair with Q♥
    And Player3 should have top pair with K♣ and straight draw potential

  Scenario: Complete 5-Player Texas Hold'em Game with Specific Cards and Actions
    Given the database is reset to a clean state
    And the User table is seeded with test players
    Given I have 5 players ready to join a poker game
    And all players have starting stacks of $100
    When players join the table in order:
      | Player   | Seat | Stack |
      | Player1  | 1    | $100  |
      | Player2  | 2    | $100  |
      | Player3  | 3    | $100  |
      | Player4  | 4    | $100  |
      | Player5  | 5    | $100  |
    Then all players should be seated correctly:
      | Player  | Seat |
      | Player1 | 1    |
      | Player2 | 2    |
      | Player3 | 3    |
      | Player4 | 4    |
      | Player5 | 5    |
    When I manually start the game for table 1
    Then the game starts with blinds structure:
      | Position    | Player  | Amount |
      | Small Blind | Player1 | $1     |
      | Big Blind   | Player2 | $2     |
    And the pot should be $3
    
  Scenario: Specific Hole Cards Distribution
    Given a 5-player game is in progress
    When hole cards are dealt according to the test scenario:
      | Player  | Card1 | Card2 |
      | Player1 | 6♠    | 8♦    |
      | Player2 | A♥    | Q♥    |
      | Player3 | J♣    | K♣    |
      | Player4 | J♠    | 10♠   |
      | Player5 | Q♦    | 2♦    |
    Then each player should see their own hole cards
    And each player should see 2 face-down cards for other players

  Scenario: Pre-Flop Betting Round
    Given hole cards have been dealt to 5 players
    And the pot is $3 from blinds
    When the pre-flop betting round begins
    And Player3 raises to $6
    And Player4 calls $6
    And Player5 folds
    And Player1 calls $5 more (completing small blind call)
    And Player2 re-raises to $16
    And Player3 calls $10 more
    And Player4 folds
    And Player1 folds
    Then the pot should be $44
    And 2 players should remain in the hand: Player2, Player3
    And Player4 should have $94 remaining
    And Player1 should have $93 remaining
    And Player5 should have $100 remaining

  Scenario: Flop Community Cards and Betting
    Given 2 players remain after pre-flop: Player2, Player3
    And the pot is $44
    When the flop is dealt: K♠, Q♠, 10♥
    And Player2 checks
    And Player3 bets $20
    And Player2 calls $20
    Then the pot should be $84
    And both players should see the 3 flop cards
    And Player2 should have top pair with Q♥
    And Player3 should have top pair with K♣ and straight draw potential

  Scenario: Turn Card and All-In Action
    Given the flop betting is complete with pot at $81
    When the turn card J♥ is dealt
    And Player2 bets $30
    And Player3 raises to $60
    And Player2 goes all-in for $54 total remaining
    And Player3 calls the remaining $24
    Then the pot should be $252
    And Player2 should be all-in
    And Player3 should have chips remaining
    And Player2 should have two pair potential
    And Player3 should have two pair: K♣ and J♠

  Scenario: River Card and Showdown
    Given both players are committed to showdown
    And the pot is $252
    When the river card 8♥ is dealt
    Then the final board should be: K♠, Q♠, 10♥, J♥, 8♥
    And the showdown should occur automatically

  Scenario: Hand Evaluation and Winner Determination
    Given the showdown occurs with final board: K♠, Q♠, 10♥, J♥, 8♥
    When hands are evaluated:
      | Player  | Hole Cards | Best Hand                    | Hand Type     |
      | Player2 | A♥, Q♥     | A♥, Q♥, J♥, 10♥, 8♥ (Flush) | Ace-high flush|
      | Player3 | J♣, K♣     | K♣, K♠, J♣, J♥, Q♠ (Two Pair)| Kings over Jacks|
    Then Player2 should win with "Ace-high flush"
    And Player2 should receive the pot of $252
    And the action history should show the complete game sequence

  Scenario: Final Stack Verification
    Given the game is complete
    When final stacks are calculated
    Then the stack distribution should be:
      | Player  | Final Stack | Net Change |
      | Player1 | $93         | -$7        |
      | Player2 | $195        | +$95       |
      | Player3 | $0          | -$100      |
      | Player4 | $94         | -$6        |
      | Player5 | $100        | $0         |
    And the total chips should remain $500
    And the game state should be ready for a new hand

  Scenario: Action History Completeness
    Given the 5-player game scenario is complete
    Then the action history should contain all actions in sequence:
      | Phase    | Player  | Action        | Amount | Pot After |
      | Blinds   | Player1 | Small Blind   | $1     | $1        |
      | Blinds   | Player2 | Big Blind     | $2     | $3        |
      | Pre-Flop | Player3 | Raise         | $6     | $9        |
      | Pre-Flop | Player4 | Call          | $6     | $15       |
      | Pre-Flop | Player5 | Fold          | $0     | $15       |
      | Pre-Flop | Player1 | Call          | $5     | $20       |
      | Pre-Flop | Player2 | Re-raise      | $14    | $34       |
      | Pre-Flop | Player3 | Call          | $10    | $44       |
      | Pre-Flop | Player4 | Fold          | $0     | $44       |
      | Pre-Flop | Player1 | Fold          | $0     | $44       |
      | Flop     | Player2 | Check         | $0     | $44       |
      | Flop     | Player3 | Bet           | $20    | $64       |
      | Flop     | Player2 | Call          | $20    | $84       |
      | Turn     | Player2 | Bet           | $30    | $114      |
      | Turn     | Player3 | Raise         | $60    | $174      |
      | Turn     | Player2 | All-in        | $54    | $252      |
      | Turn     | Player3 | Call          | $24    | $252      |
    And each action should include player name, action type, amount, and resulting pot size

  Scenario: Game State Transitions
    Given a 5-player scenario is being executed
    Then the game should transition through states correctly:
      | State           | Active Players | Pot Amount | Community Cards |
      | Initial         | 5              | $0         | 0               |
      | Blinds Posted   | 5              | $3         | 0               |
      | Pre-Flop        | 5→2            | $44        | 0               |
      | Flop            | 2              | $84        | 3               |
      | Turn            | 2              | $250       | 4               |
      | River           | 2              | $250       | 5               |
      | Showdown        | 0              | $0         | 5               |
    And each transition should be properly recorded and validated 