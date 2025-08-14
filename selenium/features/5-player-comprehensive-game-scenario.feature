Feature: 5-Player Comprehensive Game Scenario with Maximum Action Coverage

  As a comprehensive poker game testing system
  I want to execute a complete 5-player Texas Hold'em game covering all possible actions
  So that I can validate all poker mechanics, positions, and action types with enhanced formatting

  Background:
    Given the database is reset to a clean state
    And the User table is seeded with test players
    And I have exactly 5 players ready for a comprehensive poker game
    And all players have starting stacks of $100
    When exactly 5 players join the comprehensive table with positions:
      | Player  | Seat | Position |
      | Player1 | 1    | SB       |
      | Player2 | 2    | BB       |
      | Player3 | 3    | UTG      |
      | Player4 | 4    | CO       |
      | Player5 | 5    | BTN      |
    Then all players should be seated correctly with position labels
    And I verify exactly 5 players are present at the current table
    And the page should be fully loaded for all players
    And I manually start the game for table 1
    Then the game starts with enhanced blinds structure:
      | Position    | Player  | Amount | Enhanced Format |
      | Small Blind | Player1 | $1     | Player1 (SB) posts small blind $1 |
      | Big Blind   | Player2 | $2     | Player2 (BB) posts big blind $2 |
    And the pot should be $3 with enhanced display "[Pot: $3]"
    And I capture screenshot "00_game_setup_5players" showing all players with positions

  @comprehensive-5-player
  Scenario: Complete 5-Player Texas Hold'em with Maximum Action Coverage
    # PHASE 1: PRE-FLOP BETTING - Complex Multi-Way Action
    When hole cards are dealt according to comprehensive test scenario:
      | Player  | Card1 | Card2 | Hand Strength | Strategy |
      | Player1 | A♠    | K♠    | Premium       | Aggressive |
      | Player2 | Q♥    | J♥    | Strong        | Moderate |
      | Player3 | 7♣    | 2♠    | Weak          | Fold Early |
      | Player4 | 10♦   | 10♣   | Good Pair     | Call/Raise |
      | Player5 | A♥    | Q♦    | Strong        | Selective |
    
    Then I capture screenshot "01_hole_cards_dealt_all_players" for all 5 players
    And each player should see their own hole cards with position labels
    And the enhanced game history should show initial state:
      | Element | Expected Format |
      | Phase Header | --- PRE-FLOP BETTING --- |
      | Pot Display | [Pot: $0] |
      | SB Action | Player1 (SB) posts small blind $1 |
      | BB Action | Player2 (BB) posts big blind $2 |
    
    And I capture screenshot "02_enhanced_game_history_initial" showing enhanced formatting
    And I verify exactly 5 players are present at the current table
    
    # Pre-flop Action Sequence - Covering All Action Types
    When the pre-flop betting round begins with UTG action
    Then I capture screenshot "03_preflop_start_utg_to_act" showing Player3 to act
    
    # UTG FOLD (Position: Under The Gun)
    And Player3 (UTG) folds with weak hand 7♣2♠
    Then I should see enhanced game history: "Player3 (UTG) folds — Stack: $100"
    And I capture screenshot "04_preflop_utg_fold" showing fold action
    And I verify enhanced game history shows "FOLD" action by "Player3 (UTG)"
    
    # CO RAISE (Position: Cut Off)  
    And Player4 (CO) raises to $8 with pocket 10s
    Then I should see enhanced game history: "Player4 (CO) raises to $8 — Stack: $100 → $92"
    And I capture screenshot "05_preflop_co_raise" showing raise action with stack change
    And I verify enhanced game history shows "RAISE" action by "Player4 (CO)" with amount "$8"
    And the pot should be $11 with display "[Pot: $11]"
    
    # BTN 3-BET (Position: Button)
    And Player5 (BTN) 3-bets to $24 with A♥Q♦
    Then I should see enhanced game history: "Player5 (BTN) raises to $24 — Stack: $100 → $76"
    And I capture screenshot "06_preflop_btn_3bet" showing 3-bet action
    And I verify enhanced game history shows "RAISE" action by "Player5 (BTN)" with amount "$24"
    And the pot should be $27 with enhanced display
    
    # SB FOLD (Position: Small Blind)
    And Player1 (SB) folds premium hand A♠K♠ to 3-bet
    Then I should see enhanced game history: "Player1 (SB) folds — Stack: $99"
    And I capture screenshot "07_preflop_sb_fold" showing SB fold to 3-bet
    And I verify Player1 is marked as inactive
    
    # BB CALL (Position: Big Blind)
    And Player2 (BB) calls $22 more with Q♥J♥
    Then I should see enhanced game history: "Player2 (BB) calls $22 — Stack: $98 → $76"
    And I capture screenshot "08_preflop_bb_call" showing BB call
    And the pot should be $49
    
    # CO 4-BET (Cut Off Response)
    And Player4 (CO) 4-bets to $60 with pocket 10s
    Then I should see enhanced game history: "Player4 (CO) raises to $60 — Stack: $92 → $40"
    And I capture screenshot "09_preflop_co_4bet" showing 4-bet action
    And the pot should be $109
    
    # BTN FOLD to 4-bet
    And Player5 (BTN) folds A♥Q♦ to 4-bet
    Then I should see enhanced game history: "Player5 (BTN) folds — Stack: $76"
    And I capture screenshot "10_preflop_btn_fold_to_4bet"
    
    # BB ALL-IN (Big Blind Shove)
    And Player2 (BB) goes all-in with remaining $76
    Then I should see enhanced game history: "Player2 (BB) goes all-in $76 — Stack: $76 → $0"
    And I capture screenshot "11_preflop_bb_allin" showing all-in action
    And the pot should be $161
    
    # CO CALL ALL-IN
    And Player4 (CO) calls all-in for remaining $40
    Then I should see enhanced game history: "Player4 (CO) calls $40 — Stack: $40 → $0"
    And I capture screenshot "12_preflop_co_call_allin"
    And the pot should be $185
    
    # Verify Pre-flop Summary
    Then I should see "Pot: $185" in enhanced game history
    And I verify exactly 5 players are present at the current table
    And 2 players should remain active: Player2, Player4
    And 3 players should be folded: Player1, Player3, Player5
    And I capture screenshot "13_preflop_complete_summary" showing final pre-flop state
    
    # PHASE 2: FLOP - All-In Scenario with Side Pot Potential
    When the flop is dealt: A♣, 10♠, 7♥
    Then I should see enhanced flop display:
      | Element | Expected Format |
      | Phase Header | --- FLOP [Pot: $185] --- |
      | Community Cards | Community Cards: A♣ 10♠ 7♥ |
    
    And I capture screenshot "14_flop_dealt_with_sidepot" showing flop with all-in players
    And I verify exactly 5 players are present at the current table
    And both all-in players should have cards revealed
    And Player4 should have set of 10s (strong hand)
    And Player2 should have top pair using Q♥J♥
    
    # PHASE 3: TURN - Continue All-In Runout
    When the turn is dealt: K♣
    Then I should see enhanced turn display:
      | Element | Expected Format |
      | Phase Header | --- TURN [Pot: $185] --- |
      | Turn Card | Community Card: K♣ |
    
    And I capture screenshot "15_turn_dealt_allin_runout"
    And I verify exactly 5 players are present at the current table
    And Player2 should have gutshot straight draw (Q♥J♥ needs 8 for straight)
    And Player4 should still have set of 10s (strongest hand)
    
    # PHASE 4: RIVER - Final All-In Resolution
    When the river is dealt: 8♦
    Then I should see enhanced river display:
      | Element | Expected Format |
      | Phase Header | --- RIVER [Pot: $185] --- |
      | River Card | Community Card: 8♦ |
    
    And I capture screenshot "16_river_dealt_final_card"
    And I verify exactly 5 players are present at the current table
    And Player2 should now have straight (Q-J-10-9-8)
    And the board should be A♣ 10♠ 7♥ K♣ 8♦
    
    # PHASE 5: SHOWDOWN - Enhanced Hand Reveals
    When the showdown begins
    Then I should see enhanced showdown display:
      | Element | Expected Format |
      | Phase Header | --- SHOWDOWN --- |
      | Hand Reveals | Player2 shows Q♥ J♥, Player4 shows 10♦ 10♣ |
    
    And I capture screenshot "17_showdown_hand_reveals"
    And I verify exactly 5 players are present at the current table
    
    # Hand Evaluation
    And Player2 should have "straight" (Q-J-10-9-8)
    And Player4 should have "set of tens"
    And Player2 should win with higher hand ranking
    
    Then I should see enhanced showdown results:
      | Element | Expected Format |
      | Winner Declaration | Player2 wins $185 with straight |
      | Final Pot Distribution | All chips to Player2 |
    
    And I capture screenshot "18_showdown_complete_winner"
    
    # COMPREHENSIVE ENHANCED GAME HISTORY VERIFICATION
    Then the complete enhanced game history should contain:
      | Phase | Action Count | Key Elements |
      | PRE-FLOP | 10 actions | UTG fold, CO raise, BTN 3-bet, SB fold, BB call, CO 4-bet, BTN fold, BB all-in, CO call |
      | FLOP | 1 transition | Community cards display, all-in continuation |
      | TURN | 1 transition | Turn card, hand development |
      | RIVER | 1 transition | River card, final board |
      | SHOWDOWN | 1 resolution | Hand reveals, winner determination |
    
    And I capture screenshot "19_complete_enhanced_history" showing full game history
    
    # Position-Based Action Verification
    And I verify all positions took actions:
      | Position | Player | Actions Taken |
      | UTG | Player3 | FOLD |
      | CO | Player4 | RAISE, RAISE (4-bet), CALL (all-in) |
      | BTN | Player5 | RAISE (3-bet), FOLD |
      | SB | Player1 | FOLD |
      | BB | Player2 | CALL, ALL-IN |
    
    And I capture screenshot "20_position_action_summary"

  @multi-way-complex
  Scenario: 5-Player Multi-Way Pot with Check-Raise and Complex Betting
    # Alternative scenario with different action patterns
    When hole cards are dealt for complex multi-way scenario:
      | Player  | Card1 | Card2 | Strategy |
      | Player1 | 8♠    | 8♥    | Play Cautiously |
      | Player2 | A♣    | 5♣    | Aggressive Bluff |
      | Player3 | K♦    | Q♠    | Moderate Play |
      | Player4 | 9♥    | 9♠    | Value Betting |
      | Player5 | J♣    | 10♦   | Drawing Hands |
    
    # Pre-flop: Multiple Limpers (Check/Call Pattern)
    And Player3 (UTG) calls $2 (limp)
    Then I should see "Player3 (UTG) calls $2 — Stack: $100 → $98"
    And I capture screenshot "21_preflop_utg_limp"
    
    And Player4 (CO) calls $2 (limp)
    Then I should see "Player4 (CO) calls $2 — Stack: $100 → $98"
    
    And Player5 (BTN) calls $2 (limp)
    Then I should see "Player5 (BTN) calls $2 — Stack: $100 → $98"
    
    And Player1 (SB) calls $1 more (complete)
    Then I should see "Player1 (SB) calls $1 — Stack: $99 → $98"
    
    And Player2 (BB) checks
    Then I should see "Player2 (BB) checks"
    And I capture screenshot "22_preflop_all_limpers" showing 5-way pot
    And the pot should be $10 with all 5 players active
    And I verify exactly 5 players are present at the current table
    
    # Flop: Multi-Way Action with Check-Raise
    When the flop is dealt: 8♦, 9♣, 2♥
    And I capture screenshot "23_flop_multiway_pot"
    
    # SB (Player1) checks with set of 8s (slowplay)
    And Player1 (SB) checks
    Then I should see "Player1 (SB) checks"
    
    # BB (Player2) bets with A-high bluff
    And Player2 (BB) bets $6
    Then I should see "Player2 (BB) bets $6 — Stack: $98 → $92"
    And the pot should be $16
    
    # UTG (Player3) calls with K-high
    And Player3 (UTG) calls $6
    Then I should see "Player3 (UTG) calls $6 — Stack: $98 → $92"
    
    # CO (Player4) raises with set of 9s
    And Player4 (CO) raises to $20
    Then I should see "Player4 (CO) raises to $20 — Stack: $98 → $78"
    And I capture screenshot "24_flop_co_raise_with_set"
    
    # BTN (Player5) folds J-10 (no draw)
    And Player5 (BTN) folds
    Then I should see "Player5 (BTN) folds — Stack: $98"
    
    # SB (Player1) check-raises with hidden set
    And Player1 (SB) raises to $50 (check-raise)
    Then I should see "Player1 (SB) raises to $50 — Stack: $98 → $48"
    And I capture screenshot "25_flop_sb_check_raise" showing check-raise action
    
    # BB (Player2) folds bluff
    And Player2 (BB) folds
    Then I should see "Player2 (BB) folds — Stack: $92"
    
    # UTG (Player3) folds K-high
    And Player3 (UTG) folds  
    Then I should see "Player3 (UTG) folds — Stack: $92"
    
    # CO (Player4) calls with set of 9s
    And Player4 (CO) calls $30 more
    Then I should see "Player4 (CO) calls $30 — Stack: $78 → $48"
    And I capture screenshot "26_flop_heads_up_after_checkraise"
    And the pot should be $126 with 2 players remaining
    And I verify exactly 5 players are present at the current table
    
    # Turn: Heads-Up Battle
    When the turn is dealt: A♠
    And I capture screenshot "27_turn_heads_up_battle"
    
    And Player1 (SB) bets $25
    Then I should see "Player1 (SB) bets $25 — Stack: $48 → $23"
    
    And Player4 (CO) calls $25
    Then I should see "Player4 (CO) calls $25 — Stack: $48 → $23"
    And the pot should be $176
    
    # River: Final Showdown
    When the river is dealt: 8♣
    And I capture screenshot "28_river_final_battle"
    # Player1 now has full house (8s full of As)
    
    And Player1 (SB) goes all-in $23
    Then I should see "Player1 (SB) goes all-in $23 — Stack: $23 → $0"
    
    And Player4 (CO) calls all-in
    Then I should see "Player4 (CO) calls $23 — Stack: $23 → $0"
    And the pot should be $222
    And I verify exactly 5 players are present at the current table
    
    # Showdown
    When the showdown begins
    Then Player1 should win with "full house, eights full of aces"
    And Player4 should lose with "set of nines"
    And I capture screenshot "29_complex_showdown_fullhouse_wins"
    
    And I should see enhanced showdown results:
      | Player | Hand | Result |
      | Player1 | 8♠ 8♥ → Full House | Winner: $222 |
      | Player4 | 9♥ 9♠ → Set of 9s | Loser |
    
    And I capture screenshot "30_final_complex_game_complete"

  @comprehensive-actions
  Scenario: Maximum Action Type Coverage Test
    # This scenario focuses on covering every possible action type
    When hole cards are dealt for maximum action coverage:
      | Player  | Card1 | Card2 |
      | Player1 | 7♠    | 3♦    |
      | Player2 | A♠    | A♥    |
      | Player3 | K♣    | K♦    |
      | Player4 | Q♠    | J♠    |
      | Player5 | 2♣    | 2♦    |
    
    # Pre-flop: Cover FOLD, CALL, RAISE actions
    And Player3 (UTG) raises to $6
    And Player4 (CO) calls $6
    And Player5 (BTN) folds
    And Player1 (SB) folds
    And Player2 (BB) raises to $20 (3-bet with AA)
    And Player3 (UTG) calls $14
    And Player4 (CO) folds
    And I capture screenshot "31_preflop_actions_variety"
    And I verify exactly 5 players are present at the current table
    
    # Flop: Cover CHECK, BET, CALL actions
    When the flop is dealt: K♠, Q♦, 10♣
    And Player2 (BB) checks with AA (trap)
    And Player3 (UTG) bets $15 with top set
    And Player2 (BB) calls $15 (slowplay)
    And I capture screenshot "32_flop_check_bet_call"
    And I verify exactly 5 players are present at the current table
    
    # Turn: Cover CHECK, CHECK pattern
    When the turn is dealt: 5♥
    And Player2 (BB) checks
    And Player3 (UTG) checks (pot control)
    And I capture screenshot "33_turn_double_check"
    
    # River: Cover BET, RAISE, ALL-IN sequence
    When the river is dealt: A♦
    And Player2 (BB) bets $30 with set of Aces
    And Player3 (UTG) raises to $80 with full house (KKK AA)
    And Player2 (BB) goes all-in with remaining chips
    And Player3 (UTG) calls all-in
    And I capture screenshot "34_river_bet_raise_allin_call"
    And I verify exactly 5 players are present at the current table
    
    # Verify all action types were covered
    Then the enhanced game history should show all action types:
      | Action Type | Count | Players |
      | FOLD | 3+ | Player1, Player4, Player5 |
      | CALL | 4+ | Various players |
      | RAISE | 3+ | Various players |
      | CHECK | 3+ | Player2, Player3 |
      | BET | 2+ | Player2, Player3 |
      | ALL-IN | 1+ | Player2 |
    
    And I capture screenshot "35_all_actions_covered_summary"

  @comprehensive-verification
  Scenario: Final Comprehensive Enhanced History Verification
    # Execute a full game and verify every aspect of enhanced formatting
    
    # [Previous game execution steps would go here]
    
    # Comprehensive Enhanced Formatting Verification
    Then I perform complete enhanced game history verification:
      | Verification Type | Expected Elements |
      | Phase Headers | --- PRE-FLOP BETTING ---, --- FLOP [Pot: $X] ---, etc. |
      | Position Labels | (UTG), (CO), (BTN), (SB), (BB) throughout |
      | Stack Tracking | Stack: $X → $Y for all bet/raise actions |
      | Pot Progress | [Pot: $X] at phase headers, Pot: $X summaries |
      | Community Cards | Community Cards: A♣ Q♠ 9♥, Community Card: K♣ |
      | Action Arrows | → symbols for stack changes |
      | Professional Dashes | — symbols for action separation |
      | All-In Format | goes all-in $X — Stack: $Y → $0 |
      | Fold Format | folds — Stack: $X (no change) |
      | Check Format | checks (simple format) |
      | Showdown Results | shows [cards] — [hand description] |
      | Winner Declaration | [Player] wins $[amount] |
    
    And I capture comprehensive verification screenshots:
      | Screenshot | Content |
      | enhanced_preflop_complete | All pre-flop actions with enhanced formatting |
      | enhanced_flop_complete | Flop phase with pot and community cards |
      | enhanced_turn_complete | Turn phase with proper formatting |
      | enhanced_river_complete | River phase with all-in scenarios |
      | enhanced_showdown_complete | Complete showdown with hand reveals |
      | enhanced_full_history | Complete game history scroll |
    
    And the enhanced game history should auto-scroll to latest action
    And all formatting elements should be consistent throughout
    And position labels should be accurate for all 5 players
    
    # Final Statistics Verification
    Then I verify comprehensive coverage statistics:
      | Metric | Target | Achieved |
      | Unique Actions | 8+ types | ✓ All covered |
      | Position Coverage | 5 positions | ✓ UTG,CO,BTN,SB,BB |
      | Phase Coverage | 5 phases | ✓ All phases |
      | Multi-Way Scenarios | 2+ scenarios | ✓ Multiple |
      | All-In Scenarios | 2+ scenarios | ✓ Multiple |
      | Check Patterns | 2+ patterns | ✓ Multiple |
      | Fold Scenarios | 3+ folds | ✓ Multiple |
    
    And I capture final comprehensive summary screenshot "36_complete_coverage_achieved"