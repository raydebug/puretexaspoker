Feature: User Role Management System
  As a poker platform administrator
  I want a comprehensive user role management system with permissions and moderation
  So that I can properly manage users, enforce rules, and maintain platform security

  Background:
    Given the server is running on "http://localhost:8080"
    And the role system is initialized with default roles and permissions
    And I am in the game lobby

  Scenario: User Registration with Default Role Assignment
    Given I register a new user "NewPlayer" with password "password123"
    When the registration is successful
    Then "NewPlayer" should be assigned the "player" role by default
    And "NewPlayer" should have "join_game" permission
    And "NewPlayer" should have "place_bet" permission
    And "NewPlayer" should have "chat_message" permission
    And "NewPlayer" should NOT have "warn_player" permission
    And "NewPlayer" should NOT have "ban_user" permission

  Scenario: Role-Based Permission Validation
    Given I have test users with different roles:
      | username  | role          | password    |
      | TestPlayer | player        | password123 |
      | TestMod    | moderator     | password123 |
      | TestAdmin  | administrator | password123 |
    When I check permissions for each user
    Then "TestPlayer" should have permissions: "join_game,place_bet,chat_message"
    And "TestMod" should have permissions: "join_game,place_bet,chat_message,warn_player,kick_player"
    And "TestAdmin" should have permissions: "join_game,place_bet,chat_message,warn_player,kick_player,ban_user"

  Scenario: Permission-Based Action Enforcement
    Given I create test players "RegularPlayer,ModeratorUser" with roles "player,moderator"
    And both users are logged into the system
    When "RegularPlayer" attempts to kick another player
    Then the moderation action should be rejected with "Insufficient permissions"
    When "ModeratorUser" attempts to kick another player
    Then the action should be successful
    And a moderation record should be created

  Scenario: User Role Assignment by Administrator
    Given I have an administrator "AdminUser" and a player "TargetPlayer"
    And "AdminUser" is logged into the system
    When "AdminUser" assigns "TargetPlayer" the role "moderator"
    Then "TargetPlayer" should have the "moderator" role
    And "TargetPlayer" should gain "warn_player" permission
    And "TargetPlayer" should gain "kick_player" permission
    And the role change should be logged in the system

  Scenario: Moderation Action Execution - Player Warning
    Given I have a moderator "ModUser" and a player "TargetUser"
    And both users are in the same poker game
    When "ModUser" issues a warning to "TargetUser" with reason "Inappropriate chat"
    Then a moderation action record should be created
    And the action type should be "warn"
    And the reason should be "Inappropriate chat"
    And "TargetUser" should receive a warning notification
    And the moderation should appear in "TargetUser" moderation history

  Scenario: Moderation Action Execution - Player Kick
    Given I have a moderator "ModUser" and a player "DisruptivePlayer"
    And "DisruptivePlayer" is in a poker game
    When "ModUser" kicks "DisruptivePlayer" with reason "Disruptive behavior"
    Then "DisruptivePlayer" should be removed from the game
    And a kick moderation record should be created
    And "DisruptivePlayer" should be notified about the kick
    And other players should see a system message about the kick

  Scenario: Moderation Action Execution - Player Ban
    Given I have an administrator "AdminUser" and a player "ProblematicUser"
    When "AdminUser" bans "ProblematicUser" with reason "Repeated violations"
    Then "ProblematicUser" should be marked as banned in the database
    And "ProblematicUser" should be set to inactive
    And a ban moderation record should be created
    When "ProblematicUser" attempts to login
    Then the login should be rejected with "Account is banned"

  Scenario: Temporary Moderation Actions with Duration
    Given I have a moderator "TempModUser" and a player "TempTargetUser"
    When "TempModUser" mutes "TempTargetUser" for 30 minutes with reason "Spam"
    Then a mute moderation record should be created with 30 minute duration
    And the expiration time should be set correctly
    And "TempTargetUser" should be prevented from chatting
    When 30 minutes pass
    Then the mute should automatically expire
    And "TempTargetUser" should be able to chat again

  Scenario: Role Hierarchy Enforcement
    Given I have users with different roles:
      | username    | role          |
      | Player1     | player        |
      | Moderator1  | moderator     |
      | Admin1      | administrator |
    When "Player1" attempts to moderate "Moderator1"
    Then the action should be rejected due to insufficient role level
    When "Moderator1" attempts to ban "Admin1"
    Then the action should be rejected due to insufficient role level
    When "Admin1" moderates "Moderator1"
    Then the action should be successful

  Scenario: Moderation History and Audit Trail
    Given I have a moderator "AuditMod" and a player "HistoryPlayer"
    When "AuditMod" performs the following actions on "HistoryPlayer":
      | action | reason          | duration |
      | warn   | First warning   |          |
      | mute   | Chat violation  | 15       |
      | kick   | Continued issue |          |
    Then "HistoryPlayer" should have 3 moderation records
    And the moderation history should show all actions in chronological order
    And each record should include moderator information and timestamps
    And the audit trail should be accessible to administrators

  Scenario: Active Moderation Status Check
    Given I have a player "StatusPlayer" with active moderations
    And "StatusPlayer" has an active mute for 60 minutes
    And "StatusPlayer" has an expired warning from yesterday
    When I check "StatusPlayer" active moderations
    Then only the active mute should be returned
    And the expired warning should not be included
    And the remaining mute time should be calculated correctly

  Scenario: Permission-Based UI Access Control
    Given I have users with different roles logged into the frontend
    When "player" role user views the interface
    Then they should see standard game controls
    And they should NOT see moderation controls
    And they should NOT see admin panel access
    When "moderator" role user views the interface
    Then they should see standard game controls
    And they should see moderation controls
    And they should NOT see admin panel access
    When "administrator" role user views the interface
    Then they should see all game controls
    And they should see all moderation controls
    And they should see admin panel access

  Scenario: Banned User Access Prevention
    Given I have a banned user "BannedUser"
    When "BannedUser" attempts to join a poker game
    Then the action should be rejected
    When "BannedUser" attempts to send a chat message
    Then the action should be rejected
    When "BannedUser" attempts to access any game feature
    Then all actions should be rejected with appropriate messages

  Scenario: User Role Information API
    Given I have a user "InfoUser" with role "moderator"
    When I request user role information for "InfoUser"
    Then the response should include role name "moderator"
    And the response should include role display name "Moderator"
    And the response should include role level 50
    And the response should include all assigned permissions
    And the response should include user status information

  Scenario: Mass User Management for Administrators
    Given I have an administrator "MassAdmin"
    When "MassAdmin" requests all users with their roles
    Then the response should include all users in the system
    And each user should have complete role information
    And the list should be properly paginated
    And the response should include user status and ban information
    And the data should be sorted by registration date 