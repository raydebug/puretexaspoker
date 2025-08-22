Feature: Test Player3 Fold Action History Fix

@test-fold
Scenario: Test Player3 Fold Updates Game History
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
    | Position    | Player  | Amount | Enhanced Format                   |
    | Small Blind | Player1 | $1     | Player1 (SB) posts small blind $1 |
    | Big Blind   | Player2 | $2     | Player2 (BB) posts big blind $2   |
  And the pot should be $3 with enhanced display "[Pot: $3]"
  And hole cards are dealt to all 5 players
  And I capture screenshot "01_hole_cards_dealt_all_players"
  And the game history should show 2 action records
  And I capture screenshot "02_enhanced_game_history_initial"
  Then the pre-flop betting round starts with UTG to act
  And I capture screenshot "03_preflop_start_utg_to_act"
  Then Player3 (UTG) folds with weak hand "7c-2h"
  And I capture screenshot "04_preflop_utg_fold"
  And the game history should show 3 action records