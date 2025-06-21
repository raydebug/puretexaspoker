Feature: Game Persistence and Reconnection System
  As a poker platform user
  I want my game state to be preserved and restored automatically
  So that I can reconnect seamlessly after disconnections or browser refreshes

  Background:
    Given the server is running on "http://localhost:8080"
    And the game persistence system is initialized
    And I am in the game lobby

  Scenario: Game State Auto-Save During Active Play
    Given I have an active poker game "PersistenceGame1" with 3 players
    When the game progresses through multiple betting actions:
      | player    | action | amount |
      | TestPlayer1 | bet    | 20     |
      | TestPlayer2 | call   | 20     |
      | TestPlayer3 | raise  | 40     |
    Then the game state should be automatically saved to database
    And the saved game state should include all player actions
    And the saved game state should include current pot amount
    And the saved game state should include current phase "preflop"
    And the auto-save timestamp should be within the last 10 seconds

  Scenario: Complete Game State Restoration After Server Restart
    Given I have an active poker game "PersistenceGame2" with game state saved
    And the game has progressed to the "flop" phase with 3 community cards
    And the pot contains 150 chips from previous betting
    When the server is restarted or the game is restored
    Then the game state should be fully restored from database
    And all players should have their correct chip counts
    And all community cards should be restored in correct order
    And the current phase should be "flop"
    And the pot amount should be exactly 150 chips
    And the current player turn should be preserved

  Scenario: Player Session Creation and Management
    Given I have a registered user "SessionUser1"
    When "SessionUser1" joins game "SessionGame1" as "SessionPlayer1"
    Then a player session should be created in database
    And the session should include user ID, game ID, and player ID
    And the session should have a unique reconnect token
    And the session status should be "connected"
    And the session should be marked as active
    And a connection log entry should be recorded

  Scenario: Browser Refresh with Session Restoration
    Given I have user "RefreshUser" actively playing in game "RefreshGame"
    And "RefreshUser" has placed bets and is in the middle of a hand
    When "RefreshUser" refreshes their browser page
    Then the user should be automatically reconnected to the game
    And their game state should be fully restored
    And they should see their current cards (if any)
    And they should see the correct community cards
    And they should see accurate chip counts for all players
    And they should be able to continue playing immediately

  Scenario: Network Disconnection with Automatic Reconnection
    Given I have user "DisconnectUser" in an active game "DisconnectGame"
    And the user is in the middle of a betting round
    When "DisconnectUser" loses network connection for 30 seconds
    And their WebSocket connection drops
    Then the session should be marked as disconnected in database
    And a disconnection log should be recorded
    When the network connection is restored
    And "DisconnectUser" attempts to reconnect
    Then the reconnection should be successful using their reconnect token
    And they should receive the current game state
    And they should see any actions that occurred while disconnected
    And they should be able to resume playing

  Scenario: Session Timeout and Player Removal
    Given I have user "TimeoutUser" in game "TimeoutGame"
    When "TimeoutUser" disconnects and doesn't reconnect for 15 minutes
    Then the session should be marked as timed out
    And the user should be removed from active play
    And other players should be notified of the timeout
    And the game should continue with remaining players
    And a timeout log entry should be recorded
    When "TimeoutUser" tries to reconnect after timeout
    Then they should be able to rejoin as a spectator
    But they should NOT be able to rejoin the active hand

  Scenario: Multiple Simultaneous Disconnections and Reconnections
    Given I have a game "MultiDisconnectGame" with 5 active players
    When 3 players disconnect simultaneously due to network issues
    Then all 3 disconnections should be handled independently
    And each player's session should be preserved separately
    And the game should pause automatically for missing players
    When the first player reconnects
    Then they should be restored to their exact position
    When the second and third players reconnect
    Then the game should resume automatically with all players
    And all players should have consistent game state

  Scenario: Game Action History Recording and Replay
    Given I have game "HistoryGame" with multiple hands played
    When players perform the following sequence of actions:
      | hand | player      | action | amount | phase   |
      | 1    | HistoryUser1 | bet    | 10     | preflop |
      | 1    | HistoryUser2 | call   | 10     | preflop |
      | 1    | HistoryUser1 | bet    | 20     | flop    |
      | 1    | HistoryUser2 | fold   |        | flop    |
      | 2    | HistoryUser2 | bet    | 15     | preflop |
    Then all actions should be recorded in the action history
    And each action should have correct sequence numbers
    And each action should include player name and timestamp
    And the action history should be retrievable by hand number
    And the complete game replay should be available

  Scenario: Reconnect Token Security and Validation
    Given I have user "SecureUser" with an active session in "SecureGame"
    When "SecureUser" disconnects and receives a reconnect token
    Then the reconnect token should be cryptographically secure
    And the token should be unique to the user and game
    When "SecureUser" attempts to reconnect with the correct token
    Then the reconnection should be successful
    When an attacker attempts to use an invalid token
    Then the reconnection should be rejected
    And a security log entry should be recorded
    When "SecureUser" reconnects, their token should be regenerated

  Scenario: Game State Persistence During Phase Transitions
    Given I have game "TransitionGame" in the middle of a betting round
    When the betting round completes and transitions to the next phase
    And the server automatically deals community cards
    Then the game state should be saved after each phase transition
    And the community cards should be persisted correctly
    And the phase change should be recorded in action history
    And the pot amount should be accurately preserved
    When any player reconnects during or after the transition
    Then they should see the correct new phase and community cards

  Scenario: Connection Quality Monitoring and Adaptive Timeouts
    Given I have user "QualityUser" with varying connection quality
    When "QualityUser" has multiple brief disconnections (< 30 seconds each)
    Then the session timeout should be extended adaptively
    And the user should not be removed from the game
    When "QualityUser" has a stable connection for 5 minutes
    Then the timeout should return to normal duration
    And connection quality metrics should be recorded

  Scenario: Cross-Device Session Management
    Given I have user "CrossDeviceUser" playing on desktop in "CrossDeviceGame"
    When "CrossDeviceUser" opens the game on their mobile device
    Then they should be offered to take over the session
    When they confirm the session takeover
    Then the desktop session should be gracefully disconnected
    And the mobile session should become the active session
    And the game state should transfer seamlessly
    And other players should see no interruption

  Scenario: Emergency Game Suspension and Recovery
    Given I have game "EmergencyGame" with active players and significant pot
    When an emergency server maintenance is required
    Then the game should be automatically suspended with notification
    And the complete game state should be saved immediately
    And all players should receive suspension notification
    When the server maintenance is complete
    Then all suspended games should be automatically restored
    And players should be notified when their games are available
    And they should be able to resume exactly where they left off

  Scenario: Database Transaction Integrity During Saves
    Given I have game "IntegrityGame" with complex game state
    When multiple simultaneous updates occur (player actions + auto-save)
    Then all database operations should be atomic
    And the game state should never be in an inconsistent state
    If a save operation fails partway through
    Then the entire transaction should be rolled back
    And the previous consistent state should be preserved
    And error recovery should be automatic

  Scenario: Session Cleanup and Performance Optimization
    Given the system has been running for several days
    And there are many inactive sessions and old action histories
    When the automatic cleanup process runs
    Then sessions older than 24 hours should be removed
    And action histories older than 30 days should be archived
    And the cleanup should not affect active games
    And system performance should be maintained
    And cleanup statistics should be logged for monitoring 