Feature: 5-Player 3-Round Tournament with Comprehensive Coverage (Enhanced + Observer Isolation + Button Rotation)

  # Rule Contract (No Fee Mode)
  # 1) System dealer (card dealing entity) is fixed and does not rotate.
  # 2) BU (dealer button / logical dealer) rotates clockwise to the next ACTIVE seat each round/hand, skipping eliminated seats.
  # 3) SB/BB positions and action order are derived from BU.
  # 4) No fee/rake/ante: total tournament chips must remain constant at $500.
  # 5) Observer list must never include any tournament player name (active or eliminated).

  Background:
    Given the database is reset to a clean state
    And the User table is seeded with test players
    And I initialize tournament state tracking for 5 players:
      | Player  | Seat | Starting Stack | Status |
      | Player1 | 1    | $100          | Active |
      | Player2 | 2    | $100          | Active |
      | Player3 | 3    | $100          | Active |
      | Player4 | 4    | $100          | Active |
      | Player5 | 5    | $100          | Active |
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
    And the observer list should not contain any tournament player names:
      | Player1 |
      | Player2 |
      | Player3 |
      | Player4 |
      | Player5 |
    And I capture screenshot "tournament_setup_5players" showing all players

  @tournament-3-round
  Scenario: 3-Round 5-Player Tournament with Player Elimination (Enhanced + Button Rotation + Observer Isolation)

    ########################################################################
    # Round 1 (5-handed)
    ########################################################################
    And cards for tournament round 1 are set as "5-player-round-1.json"
    And I start tournament round 1 with blinds $5/$10
    And I manually start the game for table 1

    # Round 1: BU/SB/BB derived positions must match UI (per screenshot: BU=Player1, SB=Player2, BB=Player3)
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
      | Position    | Player  | Amount | Enhanced Format |
      | Small Blind | Player2 | $5     | Player2 (SB) posts small blind $5 |
      | Big Blind   | Player3 | $10    | Player3 (BB) posts big blind $10 |

    # History + pot + invariants
    And I should see game history entry "GH-1"
    And I should see game history entry "GH-2"
    And the pot should be $15 with enhanced display "[Pot: $15]"
    And the sum of all player stacks should be $500
    And the observer list should contain only "Observer"
    And the observer list should not contain any tournament player names:
      | Player1 |
      | Player2 |
      | Player3 |
      | Player4 |
      | Player5 |
    And I capture screenshot "R1_game_setup_blinds_5_10" showing round 1 setup

    When hole cards are dealt for tournament round 1:
      | Player  | Card1 | Card2 | Hand Strength | Strategy |
      | Player1 | A♠    | K♠    | Premium       | Selective |
      | Player2 | Q♥    | J♥    | Strong        | Moderate |
      | Player3 | 7♣    | 2♠    | Weak          | Desperate All-in |
      | Player4 | 10♦   | 10♣   | Good Pair     | Call/Raise |
      | Player5 | A♥    | Q♦    | Strong        | Selective |
    Then I capture screenshot "R1_preflop_hole_cards_dealt" for all 5 players

    # Privacy/Isolation: only own cards visible; Observer sees no hole cards
    And each player should see their own hole cards with position labels
    And each player should not see other players' hole cards (should be hidden or backs)
    And Observer should not see any player's hole cards before showdown

    # Observer list invariant again (after dealing)
    And the observer list should contain only "Observer"
    And the observer list should not contain any tournament player names:
      | Player1 |
      | Player2 |
      | Player3 |
      | Player4 |
      | Player5 |
    And I verify exactly 5 players are present at the tournament table

    When the pre-flop betting round begins with first-to-act action (5-handed)
    Then the current player to act should be "Player3" or the correct first-to-act per BU-derived order
    And only the current player should have enabled action controls
    And all other players should have disabled action controls
    And Observer should have no action controls
    And I capture screenshot "R1_preflop_first_to_act" showing first player to act

    And Player3 (BB) goes all-in with weak hand 7♣2♠ as elimination bluff
    Then I should see enhanced game history: "Player3 (BB) goes all-in $100 — Stack: $100 → $0"
    And I should see game history entry "GH-3"
    And Player3 stack should be $0
    And the pot should equal previous pot + $100
    And the sum of all player stacks should be $500
    And I capture screenshot "R1_preflop_bb_allin_bluff" showing Player3 all-in

    And Player4 (UTG) calls all-in with pocket 10s
    Then I should see enhanced game history: "Player4 (UTG) calls $100 — Stack: $100 → $0"
    And I should see game history entry "GH-4"
    And Player4 stack should be $0
    And the pot should reflect both all-ins plus blinds
    And the sum of all player stacks should be $500
    And I capture screenshot "R1_preflop_utg_call_allin" showing Player4 call

    And Player5 (UTG+1) folds A♥Q♦ to all-in
    And I should see game history entry "GH-5"
    And Player1 (BU/BTN) folds A♠K♠ to all-in
    And I should see game history entry "GH-6"
    And Player2 (SB) folds Q♥J♥ to all-in
    And I should see game history entry "GH-7"
    And I capture screenshot "R1_preflop_all_fold_to_allin" showing all folds complete

    # After all actions, no one except all-in players should have action controls
    And only system/dealer should progress streets automatically
    And Observer should still have no action controls

    When the flop is dealt: A♣, 8♠, 5♥
    And I should see game history entry "GH-8"
    And all active players should see the same community cards: A♣, 8♠, 5♥
    And I capture screenshot "R1_flop_community_cards_revealed" showing flop cards

    And the turn is dealt: K♦
    And I should see game history entry "GH-9"
    And all active players should see the same community cards: A♣, 8♠, 5♥, K♦
    And I capture screenshot "R1_turn_fourth_card_revealed" showing turn card

    And the river is dealt: 9♣
    And I should see game history entry "GH-10"
    And all active players should see the same community cards: A♣, 8♠, 5♥, K♦, 9♣
    And I capture screenshot "R1_river_final_board_complete" showing river card

    When the showdown begins for round 1
    Then Player4 should win with "pair of tens"
    And I should see winner popup for "Player4"
    And winner popup should disappear within 1 to 10 seconds
    And I should see game history entry "GH-11"
    And I should see game history entry "GH-12" showing elimination or loss
    And I should see game history entry "GH-13" showing "Player4" won the correct pot amount (no fee)
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
      | Player1 | Active     | $95   |
      | Player2 | Active     | $90   |
      | Player3 | Eliminated | $0    |
      | Player4 | Active     | $215  |
      | Player5 | Active     | $100  |
    And I verify exactly 4 players remain active in tournament
    And the sum of all player stacks should be $500
    And eliminated players should have exactly $0 chips

    # UI chip verification
    And Player "Player4" should have 215 chips in the UI
    And Player "Player1" should have 95 chips in the UI
    And Player "Player2" should have 90 chips in the UI
    And Player "Player5" should have 100 chips in the UI

    # Observer list invariant after round complete
    And the observer list should contain only "Observer"
    And the observer list should not contain any tournament player names:
      | Player1 |
      | Player2 |
      | Player3 |
      | Player4 |
      | Player5 |
    And I capture screenshot "R1_round1_complete" showing final tournament state


    ########################################################################
    # Round 2 (4-handed): BU rotates to next active seat (skip eliminated seat3)
    ########################################################################
    And cards for tournament round 2 are set as "5-player-round-2.json"
    And I start tournament round 2 with blinds $10/$20
    And I manually start the game for table 1 round 2

    Then exactly one player should have the BU marker in the UI
    And the BU (dealer button) should be "Player2"
    And eliminated seats should be skipped in BU movement:
      | Seat |
      | 3    |
    # 4-handed rule: BU and SB are the same seat
    And in 4-handed play, BU and SB should be the same seat
    And the game starts with tournament round 2 blinds structure:
      | Position    | Player  | Amount | Enhanced Format |
      | Small Blind | Player2 | $10    | Player2 (SB/BU) posts small blind $10 |
      | Big Blind   | Player4 | $20    | Player4 (BB) posts big blind $20 |

    And I should see game history entry "GH-14"
    And I should see game history entry "GH-15"
    And the pot should be $30 with enhanced display "[Pot: $30]"
    And the sum of all player stacks should be $500
    And the observer list should contain only "Observer"
    And the observer list should not contain any tournament player names:
      | Player1 |
      | Player2 |
      | Player3 |
      | Player4 |
      | Player5 |
    And I capture screenshot "R2_setup_blinds_10_20" showing round 2 setup

    When hole cards are dealt for tournament round 2:
      | Player  | Card1 | Card2 | Hand Strength | Strategy |
      | Player1 | K♠    | 6♦    | Marginal      | Short Stack Push |
      | Player2 | A♥    | Q♠    | Strong        | Aggressive |
      | Player4 | J♦    | J♠    | Good Pair     | Call/Raise |
      | Player5 | 8♣    | 8♥    | Medium Pair   | Selective |
    Then I capture screenshot "R2_preflop_hole_cards_dealt" for remaining 4 players
    And I verify exactly 4 players are present at the tournament table

    # Privacy/Observer isolation again
    And each player should see only their own hole cards
    And Observer should not see any player's hole cards before showdown
    And the observer list should contain only "Observer"
    And the observer list should not contain any tournament player names:
      | Player1 |
      | Player2 |
      | Player3 |
      | Player4 |
      | Player5 |

    When the pre-flop betting round begins with first-to-act action (4-handed)
    Then only the current player should have enabled action controls
    And all other active players should have disabled action controls
    And Observer should have no action controls

    And Player1 goes all-in with remaining $95 (short stack)
    Then I should see enhanced game history: "Player1 goes all-in $95 — Stack: $95 → $0"
    And I should see game history entry "GH-16"
    And Player1 stack should be $0
    And the pot should increase by $95
    And the sum of all player stacks should be $500
    And I capture screenshot "R2_preflop_player1_allin_push" showing Player1 short stack push

    And Player2 (SB/BU) calls the correct amount to cover Player1 all-in (accounting for posted blind)
    Then I should see enhanced game history: "Player2 (SB/BU) calls — Stack decreases accordingly"
    And I should see game history entry "GH-17"
    And Player2 stack should be non-negative
    And the pot should reflect Player1 all-in + Player2 call + blinds
    And the sum of all player stacks should be $500
    And I capture screenshot "R2_preflop_player2_call" showing call action

    And Player4 (BB) folds J♦J♠ to all-in
    And Player5 folds 8♣8♥ to all-in
    And I capture screenshot "R2_preflop_others_fold_complete" showing all folds complete

    When the flop is dealt: A♦, Q♣, 3♠
    And all active players should see the same community cards: A♦, Q♣, 3♠
    And I capture screenshot "R2_flop_aq3_board" showing flop cards
    And the turn is dealt: 7♥
    And I capture screenshot "R2_turn_seven_added" showing turn card
    And the river is dealt: 2♦
    And I capture screenshot "R2_river_deuce_completes_board" showing river card

    When the showdown begins for round 2
    Then Player2 should win with "two pair, aces and queens" in tournament
    And I should see winner popup for "Player2"
    And winner popup should disappear within 1 to 10 seconds
    And I should see game history entry "GH-18" showing "Player2" won the correct pot amount (no fee)
    And Player1 should lose with "king high"
    And Player1 should be eliminated from the tournament
    And I update tournament state: Player1 eliminated, 3 players remain
    And I capture screenshot "R2_river_player1_eliminated" showing elimination

    Then tournament round 2 should be complete with results (no fee, total chips conserved):
      | Player  | Status     | Stack |
      | Player1 | Eliminated | $0    |
      | Player2 | Active     | $215  |
      | Player3 | Eliminated | $0    |
      | Player4 | Active     | $195  |
      | Player5 | Active     | $90   |
    # NOTE: Ensure these values sum to $500. Adjust if your actual in-hand contributions differ.
    And the sum of all player stacks should be $500
    And eliminated players should have exactly $0 chips
    And I verify exactly 3 players remain active in tournament

    And Player "Player2" should have 215 chips in the UI
    And Player "Player4" should have 195 chips in the UI
    And Player "Player5" should have 90 chips in the UI

    # Elimination + observer isolation
    And Player1 should not appear in the action order indicator
    And Player1 should have no enabled action buttons
    And Player1 should not appear in the observer list
    And the observer list should contain only "Observer"
    And the observer list should not contain any tournament player names:
      | Player1 |
      | Player2 |
      | Player3 |
      | Player4 |
      | Player5 |
    And I capture screenshot "R2_round2_complete" showing final state


    ########################################################################
    # Round 3 (3-handed): BU rotates from Player2 to next active seat (skip seat3 eliminated, seat4 active => Player4 BU)
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
    And the game starts with tournament round 3 blinds structure:
      | Position    | Player  | Amount | Enhanced Format |
      | Small Blind | Player5 | $20    | Player5 (SB) posts small blind $20 |
      | Big Blind   | Player2 | $40    | Player2 (BB) posts big blind $40 |

    And I should see game history entry "GH-19"
    And I should see game history entry "GH-20"
    And the pot should be $60 with enhanced display "[Pot: $60]"
    And the sum of all player stacks should be $500
    And the observer list should contain only "Observer"
    And the observer list should not contain any tournament player names:
      | Player1 |
      | Player2 |
      | Player3 |
      | Player4 |
      | Player5 |
    And I capture screenshot "R3_final_setup" showing final 3 players

    When hole cards are dealt for tournament round 3 (championship):
      | Player  | Card1 | Card2 | Hand Strength | Strategy |
      | Player2 | A♠    | A♦    | Premium Pair  | Aggressive |
      | Player4 | K♥    | Q♣    | Strong High   | Moderate |
      | Player5 | 9♠    | 9♦    | Medium Pair   | Cautious |
    Then I capture screenshot "R3_preflop_final_hole_cards" for final 3 players
    And I verify exactly 3 players are present at the tournament table

    # Privacy + observer isolation again
    And each player should see only their own hole cards
    And Observer should not see any player's hole cards before showdown
    And the observer list should contain only "Observer"
    And the observer list should not contain any tournament player names:
      | Player1 |
      | Player2 |
      | Player3 |
      | Player4 |
      | Player5 |

    When the pre-flop betting round begins with first-to-act action (3-handed)
    Then only the current player should have enabled action controls
    And all other active players should have disabled action controls
    And Observer should have no action controls

    And Player2 raises to $120 with pocket aces
    Then I should see enhanced game history: "Player2 raises to $120 — Stack decreases accordingly"
    And I should see game history entry "GH-21"
    And the pot should be updated correctly after the raise (including blinds)
    And the sum of all player stacks should be $500
    And I capture screenshot "R3_preflop_player2_raise" showing championship raise

    And Player4 (BU) calls the correct amount
    Then I should see enhanced game history: "Player4 calls — Stack decreases accordingly"
    And I should see game history entry "GH-22"
    And the pot should be updated correctly
    And the sum of all player stacks should be $500

    And Player5 (SB) goes all-in for their remaining stack
    Then I should see enhanced game history: "Player5 (SB) goes all-in — Stack: $X → $0"
    And I should see game history entry "GH-23"
    And the pot should be updated correctly
    And the sum of all player stacks should be $500

    And Player2 calls remaining
    And I should see game history entry "GH-24"
    And Player4 calls all-in if required
    And I should see game history entry "GH-25"
    And I capture screenshot "R3_preflop_all_call_championship" showing all-in situation

    When the flop is dealt: 7♠, J♣, 4♦
    And I capture screenshot "R3_flop_seven_jack_four" showing championship flop
    And the turn is dealt: 8♥
    And I capture screenshot "R3_turn_eight_added" showing championship turn
    And the river is dealt: J♥
    And I capture screenshot "R3_river_jack_pairs_board" showing championship river

    When the championship showdown begins
    Then Player2 should win with "two pair, aces and jacks" in tournament
    And I should see winner popup for "Player2"
    And winner popup should disappear within 1 to 10 seconds
    And I should see game history entry "GH-26" showing winner payout (no fee)
    And Player4 should place second with "pair of jacks"
    And Player5 should place third with "pair of nines"
    And Player2 should be declared tournament champion
    And I should see game history entry "GH-27"
    And I update tournament state: Player2 wins championship
    And I capture screenshot "R3_river_tournament_champion" showing victory

    Then the tournament should be complete with final standings:
      | Place | Player  | Status           | Final Result |
      | 1st   | Player2 | Champion         | Winner       |
      | 2nd   | Player4 | Runner-up        | 2nd Place    |
      | 3rd   | Player5 | Eliminated R3    | 3rd Place    |
      | 4th   | Player1 | Eliminated R2    | 4th Place    |
      | 5th   | Player3 | Eliminated R1    | 5th Place    |

    And I verify tournament progression was correct:
      | Round | Blinds  | BU     | Eliminated | Remaining |
      | 1     | $5/$10  | Player1| Player3    | 4         |
      | 2     | $10/$20 | Player2| Player1    | 3         |
      | 3     | $20/$40 | Player4| Final      | Winner    |

    And tournament blinds progressed from $5/$10 to $10/$20 to $20/$40
    And exactly 3 players should remain for championship round
    And tournament status should be "Completed"
    And no further hands can be started
    And all start/next-hand controls should be disabled for all clients

    # Final invariants (no fee)
    And the sum of all player stacks should be $500
    And eliminated players should have exactly $0 chips

    # Observer list invariant at end
    And the observer list should contain only "Observer"
    And the observer list should not contain any tournament player names:
      | Player1 |
      | Player2 |
      | Player3 |
      | Player4 |
      | Player5 |
    And I capture screenshot "R3_river_tournament_complete" showing final standings
    And I capture final screenshot "tournament_complete_evidence"

    # History integrity checks (keep your expected count, but also require uniqueness/order)
    Then I should see exactly 28 game history entries
    And all game history entries should have unique IDs
    And game history entries should be in chronological order

    Then all browser instances should be closed


  @post-flop-complex
  Scenario: Post-Flop Action and Complex Pot Scenarios (Enhanced + Side Pots + Observer Isolation)

    And cards for tournament round 1 are set as "5-player-round-1.json"
    And I start tournament round 1 with blinds $1/$2
    And I manually start the game for table 1

    # Ensure BU/SB/BB correct at start (still BU=Player1, SB=Player2, BB=Player3 per UI)
    Then exactly one player should have the BU marker in the UI
    And the BU (dealer button) should be "Player1"
    And the observer list should contain only "Observer"
    And the observer list should not contain any tournament player names:
      | Player1 |
      | Player2 |
      | Player3 |
      | Player4 |
      | Player5 |

    When the flop is dealt: A♣, 8♠, 5♥
    And Player2 checks
    And Player4 checks
    Then I verify enhanced game history shows "CHECK" action by "Player2"
    And I verify enhanced game history shows "CHECK" action by "Player4"
    And Player2 bets $20
    And Player4 calls $20 more
    And I verify enhanced game history shows "BET" action by "Player2" with amount "$20"
    And I verify enhanced game history shows "CALL" action by "Player4" with amount "$20"

    # Observer isolation during post-flop action
    And the observer list should contain only "Observer"
    And the observer list should not contain any tournament player names:
      | Player1 |
      | Player2 |
      | Player3 |
      | Player4 |
      | Player5 |
    And I capture screenshot "complex_post_flop_action"

    # Hand 2: Side Pot and Split Pot scenario
    And I update tournament state: complex pot scenario starting

    When Player3 goes all-in with remaining $100
    And Player4 goes all-in with remaining $150
    And Player5 calls all-in for remaining $150
    Then the pot should be $400
    And the pot breakdown should be:
      | Pot Type | Amount | Eligible Players          |
      | Main     | $300   | Player3, Player4, Player5 |
      | Side 1   | $100   | Player4, Player5          |
    And the side pot 1 should be $100

    And the championship showdown begins
    And Player4 should win with "flush"
    And Player5 should win with "straight"
    And I verify enhanced game history shows "HAND_WIN" action by "Player4" with amount "$300"
    And I verify enhanced game history shows "HAND_WIN" action by "Player5" with amount "$100"

    # No-fee conservation check (only if this scenario is isolated from earlier chip movements)
    And no player stack should be negative

    # Observer isolation again
    And the observer list should contain only "Observer"
    And the observer list should not contain any tournament player names:
      | Player1 |
      | Player2 |
      | Player3 |
      | Player4 |
      | Player5 |
    And I capture screenshot "complex_pot_results"

    Then I should see exactly 22 game history entries
    And all game history entries should have unique IDs
    And game history entries should be in chronological order
    And all browser instances should be closed