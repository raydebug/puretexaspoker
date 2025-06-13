Feature: Join Table Button States for Anonymous Users
  As a product manager
  I want join table buttons to be inactive when users are not logged in
  So that users understand they need to authenticate before joining tables

  Background:
    Given I am on the poker lobby page
    And tables are loaded and visible

  Scenario: Join table buttons are disabled for anonymous users
    Given I am browsing anonymously
    When I view the table list
    Then all join table buttons should be disabled
    And join table buttons should have inactive styling
    And join table buttons should show "Login to Join" text
    And join table buttons should not be clickable

  Scenario: Join table buttons become active after login
    Given I am browsing anonymously
    And all join table buttons are disabled
    When I login with a valid nickname
    Then all join table buttons should become enabled
    And join table buttons should have active styling
    And join table buttons should show "Join Table" text
    And join table buttons should be clickable

  Scenario: Join table buttons become disabled after logout
    Given I am logged in with a valid nickname
    And all join table buttons are enabled
    When I logout and choose to browse anonymously
    Then all join table buttons should become disabled
    And join table buttons should revert to inactive styling
    And join table buttons should show "Login to Join" text

  Scenario: Disabled join table buttons show tooltip
    Given I am browsing anonymously
    When I hover over a disabled join table button
    Then I should see a tooltip saying "Please login to join tables"

  Scenario: Clicking disabled join table button triggers login
    Given I am browsing anonymously
    And join table buttons are disabled
    When I attempt to click a join table button
    Then the login modal should appear
    And I should be prompted to enter my nickname 