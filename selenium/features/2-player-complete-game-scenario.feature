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
    And the action buttons should be visible at bottom center in this screenshot
    When I manually start the game for table 1
    Then the game starts with blinds structure:
      | Position    | Player  | Amount |
      | Small Blind | Player1 | $1     |
      | Big Blind   | Player2 | $2     |
    And the pot should be $3
    And the action buttons should be visible at bottom center in this screenshot

  @quick-2-player
  Scenario: Quick 2-Player Setup Test
    # Background setup already completed
    Then game setup should be complete for 2 players
    And the observers list should always be empty with seated players

  @comprehensive-2-player
  Scenario: Complete 2-Player Texas Hold'em Game with Specific Cards and Actions
    # Background setup already completed
    When hole cards are dealt according to the test scenario:
      | Player  | Card1 | Card2 |
      | Player1 | A♠    | K♠    |
      | Player2 | Q♥    | J♥    |
    Then I capture screenshot "05_hole_cards_dealt_player1" for Player1
    And I capture screenshot "06_hole_cards_dealt_player2" for Player2
    And each player should see their own hole cards
    And each player should see 2 face-down cards for other players
    And the action buttons should be visible at bottom center in this screenshot
    # PHASE 1: Initial game history verification (Post-deal phase)
    And the game history should be visible and functional
    And the game history should display current player information
    And the game history should show blinds posting actions
    And I capture screenshot "05a_game_history_initial" showing game history
    And I verify game history shows "Small Blind" action by "Player1" with amount "$1"
    And I verify game history shows "Big Blind" action by "Player2" with amount "$2"
    When the pre-flop betting round begins
    Then I capture screenshot "07_preflop_betting_start_player1" for Player1
    And I capture screenshot "08_preflop_betting_start_player2" for Player2
    And force all players to join game rooms
    And manually trigger game state update from backend
    And verify current player information in all browsers
    And the enhanced action buttons should be visible for the current player
    And the action buttons should have enhanced styling with color variants
    And the action buttons should be visible at bottom center in this screenshot
    # COUNTDOWN UI VERIFICATION - Preflop Betting Round
    And the current player should see a decision timer
    And I verify countdown timer is visible and functional for current player
    And I verify countdown timer displays time remaining correctly
    And I verify countdown timer has proper styling and visibility
    And I capture screenshot "countdown_preflop_player1_before_action" showing countdown timer
    And Player1 raises to $6
    And the action buttons should be disabled after clicking one
    And the action buttons should show proper active/inactive visual states
    Then I capture screenshot "09_preflop_action_player1" for Player1
    And I capture screenshot "10_preflop_action_player2" for Player2
    And the action buttons should be visible at bottom center in this screenshot
    # PHASE 2: Preflop betting game history verification
    And the game history should show action records
    And the game history should update after player actions
    And the game history should display betting actions with amounts: "RAISE $6"
    And I capture screenshot "09a_game_history_after_raise" showing game history
    And I verify game history shows "RAISE" action by "Player1" with amount "$6"
    And I capture game history after "RAISE" by "Player1"
    # COUNTDOWN UI VERIFICATION - Preflop Player2 Turn
    And the current player should see a decision timer
    And I verify countdown timer switches to current player correctly
    And I verify countdown timer resets and displays full time for new player
    And I verify countdown timer is visible for Player2 only
    And I capture screenshot "countdown_preflop_player2_before_action" showing countdown timer
    And Player2 calls $4 more
    And the action buttons should be disabled after clicking one
    And the action buttons should be visible at bottom center in this screenshot
    # Verify Player2 call action in game history
    And I verify game history shows "CALL" action by "Player2" with amount "$4"
    And I capture game history after "CALL" by "Player2"
    And I capture screenshot "09b_game_history_after_call" showing game history
    Then the pot should be $12
    And 2 players should remain in the hand: Player1, Player2
    And the action buttons should show only for the current player
    And the action buttons should be visible at bottom center in this screenshot
    When the flop is dealt: A♣, Q♠, 9♥
    Then I capture screenshot "11_flop_dealt_player1" for Player1
    And I capture screenshot "12_flop_dealt_player2" for Player2
    And the action buttons should be visible at bottom center in this screenshot
    And the action buttons should show proper active/inactive visual states
    # PHASE 3: Flop phase game history verification
    And the game history should show different phases correctly
    And the game history should display phase transition to "Flop"
    And I capture screenshot "11a_game_history_flop_phase" showing game history
    And I verify game history shows "FLOP" phase with community cards "A♣, Q♠, 9♥"
    And I capture game history after "PHASE_TRANSITION" by "System"
    # COUNTDOWN UI VERIFICATION - Flop Betting Round
    And I verify countdown timer appears for new betting round
    And I verify countdown timer is visible and functional for flop phase
    And I verify countdown timer displays correct time for Player1
    And I capture screenshot "countdown_flop_player1_before_action" showing countdown timer
    And Player1 bets $8
    And the action buttons should show proper active/inactive visual states
    Then I capture screenshot "13_flop_betting_player1" for Player1
    And the action buttons should be visible at bottom center in this screenshot
    # Verify Player1 bet action during flop
    And I verify game history shows "BET" action by "Player1" with amount "$8"
    And I capture game history after "BET" by "Player1"
    # COUNTDOWN UI VERIFICATION - Flop Player2 Turn  
    And I verify countdown timer switches to Player2 after Player1 action
    And I verify countdown timer resets for Player2 flop decision
    And I capture screenshot "countdown_flop_player2_before_action" showing countdown timer
    And Player2 calls $8
    And the action buttons should show proper active/inactive visual states
    Then I capture screenshot "14_flop_betting_player2" for Player2
    And the action buttons should be visible at bottom center in this screenshot
    # Verify Player2 call action during flop
    And I verify game history shows "CALL" action by "Player2" with amount "$8"
    And I capture game history after "CALL" by "Player2"
    And I capture screenshot "14a_game_history_flop_complete" showing game history
    And the game history should display betting actions with amounts: "BET $8, CALL $8"
    Then the pot should be $28
    And both players should see the 3 flop cards
    And Player1 should have top pair with A♠
    And Player2 should have top pair with Q♥
    And the betting slider should have modern styling
    And the betting slider should be visible and functional
    And the betting slider should have proper styling and labels
    When the turn is dealt: K♣
    Then I capture screenshot "15_turn_dealt_player1" for Player1
    And I capture screenshot "16_turn_dealt_player2" for Player2
    And the action buttons should be visible at bottom center in this screenshot
    # PHASE 4: Turn phase game history verification
    And the game history should show different phases correctly
    And the game history should display phase transition to "Turn"
    And I capture screenshot "16a_game_history_turn_phase" showing game history
    And I verify game history shows "TURN" phase with community cards "A♣, Q♠, 9♥, K♣"
    And I capture game history after "PHASE_TRANSITION" by "System"
    # COUNTDOWN UI VERIFICATION - Turn Betting Round
    And I verify countdown timer appears for turn betting round
    And I verify countdown timer is functional during turn phase
    And I verify countdown timer displays correct time for Player1 turn action
    And I capture screenshot "countdown_turn_player1_before_action" showing countdown timer
    And Player1 bets $15
    And the action buttons should show proper active/inactive visual states
    Then I capture screenshot "17_turn_betting_player1" for Player1
    And the action buttons should be visible at bottom center in this screenshot
    # Verify Player1 bet action during turn
    And I verify game history shows "BET" action by "Player1" with amount "$15"
    And I capture game history after "BET" by "Player1"
    # COUNTDOWN UI VERIFICATION - Turn Player2 Turn
    And I verify countdown timer switches to Player2 for turn decision
    And I verify countdown timer resets and shows full time for Player2
    And I capture screenshot "countdown_turn_player2_before_action" showing countdown timer
    And Player2 calls $15
    And the action buttons should show proper active/inactive visual states
    Then I capture screenshot "18_turn_betting_player2" for Player2
    And the action buttons should be visible at bottom center in this screenshot
    # Verify Player2 call action during turn
    And I verify game history shows "CALL" action by "Player2" with amount "$15"
    And I capture game history after "CALL" by "Player2"
    And I capture screenshot "18a_game_history_turn_complete" showing game history
    And the game history should display betting actions with amounts: "BET $15, CALL $15"
    Then the pot should be $58
    And both players should see the turn card K♣
    And Player1 should have two pair with A♠K♠
    And Player2 should have straight draw potential
    And the action button container should have dark theme styling
    When the river is dealt: 10♥
    Then I capture screenshot "19_river_dealt_player1" for Player1
    And I capture screenshot "20_river_dealt_player2" for Player2
    And the action buttons should be visible at bottom center in this screenshot
    # PHASE 5: River phase game history verification
    And the game history should show different phases correctly
    And the game history should display phase transition to "River"
    And I capture screenshot "20a_game_history_river_phase" showing game history
    And I verify game history shows "RIVER" phase with community cards "A♣, Q♠, 9♥, K♣, 10♥"
    And I capture game history after "PHASE_TRANSITION" by "System"
    # COUNTDOWN UI VERIFICATION - River Betting Round
    And I verify countdown timer appears for final river betting round
    And I verify countdown timer is visible and functional during river phase
    And I verify countdown timer displays correct time for Player1 river action
    And I capture screenshot "countdown_river_player1_before_action" showing countdown timer
    And Player1 bets $20
    And the action buttons should show proper active/inactive visual states
    Then I capture screenshot "21_river_betting_player1" for Player1
    And the action buttons should be visible at bottom center in this screenshot
    # Verify Player1 bet action during river
    And I verify game history shows "BET" action by "Player1" with amount "$20"
    And I capture game history after "BET" by "Player1"
    # COUNTDOWN UI VERIFICATION - River Player2 All-In Decision
    And I verify countdown timer switches to Player2 for critical river decision
    And I verify countdown timer is visible for Player2 all-in decision
    And I capture screenshot "countdown_river_player2_before_allin" showing countdown timer
    And Player2 goes all-in with remaining chips
    And the action buttons should show proper active/inactive visual states
    Then I capture screenshot "22_river_betting_player2" for Player2
    And the action buttons should be visible at bottom center in this screenshot
    # Verify Player2 all-in action during river
    And I verify game history shows "ALL-IN" action by "Player2" with amount "$57"
    And I capture game history after "ALL-IN" by "Player2"
    # COUNTDOWN UI VERIFICATION - River Player1 Call All-In Decision
    And I verify countdown timer appears for Player1 call all-in decision
    And I verify countdown timer is visible for final critical decision
    And I capture screenshot "countdown_river_player1_before_call" showing countdown timer
    And Player1 calls the all-in
    And the action buttons should be visible at bottom center in this screenshot
    # Verify Player1 call all-in action
    And I verify game history shows "CALL" action by "Player1" with amount "$57"
    And I capture game history after "CALL" by "Player1"
    And I capture screenshot "22a_game_history_river_complete" showing game history
    And the game history should display betting actions with amounts: "BET $20, ALL-IN $57, CALL $37"
    Then the pot should be $200 (all remaining chips)
    And the showdown should reveal both players' cards
    Then I capture screenshot "23_showdown_player1" for Player1
    And I capture screenshot "24_showdown_player2" for Player2
    # PHASE 6: Showdown phase game history verification
    And the game history should display betting actions with total pot amount "$200"
    And the game history should show different phases correctly
    And the game history should display phase transition to "Showdown"
    And I capture screenshot "24a_game_history_final" showing game history
    And I verify game history shows "SHOWDOWN" phase with final results
    And I capture game history after "SHOWDOWN" by "System"
    And I capture comprehensive game history progression
    And Player2 should win with "straight" (Q♥J♥ + A♣Q♠9♥K♣10♥ = A-K-Q-J-10 straight)
    And the game should end with proper chip distribution (Player2 wins $200)
    # Final comprehensive game history verification
    And the game history should contain complete action sequence: "SB $1, BB $2, RAISE $6, CALL $4, BET $8, CALL $8, BET $15, CALL $15, BET $20, ALL-IN $57, CALL $37"
    And I capture screenshot "24b_game_history_complete" showing complete game history
    
    # COMPREHENSIVE COUNTDOWN UI VERIFICATION SUITE
    Then I perform comprehensive countdown timer functionality verification
    And I verify countdown timer behavior across all betting rounds
    And I verify countdown timer visual consistency and styling
    And I verify countdown timer accuracy and timing precision
    And I verify countdown timer player switching functionality
    And I verify countdown timer timeout and auto-action behavior if applicable
    And I capture comprehensive countdown timer verification report
    And I validate countdown timer UI elements and animations
    And I test countdown timer edge cases and boundary conditions
    And I capture final countdown timer validation screenshot
    
    # COMPREHENSIVE GAME HISTORY UI VERIFICATION SUITE
    Then I perform comprehensive game history content verification
    And I verify game history displays all player actions chronologically: "SB→BB→RAISE→CALL→BET→CALL→BET→CALL→BET→ALL-IN→CALL"
    And I verify game history shows correct betting amounts for each action: "$1, $2, $6, $4, $8, $8, $15, $15, $20, $57, $37"
    And I verify game history displays all community card events: "Flop: A♣Q♠9♥, Turn: K♣, River: 10♥"
    And I verify game history shows proper phase transitions: "Preflop→Flop→Turn→River→Showdown"
    And I verify game history displays winner determination correctly: "Player2 wins with straight, $200 pot"
    And I capture comprehensive game history verification report
    And I validate game history UI elements and styling
    And I verify game history scrolling and navigation functionality
    And I test game history filtering and search capabilities if available
    And I verify game history timestamps and sequencing accuracy
    And I capture final comprehensive game history validation screenshot
    
    And the observers list should always be empty with seated players

  @heads-up-poker
  Scenario: Heads-Up Pre-Flop All-In
    # Background setup already completed
    When hole cards are dealt according to the test scenario:
      | Player  | Card1 | Card2 |
      | Player1 | A♠    | A♥    |
      | Player2 | K♣    | K♦    |
    Then each player should see their own hole cards
    And the action buttons should be visible at bottom center in this screenshot
    When the pre-flop betting round begins
    And the action buttons should be visible at bottom center in this screenshot
    And the action buttons should show proper active/inactive visual states
    And Player1 goes all-in with remaining chips
    And the action buttons should be visible at bottom center in this screenshot
    And Player2 calls the all-in
    And the action buttons should be visible at bottom center in this screenshot
    Then the pot should contain all remaining chips
    And the showdown should reveal both players' cards
    And Player1 should win with "pair of aces"
    And the game should end with proper chip distribution

  @betting-slider-test
  Scenario: Comprehensive Betting Slider Testing
    # Background setup already completed
    When hole cards are dealt according to the test scenario:
      | Player  | Card1 | Card2 |
      | Player1 | A♠    | K♠    |
      | Player2 | Q♥    | J♥    |
    Then each player should see their own hole cards
    And the action buttons should be visible at bottom center in this screenshot
    When the pre-flop betting round begins
    And the action buttons should be visible at bottom center in this screenshot
    
    # Test basic slider functionality
    Then the betting slider should be visible and functional
    And the betting slider should have modern styling
    And the betting slider should have proper styling and labels
    And the betting slider should be disabled for inactive players
    
    # Test slider interaction and smart button behavior
    When I move the betting slider to 10
    Then the betting slider should show value 10
    And the smart bet button should show "Bet $10"
    
    When I move the betting slider to 50
    Then the betting slider should show value 50
    And the smart bet button should show "Bet $50"
    
    When I move the betting slider to 100
    Then the betting slider should show value 100
    And the smart bet button should show "All In"
    
    # Test actual betting with slider
    When I move the betting slider to 6
    And Player1 raises to $6
    And the action buttons should show proper active/inactive visual states
    Then I capture screenshot "betting_slider_after_raise" for Player1
    And I capture screenshot "betting_slider_waiting_player" for Player2
    
    # Test slider state after action
    And the betting slider should be disabled for inactive players
    And Player2 calls $4 more
    And the action buttons should show proper active/inactive visual states
    
    # Test slider in different betting rounds
    When the flop is dealt: A♣, Q♠, 9♥
    Then the betting slider should be visible and functional
    And the betting slider should have proper styling and labels
    
    When I move the betting slider to 15
    And Player1 bets $15
    Then I capture screenshot "flop_slider_betting" for Player1
    And the betting slider should be disabled for inactive players
    
    And Player2 calls $15
    And the action buttons should show proper active/inactive visual states

  @game-history-comprehensive
  Scenario: Comprehensive Game History Verification
    # Background setup already completed
    When hole cards are dealt according to the test scenario:
      | Player  | Card1 | Card2 |
      | Player1 | A♠    | K♠    |
      | Player2 | Q♥    | J♥    |
    Then each player should see their own hole cards
    And the action buttons should be visible at bottom center in this screenshot
    
    # Test initial game history state
    Then the game history should be visible and functional
    And the game history should display current player information
    And I capture screenshot "history_01_initial_state" showing game history
    
    # Test game history during pre-flop betting
    When the pre-flop betting round begins
    And Player1 raises to $6
    Then the game history should show action records
    And the game history should update after player actions
    And the game history should display betting actions with amounts: "SB $1, BB $2, RAISE $6"
    And I capture screenshot "history_02_preflop_betting" showing game history
    
    When Player2 calls $4 more
    Then the game history should update after player actions
    And the game history should display betting actions with amounts: "SB $1, BB $2, RAISE $6, CALL $4"
    And I capture screenshot "history_03_preflop_complete" showing game history
    
    # Test game history phase transitions
    When the flop is dealt: A♣, Q♠, 9♥
    Then the game history should show different phases correctly
    And the game history should display phase transition to "Flop" with community cards "A♣, Q♠, 9♥"
    And I capture screenshot "history_04_flop_phase" showing game history
    
    When Player1 bets $8
    And Player2 calls $8
    Then the game history should display betting actions with amounts: "BET $8, CALL $8"
    And I capture screenshot "history_05_flop_betting" showing game history
    
    # Test game history through turn phase
    When the turn is dealt: K♣
    Then the game history should show different phases correctly
    And the game history should display phase transition to "Turn" with community cards "A♣, Q♠, 9♥, K♣"
    And I capture screenshot "history_06_turn_phase" showing game history
    
    When Player1 bets $15
    And Player2 calls $15
    Then the game history should update after player actions
    And the game history should display betting actions with amounts: "BET $15, CALL $15"
    And I capture screenshot "history_07_turn_betting" showing game history
    
    # Test game history through river and showdown
    When the river is dealt: 10♥
    Then the game history should show different phases correctly
    And the game history should display phase transition to "River" with community cards "A♣, Q♠, 9♥, K♣, 10♥"
    And I capture screenshot "history_08_river_phase" showing game history
    
    When Player1 bets $20
    And Player2 goes all-in with remaining chips
    And Player1 calls the all-in
    Then the game history should display betting actions with amounts: "BET $20, ALL-IN $57, CALL $37"
    And the game history should show different phases correctly
    And the game history should display final pot amount: "$200"
    And I capture screenshot "history_09_final_complete" showing game history
    
    # Verify comprehensive game history
    And the showdown should reveal both players' cards
    And Player2 should win with "straight" (Q♥J♥ makes A-K-Q-J-10 straight)
    And the game should end with proper chip distribution (Player2 wins $200)
    And the game history should display complete game summary: "11 actions, 5 phases, $200 total pot, Player2 winner"