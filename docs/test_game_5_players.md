
# 🃏 Texas Hold’em Game Simulation — 5 Players

## 🎯 Initial Setup:
- **Blinds**:
  - **Player1**: Small Blind ($1)
  - **Player2**: Big Blind ($2)
- **Stacks**: All players start with **$100**
- **Deck shuffled and cards dealt**

## 🂠 Hole Cards:

| Player   | Hole Cards         |
|----------|--------------------|
| Player1  | 🂦♠️ 🂸♦️ (6♠ 8♦)     |
| Player2  | 🂡♥️ 🃎♥️ (A♥ Q♥)     |
| Player3  | 🃍♣️ 🃑♣️ (J♣ K♣)     |
| Player4  | 🃋♠️ 🂾♠️ (J♠ 10♠)    |
| Player5  | 🂪♦️ 🃁♦️ (Q♦ 2♦)     |

## 🟦 Pre-Flop

- **Player3** raises to **$6**
- **Player4** calls **$6**
- **Player5** folds
- **Player1** calls **$5** more (SB)
- **Player2** re-raises to **$16**
- **Player3** calls **$10**
- **Player4** folds
- **Player1** folds

🪙 **Pot = $41**  
**Remaining players**: Player2, Player3

## 🟩 Flop: **🃑♣️ 🂻♥️ 🂾♦️** (K♣ Q♥ 10♦)

| Player   | Status     | Hand Strength               |
|----------|------------|-----------------------------|
| Player2  | Check      | Top pair (Q♥)               |
| Player3  | Bet $20    | Top pair + straight draw    |
| Player2  | Call $20   |                              |

🪙 **Pot = $81**

## 🟨 Turn: **🂫♠️** (J♣ Q♥ 10♦ K♣ **J♠**)

| Player   | Status     | Hand Strength               |
|----------|------------|-----------------------------|
| Player2  | Bet $30    | Top pair (still)            |
| Player3  | Raise to $60 | Two pair (K♣ + J♣)       |
| Player2  | All-in ($54 total) |
| Player3  | Call remaining $24 |

🪙 **Pot = $195**

## 🟥 River: **🂷♥️** (7♥)

### 🏁 Showdown:

- **Player2**: 🂡♥️ 🃎♥️ (A♥ Q♥) → **Ace-high flush**
- **Player3**: 🃍♣️ 🃑♣️ (J♣ K♣) → Two pair (K♣ + J♣)

🎉 **Winner: Player2** with **Flush (A♥ Q♥ + 2♥ board)**  
💰 **Pot Won**: $195

## ✅ Summary of Actions

| Player   | Pre-Flop          | Flop        | Turn               | River   |
|----------|-------------------|-------------|---------------------|---------|
| Player1  | Call, Fold        | —           | —                   | —       |
| Player2  | Re-raise, Call    | Check, Call | Bet, All-in         | Showdown |
| Player3  | Raise, Call       | Bet         | Raise, Call All-in  | Showdown |
| Player4  | Call, Fold        | —           | —                   | —       |
| Player5  | Fold              | —           | —                   | —       |
