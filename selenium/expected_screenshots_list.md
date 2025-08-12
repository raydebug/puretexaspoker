# Expected Screenshots List for 2-Player Test

**Generated**: 2025-08-12 07:50
**Test**: 2-player-complete-game-scenario.feature with @comprehensive-2-player tag

## Expected Screenshots by Category

### 1. Setup & Initial Screenshots (6-8 expected)
- `01_players_joined_player1.png` - Player1 after joining
- `02_players_joined_player2.png` - Player2 after joining  
- `03_game_started_after_countdown_player1.png` - Game started Player1 view
- `04_game_started_after_countdown_player2.png` - Game started Player2 view

### 2. Hole Cards Phase (4 screenshots)
- `05_hole_cards_dealt_player1.png` - Player1 hole cards
- `06_hole_cards_dealt_player2.png` - Player2 hole cards
- `05a_game_history_initial.png` - Initial game history state

### 3. Pre-flop Betting Phase (10 screenshots)
- `07_preflop_betting_start_player1.png` - Pre-flop start Player1
- `08_preflop_betting_start_player2.png` - Pre-flop start Player2
- `countdown_preflop_player1_before_action.png` - Countdown timer Player1
- `09_preflop_action_player1.png` - Player1 raise action
- `10_preflop_action_player2.png` - Player2 after Player1 action
- `09a_game_history_after_raise.png` - Game history after raise
- `countdown_preflop_player2_before_action.png` - Countdown timer Player2
- `09b_game_history_after_call.png` - Game history after call

### 4. Flop Phase (10 screenshots)
- `11_flop_dealt_player1.png` - Flop cards Player1 view
- `12_flop_dealt_player2.png` - Flop cards Player2 view
- `15_flop_cards_visible_player1.png` - Flop visible Player1
- `16_flop_cards_visible_player2.png` - Flop visible Player2
- `11a_game_history_flop_phase.png` - Game history flop phase
- `countdown_flop_player1_before_action.png` - Countdown Player1 flop
- `13_flop_betting_player1.png` - Player1 flop betting
- `countdown_flop_player2_before_action.png` - Countdown Player2 flop
- `14_flop_betting_player2.png` - Player2 flop betting
- `14a_game_history_flop_complete.png` - Flop betting complete

### 5. Turn Phase (8 screenshots)
- `15_turn_dealt_player1.png` - Turn card Player1
- `16_turn_dealt_player2.png` - Turn card Player2
- `16a_game_history_turn_phase.png` - Game history turn phase
- `countdown_turn_player1_before_action.png` - Countdown Player1 turn
- `17_turn_betting_player1.png` - Player1 turn betting
- `countdown_turn_player2_before_action.png` - Countdown Player2 turn
- `18_turn_betting_player2.png` - Player2 turn betting
- `18a_game_history_turn_complete.png` - Turn betting complete

### 6. River Phase (8 screenshots)
- `19_river_dealt_player1.png` - River card Player1
- `20_river_dealt_player2.png` - River card Player2
- `20a_game_history_river_phase.png` - Game history river phase
- `countdown_river_player1_before_action.png` - Countdown Player1 river
- `21_river_betting_player1.png` - Player1 river betting
- `countdown_river_player2_before_allin.png` - Countdown Player2 all-in
- `22_river_betting_player2.png` - Player2 all-in
- `countdown_river_player1_before_call.png` - Countdown Player1 call
- `22a_game_history_river_complete.png` - River betting complete

### 7. Showdown Phase (4 screenshots)
- `23_showdown_player1.png` - Showdown Player1 view
- `24_showdown_player2.png` - Showdown Player2 view
- `24a_game_history_final.png` - Final game history
- `24b_game_history_complete.png` - Complete game history

### 8. Additional Test Scenarios (if running multiple scenarios)

#### Game History Verification Scenario (9 screenshots)
- `history_01_initial_state.png` - Initial game history
- `history_02_preflop_betting.png` - Pre-flop history
- `history_03_preflop_complete.png` - Pre-flop complete
- `history_04_flop_phase.png` - Flop phase history
- `history_05_flop_betting.png` - Flop betting history
- `history_06_turn_phase.png` - Turn phase history
- `history_07_turn_betting.png` - Turn betting history
- `history_08_river_phase.png` - River phase history
- `history_09_final_complete.png` - Final complete history

#### Betting Slider Scenario (2 screenshots)
- `betting_slider_after_raise.png` - Slider after raise
- `betting_slider_waiting_player.png` - Waiting player view

#### Flop Betting Scenario (1 screenshot)
- `flop_slider_betting.png` - Flop slider betting

### 9. Automatic Infrastructure Screenshots (Variable)
- Setup failure screenshots (if any)
- Browser initialization screenshots (if any)
- Error/failure screenshots (if any)

## Summary
**Minimum Expected**: 47 explicit screenshots
**Maximum Expected**: 65+ screenshots (if all scenarios run + automatic screenshots)

## Files to Check After Test
- Check `/Users/leiyao/work/puretexaspoker/selenium/screenshots/` directory
- Look for files matching the patterns above
- Note any additional automatically generated screenshots