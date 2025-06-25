@comprehensive-hand-evaluation
Feature: Comprehensive Hand Evaluation and Showdown Testing
  As a poker system, I need to correctly evaluate poker hands and handle all showdown scenarios
  including ties, side pots, kickers, and complex multi-player situations.

  Background:
    Given I have a clean test environment
    And the poker application is running
    And I create a test game "comp_eval_game" with the following players:
      | nickname | chips | seat |
      | Alice    | 1000  | 1    |
      | Bob      | 1000  | 2    |
      | Charlie  | 1000  | 3    |
      | Diana    | 500   | 4    |

  @hand-rankings @priority-high
  Scenario: Complete Poker Hand Rankings Verification
    Given all players are seated and the game has started
    When I setup deterministic hands for comprehensive evaluation:
      | player  | hole_cards | hand_rank        | best_hand                     |
      | Alice   | AS, AD     | royal_flush      | AS, KS, QS, JS, TS           |
      | Bob     | KH, KD     | straight_flush   | 9H, 8H, 7H, 6H, 5H           |
      | Charlie | QC, QS     | four_of_a_kind   | JC, JD, JH, JS, 9C           |
      | Diana   | JD, JH     | full_house       | 8D, 8H, 8C, 7D, 7H          |
    And the community cards are revealed as "AH, KS, QD, JC, TC"
    When the hand reaches showdown
    Then the hands should be ranked correctly:
      | position | player  | hand_rank        | hand_strength |
      | 1        | Alice   | royal_flush      | 1000         |
      | 2        | Bob     | straight_flush   | 900          |
      | 3        | Charlie | four_of_a_kind   | 800          |
      | 4        | Diana   | full_house       | 700          |
    And Alice should win the main pot
    And the hand evaluation should be logged with complete details

  @kicker-testing @priority-high  
  Scenario: Kicker Card Tie-Breaking Scenarios
    Given all players are seated and the game has started
    When I setup hands with identical ranks but different kickers:
      | player  | hole_cards | community_contribution | kicker_cards    |
      | Alice   | AS, AH     | AD, KS, QH             | AS, AH, AD, KS, QH |
      | Bob     | AC, AD     | AS, KH, QC             | AC, AD, AS, KH, QC |
      | Charlie | AH, AC     | AS, KD, JH             | AH, AC, AS, KD, JH |
    And the community cards include "AS, 7H, 6C, 5D, 2S"
    When the hand reaches showdown with identical three-of-a-kind aces
    Then the kicker evaluation should determine:
      | player  | primary_kicker | secondary_kicker | winner |
      | Alice   | KS             | QH               | false  |
      | Bob     | KH             | QC               | true   |
      | Charlie | KD             | JH               | false  |
    And Bob should win with the highest kickers
    And the kicker comparison should be logged in detail

  @side-pots @priority-high
  Scenario: Complex Side Pot Calculations with All-In Players
    Given all players are seated with different chip amounts:
      | player  | chips |
      | Alice   | 1000  |
      | Bob     | 600   |
      | Charlie | 300   |
      | Diana   | 150   |
    When the betting progresses with all-in scenarios:
      | player  | action | amount | pot_contribution | remaining_chips |
      | Diana   | all_in | 150    | 150              | 0               |
      | Charlie | all_in | 300    | 300              | 0               |
      | Bob     | all_in | 600    | 600              | 0               |
      | Alice   | call   | 600    | 600              | 400             |
    Then the side pots should be calculated as:
      | pot_name  | eligible_players           | pot_amount | description                    |
      | main_pot  | Alice, Bob, Charlie, Diana | 600        | 4 × 150 (Diana's all-in)     |
      | side_pot1 | Alice, Bob, Charlie        | 450        | 3 × 150 (Charlie's extra)     |
      | side_pot2 | Alice, Bob                 | 600        | 2 × 300 (Bob's extra)         |
    When the hand completes and winners are determined:
      | pot_name  | winner  | amount_won |
      | main_pot  | Diana   | 600        |
      | side_pot1 | Charlie | 450        |
      | side_pot2 | Bob     | 600        |
    Then the chip distribution should be correct
    And all side pot calculations should be auditable

  @tie-scenarios @priority-medium
  Scenario: Tie Scenarios with Split Pots
    Given all players are seated and the game has started
    When multiple players have identical winning hands:
      | player  | hole_cards | final_hand              | hand_rank |
      | Alice   | AS, AD     | AS, AD, KH, QC, JD     | one_pair  |
      | Bob     | AH, AC     | AH, AC, KS, QD, JH     | one_pair  |
      | Charlie | 7S, 6D     | KH, QC, JD, TC, 9S     | high_card |
    And the community cards are "KH, QC, JD, TC, 9S"
    When the hand reaches showdown
    Then Alice and Bob should split the pot equally
    And Charlie should receive no winnings
    And the split pot calculation should handle odd chip divisions
    And each tied player should receive equal shares

  @burn-cards @priority-medium
  Scenario: Burn Card Implementation and Verification
    Given all players are seated and the game has started
    When the dealer begins dealing community cards
    Then a burn card should be discarded before each community card round:
      | phase   | burn_card_position | community_cards_dealt |
      | flop    | 1                  | 3                     |
      | turn    | 5                  | 1                     |
      | river   | 7                  | 1                     |
    And the burn cards should not be visible to any player
    And the burn cards should not affect hand evaluation
    And the burn card implementation should follow standard poker rules

  @showdown-edge-cases @priority-medium
  Scenario: Edge Cases in Showdown Evaluation
    Given all players are seated and the game has started
    When edge case scenarios occur during showdown:
      | scenario_type           | description                               | expected_behavior          |
      | board_plays             | Best hand is the board itself           | All active players split   |
      | identical_hands         | Multiple players same exact hand        | Equal pot split            |
      | folded_player_exposure  | Folded player accidentally shows cards  | Cards ignored in showdown  |
      | insufficient_cards      | Player has fewer than 2 hole cards     | Error handling graceful    |
      | misread_hand           | Hand strength miscalculation           | Correction and re-evaluation |
    Then the system should handle each edge case correctly
    And appropriate error messages should be displayed
    And game integrity should be maintained

  @performance-validation @priority-low
  Scenario: Hand Evaluation Performance Under Load
    Given I create a tournament with 100 simultaneous games
    When each game reaches showdown simultaneously
    And each game has 8-10 players requiring hand evaluation
    Then hand evaluation should complete within performance thresholds:
      | metric                    | threshold | actual |
      | average_evaluation_time   | < 50ms   | TBD    |
      | maximum_evaluation_time   | < 200ms  | TBD    |
      | concurrent_evaluations    | >= 800   | TBD    |
      | memory_usage_increase     | < 100MB  | TBD    |
    And no evaluation errors should occur
    And all results should be deterministic and auditable

  @audit-trail @priority-medium
  Scenario: Complete Hand Evaluation Audit Trail
    Given all players are seated and the game has started
    When a hand completes with showdown
    Then the system should create a complete audit trail including:
      | audit_component        | required_data                                    |
      | pre_showdown_state     | All player hands, community cards, pot sizes   |
      | hand_evaluations       | Each player's best hand and ranking            |
      | winner_determination   | Winning hand(s) and tie-breaking logic         |
      | pot_distribution       | Main pot and side pot allocations              |
      | final_chip_counts      | Updated player chip totals                      |
      | timestamp_sequence     | Exact timing of each evaluation step           |
    And the audit trail should be tamper-evident
    And the audit data should enable complete hand replay
    And compliance with poker regulations should be verifiable 