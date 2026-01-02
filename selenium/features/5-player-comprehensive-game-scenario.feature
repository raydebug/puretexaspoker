Feature: 5-Player 3-Round Tournament with Comprehensive Coverage

  As a comprehensive tournament poker testing system
  I want to execute a complete 3-round 5-player Texas Hold'em tournament with player elimination
  So that I can validate all poker mechanics, tournament progression, and elimination logic with enhanced formatting

  Background:
    Given the database is reset to a clean state
    And the User table is seeded with test players
    And I initialize tournament state tracking for 5 players:
      | Player  | Seat | Position | Starting Stack | Status |
      | Player1 | 1    | SB       | $100          | Active |
      | Player2 | 2    | BB       | $100          | Active |
      | Player3 | 3    | UTG      | $100          | Active |
      | Player4 | 4    | CO       | $100          | Active |
      | Player5 | 5    | BTN      | $100          | Active |
    And I have exactly 5 players ready for tournament play
    When exactly 5 players join the tournament table with starting positions:
      | Player  | Seat | Position |
      | Player1 | 1    | SB       |
      | Player2 | 2    | BB       |
      | Player3 | 3    | UTG      |
      | Player4 | 4    | CO       |
      | Player5 | 5    | BTN      |
    Then all players should be seated correctly with position labels
    And I verify exactly 5 players are present at the tournament table
    And I verify the observer list shows only "Observer"
    And the page should be fully loaded for all players
    And I capture screenshot "tournament_setup_5players" showing all players with positions

  @tournament-3-round
  Scenario: 3-Round 5-Player Tournament with Player Elimination
    # Round 1
    And cards for tournament round 1 are set as "5-player-round-1.json"
    And I start tournament round 1 with blinds $5/$10
    And I manually start the game for table 1
    Then the game starts with tournament round 1 blinds structure:
      | Position    | Player  | Amount | Enhanced Format |
      | Small Blind | Player1 | $5     | Player1 (SB) posts small blind $5 |
      | Big Blind   | Player2 | $10    | Player2 (BB) posts big blind $10 |
    And I should see game history entry "GH-1"
    And I should see game history entry "GH-2"
    And the pot should be $15 with enhanced display "[Pot: $15]"
    And I capture screenshot "R1_game_setup_blinds_5_10" showing round 1 setup

    When hole cards are dealt for tournament round 1:
      | Player  | Card1 | Card2 | Hand Strength | Strategy |
      | Player1 | A♠    | K♠    | Premium       | Selective |
      | Player2 | Q♥    | J♥    | Strong        | Moderate |
      | Player3 | 7♣    | 2♠    | Weak          | Desperate All-in |
      | Player4 | 10♦   | 10♣   | Good Pair     | Call/Raise |
      | Player5 | A♥    | Q♦    | Strong        | Selective |

    Then I capture screenshot "R1_preflop_hole_cards_dealt" for all 5 players
    And each player should see their own hole cards with position labels
    And I verify exactly 5 players are present at the tournament table

    When the pre-flop betting round begins with UTG action
    Then I capture screenshot "R1_preflop_utg_to_act" showing Player3 to act

    And Player3 (UTG) goes all-in with weak hand 7♣2♠ as elimination bluff
    Then I should see enhanced game history: "Player3 (UTG) goes all-in $100 — Stack: $100 → $0"
    And I should see game history entry "GH-3"
    And I capture screenshot "R1_preflop_utg_allin_bluff" showing Player3 all-in
    And the pot should be $115

    And Player4 (CO) calls all-in with pocket 10s
    Then I should see enhanced game history: "Player4 (CO) calls $100 — Stack: $100 → $0"
    And I should see game history entry "GH-4"
    And I capture screenshot "R1_preflop_co_call_allin" showing Player4 call
    And the pot should be $215

    And Player5 (BTN) folds A♥Q♦ to all-in
    And I should see game history entry "GH-5"
    And Player1 (SB) folds A♠K♠ to all-in
    And I should see game history entry "GH-6"
    And Player2 (BB) folds Q♥J♥ to all-in
    And I should see game history entry "GH-7"
    And I capture screenshot "R1_preflop_all_fold_to_allin" showing all folds complete

    When the flop is dealt: A♣, 8♠, 5♥
    And I should see game history entry "GH-8"
    And I capture screenshot "R1_flop_community_cards_revealed" showing flop cards
    And the turn is dealt: K♦
    And I should see game history entry "GH-9"
    And I capture screenshot "R1_turn_fourth_card_revealed" showing turn card
    And the river is dealt: 9♣
    And I should see game history entry "GH-10"
    And I capture screenshot "R1_river_final_board_complete" showing river card

    When the showdown begins for round 1
    Then Player4 should win with "pair of tens"
    And I should see winner popup for "Player4"
    And winner popup should disappear after 3 seconds  
    And I should see game history entry "GH-11"
    And I should see game history entry "GH-13" showing "Player4" won "$200"
    And Player3 should lose with "seven high"
    And Player3 should be eliminated from the tournament
    And I should see game history entry "GH-12"
    And I update tournament state: Player3 eliminated, 4 players remain
    And I capture screenshot "R1_river_player3_eliminated" showing elimination

    Then tournament round 1 should be complete with results:
      | Player  | Status     | Stack |
      | Player1 | Active     | $95   |
      | Player2 | Active     | $90   |
      | Player3 | Eliminated | $0    |
      | Player4 | Active     | $215  |
      | Player5 | Active     | $100  |
    And I verify exactly 4 players remain active in tournament
    And Player "Player3" should be eliminated with 0 chips
    And Player "Player4" chips should be updated to 215
    And Player "Player1" chips should be updated to 95
    And Player "Player2" chips should be updated to 90
    And Player "Player5" chips should be updated to 100
    And Player "Player4" should have 215 chips in the UI
    And Player "Player1" should have 95 chips in the UI
    And Player "Player2" should have 90 chips in the UI
    And Player "Player5" should have 100 chips in the UI
    And I capture screenshot "R1_river_round1_complete" showing final tournament state

    # Round 2
    And cards for tournament round 2 are set as "5-player-round-2.json"
    And I start tournament round 2 with blinds $10/$20
    And I manually start the game for table 1 round 2
    Then the game starts with tournament round 2 blinds structure:
      | Position    | Player  | Amount | Enhanced Format |
      | Small Blind | Player2 | $10    | Player2 (SB) posts small blind $10 |
      | Big Blind   | Player4 | $20    | Player4 (BB) posts big blind $20 |
    And I should see game history entry "GH-14"
    And I should see game history entry "GH-17"
    And the pot should be $30 with enhanced display "[Pot: $30]"
    And I capture screenshot "R2_setup_blinds_10_20" showing round 2 setup

    When hole cards are dealt for tournament round 2:
      | Player  | Card1 | Card2 | Hand Strength | Strategy |
      | Player1 | K♠    | 6♦    | Marginal      | Short Stack Push |
      | Player2 | A♥    | Q♠    | Strong        | Aggressive |
      | Player4 | J♦    | J♠    | Good Pair     | Call/Raise |
      | Player5 | 8♣    | 8♥    | Medium Pair   | Selective |

    Then I capture screenshot "R2_preflop_hole_cards_dealt" for remaining 4 players
    And I verify exactly 4 players are present at the tournament table

    When the pre-flop betting round begins with UTG action (4-handed)
    And Player1 (UTG) goes all-in with remaining $95 (short stack)
    Then I should see enhanced game history: "Player1 (UTG) goes all-in $95 — Stack: $95 → $0"
    And I should see game history entry "GH-17"
    And I capture screenshot "R2_preflop_player1_allin_push" showing Player1 short stack push
    And the pot should be $125

    And Player2 (SB) calls $85 more with A♥Q♠ in tournament round 2
    Then I should see enhanced game history: "Player2 (SB) calls $85 — Stack: $90 → $5"
    And I should see game history entry "GH-17"
    And I capture screenshot "R2_preflop_player2_call" showing call action
    And the pot should be $210

    And Player4 (BB) folds J♦J♠ to all-in
    And Player5 (BTN) folds 8♣8♥ to all-in
    And I capture screenshot "R2_preflop_others_fold_complete" showing all folds complete

    When the flop is dealt: A♦, Q♣, 3♠
    And I capture screenshot "R2_flop_aq3_board" showing flop cards
    And the turn is dealt: 7♥
    And I capture screenshot "R2_turn_seven_added" showing turn card
    And the river is dealt: 2♦
    And I capture screenshot "R2_river_deuce_completes_board" showing river card

    When the showdown begins for round 2
    Then Player2 should win with "two pair, aces and queens" in tournament
    And I should see winner popup for "Player2"
    And winner popup should disappear after 3 seconds
    And I should see game history entry "GH-18" showing "Player2" won "$150"
    And Player1 should lose with "king high"
    And Player1 should be eliminated from the tournament
    And I should see game history entry "GH-17"
    And I update tournament state: Player1 eliminated, 3 players remain
    And I capture screenshot "R2_river_player1_eliminated" showing elimination

    Then tournament round 2 should be complete with results:
      | Player  | Status     | Stack |
      | Player1 | Eliminated | $0    |
      | Player2 | Active     | $215  |
      | Player3 | Eliminated | $0    |
      | Player4 | Active     | $195  |
      | Player5 | Active     | $100  |
    And I verify exactly 3 players remain active in tournament
    And Player "Player1" should be eliminated with 0 chips
    And Player "Player2" chips should be updated to 215
    And Player "Player4" chips should be updated to 195
    And Player "Player5" chips should be updated to 100
    And Player "Player2" should have 215 chips in the UI
    And Player "Player4" should have 195 chips in the UI
    And Player "Player5" should have 100 chips in the UI
    And I capture screenshot "R2_river_complete" showing final state

    # Round 3
    And cards for tournament round 3 are set as "5-player-round-3.json"
    And I start tournament round 3 with blinds $20/$40
    And I manually start the game for table 1 round 3
    Then the game starts with tournament round 3 blinds structure:
      | Position    | Player  | Amount | Enhanced Format |
      | Small Blind | Player4 | $20    | Player4 (SB) posts small blind $20 |
      | Big Blind   | Player5 | $40    | Player5 (BB) posts big blind $40 |
    And I should see game history entry "GH-27"
    And I should see game history entry "GH-17"
    And the pot should be $60 with enhanced display "[Pot: $60]"
    And I capture screenshot "R3_final_setup" showing final 3 players

    When hole cards are dealt for tournament round 3 (championship):
      | Player  | Card1 | Card2 | Hand Strength | Strategy |
      | Player2 | A♠    | A♦    | Premium Pair  | Aggressive |
      | Player4 | K♥    | Q♣    | Strong High   | Moderate |
      | Player5 | 9♠    | 9♦    | Medium Pair   | Cautious |

    Then I capture screenshot "R3_preflop_final_hole_cards" for final 3 players
    And I verify exactly 3 players are present at the tournament table

    When the pre-flop betting round begins with BTN action (3-handed)
    And Player2 (BTN) raises to $120 with pocket aces
    Then I should see enhanced game history: "Player2 (BTN) raises to $120 — Stack: $215 → $95"
    And I should see game history entry "GH-27"
    And I capture screenshot "R3_preflop_player2_raise" showing championship raise
    And the pot should be $180

    And Player4 (SB) calls $100 more with K♥Q♣ in tournament round 3
    Then I should see enhanced game history: "Player4 (SB) calls $100 — Stack: $195 → $75"
    And I should see game history entry "GH-27"
    And the pot should be $280

    And Player5 (BB) goes all-in with pocket nines for $100
    Then I should see enhanced game history: "Player5 (BB) goes all-in $100 — Stack: $100 → $0"
    And I should see game history entry "GH-27"
    And the pot should be $380

    And Player2 (BTN) calls remaining with pocket aces
    And I should see game history entry "GH-27"
    And Player4 (SB) calls all-in
    And I should see game history entry "GH-27"
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
    And winner popup should disappear after 3 seconds
    And I should see game history entry "GH-26"
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
      | 3rd   | Player5 | 3rd Place        | 3rd Place    |
      | 4th   | Player1 | Eliminated R2    | 4th Place    |
      | 5th   | Player3 | Eliminated R1    | 5th Place    |

    And I verify tournament progression was correct:
      | Round | Blinds  | Eliminated | Remaining |
      | 1     | $5/$10  | Player3    | 4         |
      | 2     | $10/$20 | Player1    | 3         |
      | 3     | $20/$40 | Final      | Winner    |

    And I capture screenshot "R3_river_tournament_complete" showing final standings
    Then Player3 should be eliminated in round 1
    And Player1 should be eliminated in round 2
    And Player2 should be tournament winner
    And tournament blinds progressed from $5/$10 to $10/$20 to $20/$40
    And exactly 3 players should remain for championship round
    And Player "Player2" chips should be updated to 425
    And Player "Player4" chips should be updated to 75
    And Player "Player5" chips should be updated to 0
    And Player "Player2" should have 425 chips in the UI
    And Player "Player4" should have 75 chips in the UI
    And Player2 final stack should be greater than $400
    And I capture final screenshot "tournament_complete_evidence"
    Then I should see exactly 28 game history entries
    Then all browser instances should be closed

  @post-flop-complex
  Scenario: Post-Flop Action and Complex Pot Scenarios
    # Hand 1: Post-flop Check/Bet sequence
    And cards for tournament round 1 are set as "5-player-round-1.json"
    And I start tournament round 1 with blinds $1/$2
    When the flop is dealt: A♣, 8♠, 5♥
    And Player2 checks
    And Player4 checks
    And I verify enhanced game history shows "CHECK" action by "Player2"
    And I verify enhanced game history shows "CHECK" action by "Player4"
    And Player2 bets $20
    And Player4 calls $20 more
    And I verify enhanced game history shows "BET" action by "Player2" with amount "$20"
    And I verify enhanced game history shows "CALL" action by "Player4" with amount "$20"
    And I capture screenshot "complex_post_flop_action"

    # Hand 2: Side Pot and Split Pot scenario
    And I update tournament state: complex pot scenario starting
    When Player3 goes all-in with remaining $100
    And Player4 goes all-in with remaining $150
    And Player5 calls all-in for remaining $150
    Then the pot should be $400
    And the side pot 1 should be $100
    And the championship showdown begins
    And Player4 should win with "flush"
    And Player5 should win with "straight"
    And I verify enhanced game history shows "HAND_WIN" action by "Player4" with amount "$300"
    And I verify enhanced game history shows "HAND_WIN" action by "Player5" with amount "$100"
    And I capture screenshot "complex_pot_results"
    Then I should see exactly 22 game history entries
    And all browser instances should be closed
