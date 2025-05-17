import { GameState, Player, Card } from '../types/card';
import { DeckService } from './deckService';
import { HandEvaluatorService } from './handEvaluatorService';

export class GameService {
  private gameState: GameState;
  private deckService: DeckService;
  private handEvaluator: HandEvaluatorService;

  constructor() {
    this.deckService = new DeckService();
    this.handEvaluator = new HandEvaluatorService();
    this.gameState = this.initializeGameState();
  }

  private initializeGameState(): GameState {
    return {
      id: Math.random().toString(36).substring(7),
      players: [],
      communityCards: [],
      pot: 0,
      currentBet: 0,
      dealerPosition: 0,
      currentPlayerPosition: 0,
      phase: 'preflop',
      status: 'waiting',
      smallBlind: 5,
      bigBlind: 10
    } as GameState;
  }

  public startNewGame(players: Player[]): GameState {
    if (players.length < 2 || players.length > 9) {
      throw new Error('Game must have between 2 and 9 players');
    }

    this.gameState = this.initializeGameState();
    this.gameState.players = players.map((player, index) => ({
      ...player,
      position: index,
      hand: [],
      isActive: true,
      isDealer: index === 0,
      currentBet: 0
    }));

    this.deckService.reset();
    this.gameState.status = 'playing';
    this.dealInitialCards();
    this.collectBlinds();
    return this.gameState;
  }

  private dealInitialCards(): void {
    // Deal 2 cards to each player
    for (const player of this.gameState.players) {
      player.hand = this.deckService.dealCards(2);
    }
  }

  private collectBlinds(): void {
    const smallBlindPos = (this.gameState.dealerPosition + 1) % this.gameState.players.length;
    const bigBlindPos = (this.gameState.dealerPosition + 2) % this.gameState.players.length;

    const smallBlindPlayer = this.gameState.players[smallBlindPos];
    const bigBlindPlayer = this.gameState.players[bigBlindPos];

    smallBlindPlayer.chips -= this.gameState.smallBlind;
    smallBlindPlayer.currentBet = this.gameState.smallBlind;
    this.gameState.pot += this.gameState.smallBlind;

    bigBlindPlayer.chips -= this.gameState.bigBlind;
    bigBlindPlayer.currentBet = this.gameState.bigBlind;
    this.gameState.pot += this.gameState.bigBlind;

    this.gameState.currentBet = this.gameState.bigBlind;
  }

  public dealCommunityCards(): void {
    switch (this.gameState.phase) {
      case 'preflop':
        // Deal flop (3 cards)
        this.gameState.communityCards = this.deckService.dealCards(3);
        this.gameState.phase = 'flop';
        break;
      case 'flop':
        // Deal turn (1 card)
        this.gameState.communityCards.push(...this.deckService.dealCards(1));
        this.gameState.phase = 'turn';
        break;
      case 'turn':
        // Deal river (1 card)
        this.gameState.communityCards.push(...this.deckService.dealCards(1));
        this.gameState.phase = 'river';
        break;
      case 'river':
        this.gameState.phase = 'showdown';
        break;
    }
  }

  public placeBet(playerId: string, amount: number): void {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (amount > player.chips) {
      throw new Error('Insufficient chips');
    }

    if (amount < this.gameState.currentBet - player.currentBet) {
      throw new Error('Bet must be at least the current bet');
    }

    player.chips -= amount;
    player.currentBet += amount;
    this.gameState.pot += amount;
    this.gameState.currentBet = Math.max(this.gameState.currentBet, player.currentBet);
  }

  public getGameState(): GameState {
    // Return a deep copy to avoid mutation in tests
    return JSON.parse(JSON.stringify(this.gameState));
  }

  public fold(playerId: string): void {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }
    player.isActive = false;
    this.moveToNextPlayer();
  }

  public check(playerId: string): void {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }
    if (this.gameState.currentBet > player.currentBet) {
      throw new Error('Cannot check when there is a bet');
    }
    this.moveToNextPlayer();
  }

  private moveToNextPlayer(): void {
    let nextPosition = (this.gameState.currentPlayerPosition + 1) % this.gameState.players.length;
    while (!this.gameState.players[nextPosition].isActive) {
      nextPosition = (nextPosition + 1) % this.gameState.players.length;
    }
    this.gameState.currentPlayerPosition = nextPosition;

    // Check if round should end
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    const allPlayersActed = activePlayers.every(p => p.currentBet === this.gameState.currentBet);
    if (allPlayersActed) {
      this.endRound();
    }
  }

  private endRound(): void {
    // Reset current bet for next round
    this.gameState.currentBet = 0;
    this.gameState.players.forEach(p => p.currentBet = 0);

    // Move to next phase
    switch (this.gameState.phase) {
      case 'preflop':
        this.gameState.phase = 'flop';
        break;
      case 'flop':
        this.gameState.phase = 'turn';
        break;
      case 'turn':
        this.gameState.phase = 'river';
        break;
      case 'river':
        this.gameState.phase = 'showdown';
        this.distributePot();
        break;
    }
  }

  private distributePot(): void {
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    if (activePlayers.length === 1) {
      // Single winner
      activePlayers[0].chips += this.gameState.pot;
    } else {
      // Evaluate hands and find winners
      const playerHands = activePlayers.map(player => ({
        player,
        hand: this.handEvaluator.evaluateHand(player.hand, this.gameState.communityCards)
      }));

      // Sort by hand rank
      playerHands.sort((a, b) => b.hand.rank - a.hand.rank);

      // Find all players with the highest hand
      const highestRank = playerHands[0].hand.rank;
      const winners = playerHands.filter(ph => ph.hand.rank === highestRank);

      // Split pot among winners
      const splitAmount = Math.floor(this.gameState.pot / winners.length);
      winners.forEach(winner => {
        winner.player.chips += splitAmount;
      });
    }

    // Reset pot
    this.gameState.pot = 0;
  }
} 