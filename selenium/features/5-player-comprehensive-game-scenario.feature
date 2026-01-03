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

    # Round 1: BU=Player1, SB=Player2, BB=Player3
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

    # History + pot + invariants
    And I should see game history entry "GH-1"
    And I should see game history entry "GH-2"
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

    # Privacy/Isolation: only own cards visible; Observer sees no hole cards
    And each player should see their own hole cards with position labels
    And each player should not see other players' hole cards (should be hidden or backs)
    And Observer should not see any player's hole cards before showdown
    And the observer list should contain only "Observer"
    And I verify exactly 5 players are present at the tournament table

    When the pre-flop betting round begins with first-to-act action (5-handed)
    Then the current player to act should be "Player4" (UTG is first to act in 5-handed)
    And only the current player should have enabled action controls
    And all other players should have disabled action controls
    And Observer should have no action controls
    And I capture screenshot "R1_preflop_first_to_act" showing first player to act

    # Critical sequence for chip conservation
    And Player4 (UTG) calls $10
    Then I should see enhanced game history: "Player4 (UTG) calls $10 — Stack: $100 → $90"
    And I should see game history entry "GH-3"
    And Player4 stack should be $90
    And the pot should be $25
    And the sum of all player stacks should be $500

    And Player5 (UTG+1) folds A♥Q♦
    And I should see game history entry "GH-4"
    And the pot should be $25

    And Player1 (BU/BTN) raises to $25
    Then I should see enhanced game history: "Player1 (BU/BTN) raises to $25 — Stack: $100 → $75"
    And I should see game history entry "GH-5"
    And Player1 stack should be $75
    And the pot should be $50
    And the sum of all player stacks should be $500
    And I capture screenshot "R1_preflop_player1_raise" showing BTN raise

    And Player2 (SB) folds Q♥J♥
    And I should see game history entry "GH-6"
    And the pot should be $50

    And Player3 (BB) goes all-in for $100 total with weak hand 7♣2♠ as desperate bluff
    Then I should see enhanced game history: "Player3 (BB) raises to $100 (all-in) — Stack: $90 → $0"
    And I should see game history entry "GH-7"
    And Player3 stack should be $0
    And the pot should be $140
    And the sum of all player stacks should be $500
    And I capture screenshot "R1_preflop_bb_allin_bluff" showing Player3 all-in

    And Player4 calls $90 more (all-in) with pocket 10s
    Then I should see enhanced game history: "Player4 calls $90 (all-in) — Stack: $90 → $0"
    And I should see game history entry "GH-8"
    And Player4 stack should be $0
    And the pot should be $230
    And the sum of all player stacks should be $500
    And I capture screenshot "R1_preflop_utg_call_allin" showing Player4 call all-in

    And Player1 (BU/BTN) folds A♠K♠ to all-in
    And I should see game history entry "GH-9"
    And the pot should be $230
    And I capture screenshot "R1_preflop_all_fold_to_allin" showing all folds complete

    # After all actions, no one except all-in players should have action controls
    And only system/dealer should progress streets automatically
    And Observer should still have no action controls

    When the flop is dealt: A♣, 8♠, 5♥
    And I should see game history entry "GH-10"
    And all active players should see the same community cards: A♣, 8♠, 5♥
    And I capture screenshot "R1_flop_community_cards_revealed" showing flop cards

    And the turn is dealt: K♦
    And I should see game history entry "GH-11"
    And all active players should see the same community cards: A♣, 8♠, 5♥, K♦
    And I capture screenshot "R1_turn_fourth_card_revealed" showing turn card

    And the river is dealt: 9♣
    And I should see game history entry "GH-12"
    And all active players should see the same community cards: A♣, 8♠, 5♥, K♦, 9♣
    And I capture screenshot "R1_river_final_board_complete" showing river card

    When the showdown begins for round 1
    Then Player4 should win with "pair of tens"
    And I should see winner popup for "Player4"
    And winner popup should disappear within 3 to 5 seconds
    And I should see game history entry "GH-13"
    And I should see game history entry "GH-14" showing elimination or loss
    And I should see game history entry "GH-15" showing "Player4" won pot amount $230 (no fee)
    And Player3 should lose with "seven high"
    And Player3 should be eliminated from the tournament

    # Elimination hard constraints
    And Player3 should have exactly 0 chips
    And Player3 status should be "Eliminated"
    And Player3 should not appear in the action order indicator
    And Player3 should have no enabled action buttons
    And Player3 should not appear in the observer list
    And I update tournament state: Player3 eliminated, 4 players remain
    And I capture screenshot "R1_river_player3_eliminated" showing elimination

    Then tournament round 1 should be complete with results (no fee, total chips conserved):
      | Player  | Status     | Stack |
      | Player1 | Active     | $75   |
      | Player2 | Active     | $95   |
      | Player3 | Eliminated | $0    |
      | Player4 | Active     | $230  |
      | Player5 | Active     | $100  |
    And I verify exactly 4 players remain active in tournament
    And the sum of all player stacks should be $500
    And eliminated players should have exactly $0 chips

    # UI chip verification
    And Player "Player4" should have 230 chips in the UI
    And Player "Player1" should have 75 chips in the UI
    And Player "Player2" should have 95 chips in the UI
    And Player "Player5" should have 100 chips in the UI

    # Observer list invariant after round complete
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
    And eliminated seats should be skipped in BU movement:
      | Seat |
      | 3    |
    # 4-handed: BU posts SB
    And tournament round 2 positions should be assigned as (4-handed):
      | Seat | Player  | Position | Notes                           |
      | 2    | Player2 | BU/SB    | Posts SB, last to act post-flop |
      | 4    | Player4 | BB       | Posts BB                        |
      | 5    | Player5 | UTG      | First to act pre-flop           |
      | 1    | Player1 | CO       | Second to act pre-flop          |
    And the game starts with tournament round 2 blinds structure:
      | Position    | Player  | Amount | Enhanced Format                       |
      | Small Blind | Player2 | $10    | Player2 (SB/BU) posts small blind $10 |
      | Big Blind   | Player4 | $20    | Player4 (BB) posts big blind $20      |

    And I should see game history entry "GH-16"
    And I should see game history entry "GH-17"
    And the pot should be $30 with enhanced display "[Pot: $30]"
    And the sum of all player stacks should be $500
    And the observer list should contain only "Observer"
    And I capture screenshot "R2_setup_blinds_10_20" showing round 2 setup

    When hole cards are dealt for tournament round 2:
      | Player  | Card1 | Card2 | Hand Strength | Strategy         |
      | Player1 | K♠    | 6♦    | Marginal      | Short Stack Push |
      | Player2 | A♥    | Q♠    | Strong        | Call all-in      |
      | Player4 | J♦    | J♠    | Good Pair     | Fold             |
      | Player5 | 8♣    | 8♥    | Medium Pair   | Fold             |
    Then I capture screenshot "R2_preflop_hole_cards_dealt" for remaining 4 players
    And I verify exactly 4 players are present at the tournament table

    # Privacy/Observer isolation again
    And each player should see only their own hole cards
    And Observer should not see any player's hole cards before showdown
    And the observer list should contain only "Observer"

    When the pre-flop betting round begins with first-to-act action (4-handed)
    Then the current player to act should be "Player5" (UTG is first to act in 4-handed)
    And only the current player should have enabled action controls
    And all other active players should have disabled action controls
    And Observer should have no action controls

    And Player5 folds 8♣8♥
    And I should see game history entry "GH-18"

    And Player1 goes all-in with remaining $75 (short stack push)
    Then I should see enhanced game history: "Player1 raises to $75 (all-in) — Stack: $75 → $0"
    And I should see game history entry "GH-19"
    And Player1 stack should be $0
    And the pot should be $105
    And the sum of all player stacks should be $500
    And I capture screenshot "R2_preflop_player1_allin_push" showing Player1 short stack push

    And Player2 (SB/BU) calls $65 more (already posted $10 SB, total investment $75 to cover)
    Then I should see enhanced game history: "Player2 (SB/BU) calls $65 — Stack: $85 → $20"
    And I should see game history entry "GH-20"
    And Player2 stack should be $20
    And the pot should be $170
    And the sum of all player stacks should be $500
    And I capture screenshot "R2_preflop_player2_call" showing call action

    And Player4 (BB) folds J♦J♠ to all-in
    And I should see game history entry "GH-21"
    And the pot should be $170
    And I capture screenshot "R2_preflop_others_fold_complete" showing all folds complete

    When the flop is dealt: A♦, Q♣, 3♠
    And I should see game history entry "GH-22"
    And all active players should see the same community cards: A♦, Q♣, 3♠
    And I capture screenshot "R2_flop_aq3_board" showing flop cards

    And the turn is dealt: 7♥
    And I should see game history entry "GH-23"
    And I capture screenshot "R2_turn_seven_added" showing turn card

    And the river is dealt: 2♦
    And I should see game history entry "GH-24"
    And I capture screenshot "R2_river_deuce_completes_board" showing river card

    When the showdown begins for round 2
    Then Player2 should win with "two pair, aces and queens" in tournament
    And I should see winner popup for "Player2"
    And winner popup should disappear within 3 to 5 seconds
    And I should see game history entry "GH-25" showing "Player2" won pot amount $170 (no fee)
    And Player1 should lose with "king high"
    And Player1 should be eliminated from the tournament
    And I update tournament state: Player1 eliminated, 3 players remain
    And I capture screenshot "R2_river_player1_eliminated" showing elimination

    Then tournament round 2 should be complete with results (no fee, total chips conserved):
      | Player  | Status     | Stack |
      | Player1 | Eliminated | $0    |
      | Player2 | Active     | $190  |
      | Player3 | Eliminated | $0    |
      | Player4 | Active     | $210  |
      | Player5 | Active     | $100  |
    And the sum of all player stacks should be $500
    And eliminated players should have exactly $0 chips
    And I verify exactly 3 players remain active in tournament

    And Player "Player2" should have 190 chips in the UI
    And Player "Player4" should have 210 chips in the UI
    And Player "Player5" should have 100 chips in the UI

    # Elimination + observer isolation
    And Player1 should not appear in the action order indicator
    And Player1 should have no enabled action buttons
    And Player1 should not appear in the observer list
    And the observer list should contain only "Observer"
    And I capture screenshot "R2_round2_complete" showing final state


    ########################################################################
    # Round 3 (3-handed Championship) - Player5 eliminated, Player2 wins
    ########################################################################
    And cards for tournament round 3 are set as "5-player-round-3.json"
    And I start tournament round 3 with blinds $20/$40
    And I manually start the game for table 1 round 3

    Then exactly one player should have the BU marker in the UI
    And the BU (dealer button) should be "Player4"
    And eliminated seats should be skipped in BU movement:
      | Seat |
      | 1    |
      | 3    |
    # 3-handed: BU is first to act pre-flop
    And tournament round 3 positions should be assigned as (3-handed):
      | Seat | Player  | Position | Notes                              |
      | 4    | Player4 | BU       | First to act pre-flop              |
      | 5    | Player5 | SB       | Posts SB, second to act pre-flop   |
      | 2    | Player2 | BB       | Posts BB, last to act pre-flop     |
    And the game starts with tournament round 3 blinds structure:
      | Position    | Player  | Amount | Enhanced Format                       |
      | Small Blind | Player5 | $20    | Player5 (SB) posts small blind $20    |
      | Big Blind   | Player2 | $40    | Player2 (BB) posts big blind $40      |

    And I should see game history entry "GH-26"
    And I should see game history entry "GH-27"
    And the pot should be $60 with enhanced display "[Pot: $60]"
    And the sum of all player stacks should be $500
    And the observer list should contain only "Observer"
    And I capture screenshot "R3_final_setup" showing final 3 players

    When hole cards are dealt for tournament round 3 (championship):
      | Player  | Card1 | Card2 | Hand Strength | Strategy   |
      | Player2 | A♠    | A♦    | Premium Pair  | Call       |
      | Player4 | K♥    | Q♣    | Strong High   | Raise/Call |
      | Player5 | 9♠    | 9♦    | Medium Pair   | All-in     |
    Then I capture screenshot "R3_preflop_final_hole_cards" for final 3 players
    And I verify exactly 3 players are present at the tournament table

    # Privacy + observer isolation again
    And each player should see only their own hole cards
    And Observer should not see any player's hole cards before showdown
    And the observer list should contain only "Observer"

    When the pre-flop betting round begins with first-to-act action (3-handed)
    Then the current player to act should be "Player4" (BU is first to act in 3-handed pre-flop)
    And only the current player should have enabled action controls
    And all other active players should have disabled action controls
    And Observer should have no action controls

    And Player4 (BU) raises to $100
    Then I should see enhanced game history: "Player4 (BU) raises to $100 — Stack: $210 → $110"
    And I should see game history entry "GH-28"
    And Player4 stack should be $110
    And the pot should be $160
    And the sum of all player stacks should be $500
    And I capture screenshot "R3_preflop_player4_raise" showing BU raise

    And Player5 (SB) goes all-in for $100 total (already posted $20, raising $80 more)
    Then I should see enhanced game history: "Player5 (SB) raises to $100 (all-in) — Stack: $80 → $0"
    And I should see game history entry "GH-29"
    And Player5 stack should be $0
    And the pot should be $240
    And the sum of all player stacks should be $500

    And Player2 (BB) calls $60 more (already posted $40 BB, total investment $100)
    Then I should see enhanced game history: "Player2 (BB) calls $60 — Stack: $150 → $90"
    And I should see game history entry "GH-30"
    And Player2 stack should be $90
    And the pot should be $300
    And the sum of all player stacks should be $500

    And Player4 calls $0 more (already at $100)
    Then I should see enhanced game history: "Player4 checks action (already at cap) — Stack: $110 → $110"
    And I should see game history entry "GH-31"
    And Player4 stack should be $110
    And the pot should be $300
    And the sum of all player stacks should be $500
    And I capture screenshot "R3_preflop_all_actions_complete" showing all-in situation

    When the flop is dealt: 7♠, J♣, 4♦
    And I should see game history entry "GH-32"
    And I capture screenshot "R3_flop_seven_jack_four" showing championship flop

    And the turn is dealt: 8♥
    And I should see game history entry "GH-33"
    And I capture screenshot "R3_turn_eight_added" showing championship turn

    And the river is dealt: J♥
    And I should see game history entry "GH-34"
    And I capture screenshot "R3_river_jack_pairs_board" showing championship river

    When the championship showdown begins
    Then Player2 should win with "two pair, aces and jacks" in tournament
    And I should see winner popup for "Player2"
    And winner popup should disappear within 3 to 5 seconds
    And I should see game history entry "GH-35" showing winner payout $300 (no fee)
    And Player5 should lose with "two pair, jacks and nines"
    And Player5 should be eliminated from the tournament
    And Player2 should be declared tournament champion
    And I should see game history entry "GH-36"
    And I update tournament state: Player2 wins championship
    And I capture screenshot "R3_river_tournament_champion" showing victory

    Then the tournament should be complete with final standings:
      | Place | Player  | Status        | Final Stack |
      | 1st   | Player2 | Champion      | $390        |
      | 2nd   | Player4 | Runner-up     | $110        |
      | 3rd   | Player5 | Eliminated R3 | $0          |
      | 4th   | Player1 | Eliminated R2 | $0          |
      | 5th   | Player3 | Eliminated R1 | $0          |

    And I verify tournament progression was correct:
      | Round | Blinds  | BU      | Eliminated | Remaining |
      | 1     | $5/$10  | Player1 | Player3    | 4         |
      | 2     | $10/$20 | Player2 | Player1    | 3         |
      | 3     | $20/$40 | Player4 | Player5    | Winner    |

    And tournament blinds progressed from $5/$10 to $10/$20 to $20/$40
    And exactly 2 players should remain after championship round
    And tournament status should be "Completed"
    And no further hands can be started
    And all start/next-hand controls should be disabled for all clients

    # Final invariants (no fee)
    And the sum of all player stacks should be $500
    And eliminated players should have exactly $0 chips

    # Observer list invariant at end
    And the observer list should contain only "Observer"
    And I capture screenshot "R3_river_tournament_complete" showing final standings
    And I capture final screenshot "tournament_complete_evidence"

    # History integrity checks (STRICT)
    Then I should see exactly 36 game history entries
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
    And all game history entries should have unique IDs
    And game history entries should be in chronological order

    Then all browser instances should be closed

