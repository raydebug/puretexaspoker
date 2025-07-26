Feature: 2-Player Complete Game with Screenshots

  As a poker game system
  I want to execute a complete 2-player Texas Hold'em game with visual verification
  So that I can see each step of the game through screenshots

  @screenshot-test
  Scenario: Complete 2-Player Game with Step-by-Step Screenshots
    Given the database is reset to a clean state
    And the User table is seeded with test players
    And I have exactly 2 players with screenshot capture ready
    When exactly 2 players join the table with screenshots:
      | Player  | Seat |
      | Player1 | 1    |
      | Player2 | 2    |
    And the game starts and blinds are posted with screenshot
    When hole cards are dealt with screenshot verification:
      | Player  | Card1 | Card2 |
      | Player1 | A♠    | K♠    |
      | Player2 | Q♥    | J♥    |
    And Player1 raises to $6 with screenshot
    And Player2 calls with screenshot
    When the flop is dealt with screenshot: "A♣, Q♠, 9♥"
    And flop betting occurs with screenshots
    When the turn is dealt with screenshot: "K♣"
    And turn betting occurs with screenshots
    When the river is dealt with screenshot: "10♥"
    And final betting and all-in occurs with screenshots
    And showdown occurs with screenshot
    Then the game ends with final screenshot