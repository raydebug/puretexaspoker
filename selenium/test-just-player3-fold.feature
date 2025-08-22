Feature: Test Player3 Fold ActionHistory Update

@test-fold-only
Scenario: Test Player3 Fold Updates ActionHistory
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
  And the game history should show 2 action records
  When hole cards are dealt according to comprehensive test scenario:
    | Player  | Card1 | Card2 | Hand Strength | Strategy |
    | Player1 | A♠    | K♠    | Premium       | Aggressive |
    | Player2 | Q♥    | J♥    | Strong        | Moderate |
    | Player3 | 7♣    | 2♠    | Weak          | Fold Early |
    | Player4 | 10♦   | 10♣   | Good Pair     | Call/Raise |
    | Player5 | A♥    | Q♦    | Strong        | Selective |
  Then the pre-flop betting round starts with UTG to act
  And Player3 (UTG) folds with weak hand 7♣2♠
  Then I should see enhanced game history: "Player3 (UTG) folds — Stack: $100"
  And the game history should show 3 action records