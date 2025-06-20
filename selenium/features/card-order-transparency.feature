Feature: Card Order Transparency System
  As a poker player
  I want to verify the integrity of card shuffling
  So that I can trust the fairness of the game

  Background:
    Given the card order transparency system is enabled
    And I am directly on the game page with test data

  Scenario: Generate and display card order hash before game starts
    When I start a new poker game
    Then a card order hash should be generated before dealing
    And the hash should be displayed to all players
    And the card order should be stored in the database
    And the card order should initially be unrevealed

  Scenario: View latest 10 card orders
    Given there are multiple completed games with card orders
    When I request the latest card orders via API
    Then I should receive up to 10 card order records
    And each record should contain game ID, hash, and reveal status
    And revealed records should include the actual card order
    And unrevealed records should hide the card order details

  Scenario: Download card order history
    Given there are completed games with revealed card orders
    When I request to download the card order history
    Then I should receive a CSV file with card order data
    And the CSV should contain game ID, hash, seed, and card sequence
    And only revealed card orders should be included in the download

  Scenario: Verify card order integrity
    Given a game has been completed with revealed card order
    When I verify the card order using the original hash
    Then the verification should confirm the card order is authentic
    And the computed hash should match the stored hash
    And the card sequence should be verifiable against the seed

  Scenario: Automatic card order reveal after game completion
    Given I have 2 players already seated:
      | nickname    | seat | chips |
      | TestPlayer1 | 1    | 200   |
      | TestPlayer2 | 2    | 150   |
    When the game starts and progresses to completion
    Then the card order should be automatically revealed
    And players should be notified of the card order revelation
    And the card order should become publicly viewable

  Scenario: Hash verification with tampered data
    Given a game has been completed with revealed card order
    When I attempt to verify with an incorrect hash
    Then the verification should fail
    And the system should indicate hash mismatch
    And the actual vs expected hashes should be shown

  Scenario: Deterministic shuffle verification
    Given a specific seed is used for card shuffling
    When the same seed is used to regenerate the deck
    Then the card order should be identical
    And the hash should match the original
    And the shuffle should be reproducible

  Scenario: Card order transparency API endpoints
    Given the poker system is running
    When I access the card order transparency endpoints
    Then I should be able to get latest card orders
    And I should be able to get card orders by game ID
    And I should be able to download card order history
    And I should be able to verify card order hashes
    And all endpoints should return proper error handling 