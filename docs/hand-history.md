In online Texas Hold'em poker, **game hand histories** are textual or structured logs that record the **actions of each hand** from beginning to end. These are used for review, analysis, and often imported into tracking software like PokerTracker or Holdem Manager.

Here’s what a typical **hand history** looks like from a site like PokerStars (in human-readable form):

---

**PokerStars Hand #1234567890: Hold'em No Limit (\$0.50/\$1.00 USD) - 2025/07/26 20:00:00 ET**
Table 'Alpha123' 6-max Seat #3 is the button
Seat 1: Player1 (\$100 in chips)
Seat 2: Player2 (\$120)
Seat 3: Player3 (\$80)
Seat 4: Player4 (\$150)
Seat 5: Hero (\$100)
Seat 6: Player6 (\$95)

\*\*\*\*\* HOLE CARDS \*\*\*
Dealt to Hero \[Ah Kh]
Player1: folds
Player2: raises \$3 to \$4
Player3: folds
Player4: calls \$4
Hero: raises \$12 to \$16
Player6: folds
Player2: calls \$12
Player4: calls \$12

\*\*\*\*\* FLOP \*\*\* \[Kd 9s 2h]
Player2: checks
Player4: checks
Hero: bets \$25
Player2: folds
Player4: calls \$25

\*\*\*\*\* TURN \*\*\* \[Kd 9s 2h] \[8c]
Player4: checks
Hero: bets \$35
Player4: folds

**Uncalled bet (\$35) returned to Hero**
Hero collected \$92 from pot
Hero: doesn't show hand

\*\*\*\*\* SUMMARY \*\*\*
Total pot \$95 | Rake \$3
Board \[Kd 9s 2h 8c]
Hero collected \$92
Player2 lost \$16
Player4 lost \$29

---

### Key Components:

* **Metadata:** Poker room, hand number, date/time, stakes
* **Seat Info:** Who sits where and how many chips they have
* **Actions:**

  * **Hole Cards:** Dealt to you (Hero)
  * **Preflop, Flop, Turn, River:** Bet, fold, raise, check
* **Showdown (if any):** Cards shown, who wins
* **Summary:** Pot, rake, winners/losers

### Variations

* Some sites log in JSON/CSV/XML format for programmatic parsing.
* HUD tools extract stats from these logs: VPIP, PFR, Aggression %, etc.
