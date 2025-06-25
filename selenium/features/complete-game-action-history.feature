Feature: Complete Game Action History Coverage
  As a poker player or observer
  I want to see complete action history for an entire poker hand
  So that I can review every decision from preflop through showdown

  Background:
    Given I am directly on the game page with test data
    And I have 4 players already seated:
      | nickname    | seat | chips |
      | Alice       | 1    | 1000  |
      | Bob         | 2    | 1000  |
      | Charlie     | 3    | 1000  |
      | Diana       | 4    | 1000  |

  Scenario: Complete Texas Hold'em Hand with Full Action History
    # Initial Setup Verification
    Then I should see the action history component
    And the action history should be empty initially
    
    # Preflop Phase - Small/Big Blinds
    When the game starts with blinds posted
    Then the action history should show:
      | player  | action     | amount | phase   |
      | Alice   | Small Blind| $5     | preflop |
      | Bob     | Big Blind  | $10    | preflop |
    And the action history should show 2 total actions
    
    # Preflop Betting Round
    When "Charlie" performs a "call" action with amount "10"
    Then the action history should show the "call" action
    And the action history should show "Charlie call $10"
    
    When "Diana" performs a "raise" action with amount "30" 
    Then the action history should show "Diana raise $30"
    
    When "Alice" performs a "fold" action
    Then the action history should show "Alice fold"
    
    When "Bob" performs a "call" action with amount "20"
    Then the action history should show "Bob call $20"
    
    When "Charlie" performs a "call" action with amount "20"
    Then the action history should show "Charlie call $20"
    
    # Verify Preflop Complete
    Then the action history should show 7 total actions
    And the action history should show actions from "preflop" phase
    And all preflop actions should be chronologically ordered
    
    # Flop Phase
    When the flop is dealt with community cards "A♠ 7♥ 2♦"
    Then the action history should show:
      | action      | content         | phase |
      | System      | Flop Dealt A♠ 7♥ 2♦ | flop  |
    
    # Flop Betting Round
    When "Bob" performs a "check" action
    Then the action history should show "Bob check"
    
    When "Charlie" performs a "bet" action with amount "25"
    Then the action history should show "Charlie bet $25"
    
    When "Diana" performs a "raise" action with amount "75"
    Then the action history should show "Diana raise $75"
    
    When "Bob" performs a "fold" action
    Then the action history should show "Bob fold"
    
    When "Charlie" performs a "call" action with amount "50"
    Then the action history should show "Charlie call $50"
    
    # Verify Flop Complete
    Then the action history should show 13 total actions
    And the action history should show actions from both "preflop" and "flop" phases
    
    # Turn Phase
    When the turn card "K♣" is dealt
    Then the action history should show "System Turn Dealt K♣"
    
    # Turn Betting Round  
    When "Charlie" performs a "check" action
    Then the action history should show "Charlie check"
    
    When "Diana" performs a "bet" action with amount "100"
    Then the action history should show "Diana bet $100"
    
    When "Charlie" performs a "call" action with amount "100"
    Then the action history should show "Charlie call $100"
    
    # Verify Turn Complete
    Then the action history should show 17 total actions
    And the action history should show actions from "preflop", "flop", and "turn" phases
    
    # River Phase
    When the river card "9♠" is dealt
    Then the action history should show "System River Dealt 9♠"
    
    # River Betting Round
    When "Charlie" performs a "check" action
    Then the action history should show "Charlie check"
    
    When "Diana" performs a "allin" action with amount "795"
    Then the action history should show "Diana all-in $795"
    
    When "Charlie" performs a "call" action with amount "795"
    Then the action history should show "Charlie call $795"
    
    # Showdown Phase
    When the showdown phase begins
    Then the action history should show "System Showdown"
    
    When both players reveal their cards:
      | player  | cards    |
      | Charlie | A♥ K♠    |
      | Diana   | A♦ Q♥    |
    Then the action history should show:
      | player  | action | content | phase    |
      | Charlie | Shows  | A♥ K♠   | showdown |
      | Diana   | Shows  | A♦ Q♥   | showdown |
    
    When the winner is determined as "Charlie"
    Then the action history should show "Charlie Wins $1620"
    And the action history should show "System Hand Complete #1"
    
    # Final Verification - Complete Game History
    Then the action history should show 25 total actions
    And the action history should show actions from all phases: "preflop", "flop", "turn", "river", "showdown"
    And each action should display correct timestamps
    And each action should show proper color coding
    And the action history should be scrollable
    And all actions should remain chronologically ordered
    And the complete hand should be reviewable from start to finish

  Scenario: Multi-Hand Action History Accumulation
    # Test action history across multiple hands
    Given a complete hand has been played with 25 actions recorded
    When a new hand begins
    Then the action history should show "System New Hand #2"
    And previous hand actions should still be visible
    
    When the new hand plays out with 15 more actions
    Then the action history should show 41 total actions
    And actions should be grouped by hand number
    And I should be able to scroll through both hands
    And the history should maintain chronological order across hands

  Scenario: Action History Performance with Extended Play
    # Test performance with many actions
    When 5 complete hands are played with average 20 actions each
    Then the action history should show approximately 100 total actions
    And the action history should remain responsive
    And scrolling should be smooth
    And no memory leaks should occur
    And the oldest actions should still be accessible

  Scenario: Action History Data Integrity Validation
    # Comprehensive data validation
    Given a complete hand with all action types has been played
    Then every action should have:
      | property  | requirement                |
      | timestamp | valid time format         |
      | player    | valid player name         |
      | action    | valid poker action type   |
      | amount    | valid monetary amount     |
      | phase     | valid game phase          |
    And no duplicate action entries should exist
    And no missing actions should be detected
    And the action sequence should be logically consistent
    And pot contributions should match action amounts 