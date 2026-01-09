Feature: 5-Player 3-Round Tournament with Comprehensive Coverage (Enhanced + Observer Isolation + Button Rotation)

  # Rule Contract (No Fee Mode)
  # 1) System dealer is fixed.
  # 2) BU rotates clockwise to the next ACTIVE seat, skipping eliminated seats.
  # 3) SB/BB and action order are derived from BU.
  # 4) No rake/ante: total chips always exactly $500.
  # 5) Observer list must never contain any tournament player.

  Background:
    Given the database is reset to a clean state
    And the User table is seeded with test players
    And I initialize tournament state tracking for 5 players:
      | Player  | Seat | Starting Stack | Status |
      | Player1 | 1    | $100           | Active |
      | Player2 | 2    | $100           | Active |
      | Player3 | 3    | $100           | Active |
      | Player4 | 4    | $100           | Active |
      | Player5 | 5    | $100           | Active |
    And I have exactly 5 players ready for tournament play
    When exactly 5 players join the tournament table with seats:
      | Player  | Seat |
      | Player1 | 1    |
      | Player2 | 2    |
      | Player3 | 3    |
      | Player4 | 4    |
      | Player5 | 5    |
    Then all players should be seated correctly at the tournament table
    And I verify exactly 5 players are present at the tournament table
    And the page should be fully loaded for all players

    # Global invariants at setup
    And the system dealer should remain fixed (Automated dealer)
    And the total tournament chips should be $500
    And the observer list should contain only "Observer"
    And I capture screenshot "tournament_setup_5players" showing all players

  @tournament-3-round
  Scenario: 3-Round 5-Player Tournament with Player Elimination (Enhanced + Button Rotation + Observer Isolation)

    ########################################################################
    # Round 1 (5-handed) - Player3 eliminated
    ########################################################################
    And cards for tournament round 1 are set as "5-player-round-1.json"
    And I start tournament round 1 with blinds $5/$10
    And I manually start the game for table 1

    Then exactly one player should have the BU marker in the UI
    And the BU (dealer button) should be "Player1"
    And tournament round 1 positions should be assigned as:
      | Seat | Player  | Position |
      | 1    | Player1 | BU/BTN   |
      | 2    | Player2 | SB       |
      | 3    | Player3 | BB       |
      | 4    | Player4 | UTG      |
      | 5    | Player5 | UTG+1    |
    And the game starts with tournament round 1 blinds structure:
      | Position    | Player  | Amount | Enhanced Format                       |
      | Small Blind | Player2 | $5     | Player2 (SB) posts small blind $5     |
      | Big Blind   | Player3 | $10    | Player3 (BB) posts big blind $10      |

    # Strict GH - blinds
    And I should see game history entry "GH-1"   # Player2 posts SB $5
    And I should see game history entry "GH-2"   # Player3 posts BB $10
    And the pot should be $15 with enhanced display "[Pot: $15]"
    And the sum of all player stacks should be $500
    And the observer list should contain only "Observer"
    And I capture screenshot "R1_game_setup_blinds_5_10" showing round 1 setup

    When hole cards are dealt for tournament round 1:
      | Player  | Card1 | Card2 | Hand Strength | Strategy          |
      | Player1 | A♠    | K♠    | Premium       | Raise then fold   |
      | Player2 | Q♥    | J♥    | Strong        | Fold to aggression|
      | Player3 | 7♣    | 2♠    | Weak          | Desperate All-in  |
      | Player4 | 10♦   | 10♣   | Good Pair     | Call all-in       |
      | Player5 | A♥    | Q♦    | Strong        | Fold              |
    Then I capture screenshot "R1_preflop_hole_cards_dealt" for all 5 players
    And each player should see their own hole cards with position labels
    And each player should not see other players' hole cards (should be hidden or backs)
    And Observer should not see any player's hole cards before showdown
    And the observer list should contain only "Observer"

    When the pre-flop betting round begins with first-to-act action (5-handed)
    Then the current player to act should be "Player4" (UTG)
    And only the current player should have enabled action controls
    And all other players should have disabled action controls
    And Observer should have no action controls

    # Preflop actions (strict GH)
    And Player4 (UTG) calls $10
    Then I should see game history entry "GH-3"
    And the pot should be $25

    And Player5 (UTG+1) folds A♥Q♦
    Then I should see game history entry "GH-4"
    And the pot should be $25

    And Player1 (BU/BTN) raises to $25
    Then I should see game history entry "GH-5"
    And the pot should be $50

    And Player2 (SB) folds Q♥J♥
    Then I should see game history entry "GH-6"
    And the pot should be $50

    And Player3 (BB) goes all-in for $100 total
    Then I should see game history entry "GH-7"
    And the pot should be $140

    And Player4 calls $90 more (all-in)
    Then I should see game history entry "GH-8"
    And the pot should be $230

    And Player1 folds to all-in
    Then I should see game history entry "GH-9"
    And the pot should be $230

    # Streets - strict mode: dealt + street action start + auto-advance notes
    When the flop is dealt: A♣, 8♠, 5♥
    Then I should see game history entry "GH-10"  # Flop dealt
    And I should see game history entry "GH-11"  # Flop action start (all-in)
    And I should see game history entry "GH-12"  # Flop auto-advance

    When the turn is dealt: K♦
    Then I should see game history entry "GH-13"  # Turn dealt
    And I should see game history entry "GH-14"  # Turn action start (all-in)
    And I should see game history entry "GH-15"  # Turn auto-advance

    When the river is dealt: 9♣
    Then I should see game history entry "GH-16"  # River dealt
    And I should see game history entry "GH-17"  # River action start (all-in)
    And I should see game history entry "GH-18"  # River to showdown

    When the showdown begins for round 1
    Then I should see game history entry "GH-19"  # Showdown start
    And I should see game history entry "GH-20"  # Player4 reveals
    And I should see game history entry "GH-21"  # Player3 reveals
    And I should see game history entry "GH-22"  # Player4 wins pot $230
    And I should see game history entry "GH-23"  # Player3 eliminated

    Then tournament round 1 should be complete with results (no fee, total chips conserved):
      | Player  | Status     | Stack |
      | Player1 | Active     | $75   |
      | Player2 | Active     | $95   |
      | Player3 | Eliminated | $0    |
      | Player4 | Active     | $230  |
      | Player5 | Active     | $100  |
    And the sum of all player stacks should be $500
    And the observer list should contain only "Observer"
    And I capture screenshot "R1_round1_complete" showing final tournament state

    ########################################################################
    # Round 2 (4-handed) - Player1 eliminated
    ########################################################################
    And cards for tournament round 2 are set as "5-player-round-2.json"
    And I start tournament round 2 with blinds $10/$20
    And I manually start the game for table 1 round 2

    Then exactly one player should have the BU marker in the UI
    And the BU (dealer button) should be "Player2"
    And the game starts with tournament round 2 blinds structure:
      | Position    | Player  | Amount | Enhanced Format                       |
      | Small Blind | Player2 | $10    | Player2 (SB/BU) posts small blind $10 |
      | Big Blind   | Player4 | $20    | Player4 (BB) posts big blind $20      |

    # Strict GH - blinds
    And I should see game history entry "GH-24"  # Player2 posts SB $10
    And I should see game history entry "GH-25"  # Player4 posts BB $20
    And the pot should be $30 with enhanced display "[Pot: $30]"
    And the observer list should contain only "Observer"

    When the pre-flop betting round begins with first-to-act action (4-handed)
    Then the current player to act should be "Player5" (UTG)

    And Player5 folds
    Then I should see game history entry "GH-26"

    And Player1 goes all-in $75
    Then I should see game history entry "GH-27"

    And Player2 calls $65 more
    Then I should see game history entry "GH-28"

    And Player4 folds
    Then I should see game history entry "GH-29"

    When the flop is dealt: A♦, Q♣, 3♠
    Then I should see game history entry "GH-30"
    And I should see game history entry "GH-31"
    And I should see game history entry "GH-32"

    When the turn is dealt: 7♥
    Then I should see game history entry "GH-33"
    And I should see game history entry "GH-34"
    And I should see game history entry "GH-35"

    When the river is dealt: 2♦
    Then I should see game history entry "GH-36"
    And I should see game history entry "GH-37"
    And I should see game history entry "GH-38"

    When the showdown begins for round 2
    Then I should see game history entry "GH-39"
    And I should see game history entry "GH-40"
    And I should see game history entry "GH-41"
    And I should see game history entry "GH-42"
    And I should see game history entry "GH-43"

    Then tournament round 2 should be complete with results:
      | Player  | Status     | Stack |
      | Player1 | Eliminated | $0    |
      | Player2 | Active     | $190  |
      | Player3 | Eliminated | $0    |
      | Player4 | Active     | $210  |
      | Player5 | Active     | $100  |
    And the sum of all player stacks should be $500
    And the observer list should contain only "Observer"
    And I capture screenshot "R2_round2_complete" showing final state

    ########################################################################
    # Round 3 (3-handed Championship) - Player5 eliminated, Player2 wins
    ########################################################################
    And cards for tournament round 3 are set as "5-player-round-3.json"
    And I start tournament round 3 with blinds $20/$40
    And I manually start the game for table 1 round 3

    And the game starts with tournament round 3 blinds structure:
      | Position    | Player  | Amount | Enhanced Format                       |
      | Small Blind | Player5 | $20    | Player5 (SB) posts small blind $20    |
      | Big Blind   | Player2 | $40    | Player2 (BB) posts big blind $40      |

    # Strict GH - blinds
    And I should see game history entry "GH-44"
    And I should see game history entry "GH-45"
    And the pot should be $60 with enhanced display "[Pot: $60]"
    And the observer list should contain only "Observer"

    When the pre-flop betting round begins with first-to-act action (3-handed)
    Then the current player to act should be "Player4" (BU)

    And Player4 raises to $100
    Then I should see game history entry "GH-46"

    And Player5 goes all-in to $100
    Then I should see game history entry "GH-47"

    And Player2 calls $60 more
    Then I should see game history entry "GH-48"

    And Player4 calls $0 more (already at cap)
    Then I should see game history entry "GH-49"

    When the flop is dealt: 7♠, J♣, 4♦
    Then I should see game history entry "GH-50"
    And I should see game history entry "GH-51"
    And I should see game history entry "GH-52"

    When the turn is dealt: 8♥
    Then I should see game history entry "GH-53"
    And I should see game history entry "GH-54"
    And I should see game history entry "GH-55"

    When the river is dealt: J♥
    Then I should see game history entry "GH-56"
    And I should see game history entry "GH-57"
    And I should see game history entry "GH-58"

    When the championship showdown begins
    Then I should see game history entry "GH-59"
    And I should see game history entry "GH-60"
    And I should see game history entry "GH-61"
    And I should see game history entry "GH-62"
    And I should see game history entry "GH-63"
    And I should see game history entry "GH-64"

    Then the tournament should be complete with final standings:
      | Place | Player  | Status        | Final Stack |
      | 1st   | Player2 | Champion      | $390        |
      | 2nd   | Player4 | Runner-up     | $110        |
      | 3rd   | Player5 | Eliminated R3 | $0          |
      | 4th   | Player1 | Eliminated R2 | $0          |
      | 5th   | Player3 | Eliminated R1 | $0          |

    And the sum of all player stacks should be $500
    And eliminated players should have exactly $0 chips
    And the observer list should contain only "Observer"

    # History integrity checks (STRICT)
    Then I should see exactly 64 game history entries
    And I should see game history entry "GH-1"
    And I should see game history entry "GH-2"
    And I should see game history entry "GH-3"
    And I should see game history entry "GH-4"
    And I should see game history entry "GH-5"
    And I should see game history entry "GH-6"
    And I should see game history entry "GH-7"
    And I should see game history entry "GH-8"
    And I should see game history entry "GH-9"
    And I should see game history entry "GH-10"
    And I should see game history entry "GH-11"
    And I should see game history entry "GH-12"
    And I should see game history entry "GH-13"
    And I should see game history entry "GH-14"
    And I should see game history entry "GH-15"
    And I should see game history entry "GH-16"
    And I should see game history entry "GH-17"
    And I should see game history entry "GH-18"
    And I should see game history entry "GH-19"
    And I should see game history entry "GH-20"
    And I should see game history entry "GH-21"
    And I should see game history entry "GH-22"
    And I should see game history entry "GH-23"
    And I should see game history entry "GH-24"
    And I should see game history entry "GH-25"
    And I should see game history entry "GH-26"
    And I should see game history entry "GH-27"
    And I should see game history entry "GH-28"
    And I should see game history entry "GH-29"
    And I should see game history entry "GH-30"
    And I should see game history entry "GH-31"
    And I should see game history entry "GH-32"
    And I should see game history entry "GH-33"
    And I should see game history entry "GH-34"
    And I should see game history entry "GH-35"
    And I should see game history entry "GH-36"
    And I should see game history entry "GH-37"
    And I should see game history entry "GH-38"
    And I should see game history entry "GH-39"
    And I should see game history entry "GH-40"
    And I should see game history entry "GH-41"
    And I should see game history entry "GH-42"
    And I should see game history entry "GH-43"
    And I should see game history entry "GH-44"
    And I should see game history entry "GH-45"
    And I should see game history entry "GH-46"
    And I should see game history entry "GH-47"
    And I should see game history entry "GH-48"
    And I should see game history entry "GH-49"
    And I should see game history entry "GH-50"
    And I should see game history entry "GH-51"
    And I should see game history entry "GH-52"
    And I should see game history entry "GH-53"
    And I should see game history entry "GH-54"
    And I should see game history entry "GH-55"
    And I should see game history entry "GH-56"
    And I should see game history entry "GH-57"
    And I should see game history entry "GH-58"
    And I should see game history entry "GH-59"
    And I should see game history entry "GH-60"
    And I should see game history entry "GH-61"
    And I should see game history entry "GH-62"
    And I should see game history entry "GH-63"
    And I should see game history entry "GH-64"
    And all game history entries should have unique IDs
    And game history entries should be in chronological order

    Then all browser instances should be closed