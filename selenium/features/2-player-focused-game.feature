Feature: 2-Player Focused Game with UI Verification

  As a poker game system
  I want to execute a complete 2-player Texas Hold'em game with comprehensive UI verification
  So that I can validate hole cards, community cards, and game history display in each phase

  @2player-focused
  Scenario: Complete 2-Player Game with UI Verification in All Phases
    Given I setup a focused 2-player game test
    When both players join table 1 using auto-seat
    And I manually start the 2-player game for table 1
    And I set hole cards for the test scenario:
      | Player  | Card1 | Card2 |
      | Player1 | A♠    | K♠    |
      | Player2 | Q♥    | J♥    |
    
    # PREFLOP VERIFICATION
    Then each player should see their own hole cards on the UI
    And each player should see face-down cards for other players
    And I should see game history updated with each action on UI
    
    # FLOP PHASE
    When the flop is dealt with cards: "A♣, Q♠, 9♥"
    Then both players should see the 3 community cards on UI
    And each player should see their own hole cards on the UI
    And I should see game history updated with each action on UI
    
    # TURN PHASE  
    When the flop is dealt with cards: "A♣, Q♠, 9♥, K♣"
    Then both players should see the 4 community cards on UI
    And each player should see their own hole cards on the UI
    And I should see game history updated with each action on UI
    
    # RIVER PHASE
    When the flop is dealt with cards: "A♣, Q♠, 9♥, K♣, 10♥"
    Then both players should see the 5 community cards on UI
    And each player should see their own hole cards on the UI
    And I should see game history updated with each action on UI