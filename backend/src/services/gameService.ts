import { GameState, Player, Card, Hand } from '../types/shared';
import { DeckService } from './deckService';
import { HandEvaluator } from './handEvaluator';

export class GameService {
  private gameState: GameState;
  private deckService: DeckService;
  private handEvaluator: HandEvaluator;
  private deck: Card[];
  private readonly MAX_PLAYERS = 9;

  constructor() {
    this.deckService = new DeckService();
    this.handEvaluator = new HandEvaluator();
    this.deck = [];
    this.gameState = this.initializeGameState();
  }

  private initializeGameState(): GameState {
    this.deckService.reset(this.deck);
    return {
      id: Math.random().toString(36).substring(7),
      players: [],
      communityCards: [],
      pot: 0,
      currentPlayerId: null,
      currentPlayerPosition: 0,
      dealerPosition: 0,
      smallBlindPosition: 1,
      bigBlindPosition: 2,
      phase: 'waiting',
      status: 'waiting',
      currentBet: 0,
      minBet: 0,
      smallBlind: 5,
      bigBlind: 10,
      handEvaluation: undefined,
      winner: undefined,
      isHandComplete: false
    };
  }

  public startGame(): void {
    if (this.gameState.players.length < 2) {
      throw new Error('Not enough players to start the game');
    }

    // Reset game state for new hand
    this.gameState.status = 'playing';
    this.gameState.phase = 'preflop';
    this.gameState.isHandComplete = false;
    this.gameState.winner = undefined;
    this.gameState.handEvaluation = undefined;
    this.gameState.pot = 0;
    this.gameState.currentBet = 0;
    this.gameState.communityCards = [];
    
    // Reset player states
    this.gameState.players.forEach(player => {
      player.cards = [];
      player.currentBet = 0;
      player.isActive = true;
    });

    // Shuffle and deal
    this.deckService.shuffle(this.deck);
    this.gameState.players.forEach(player => {
      player.cards = this.deckService.dealCards(2, this.deck);
    });

    // Update positions
    this.updatePositions();

    // Post blinds
    this.postBlinds();
  }

  private updatePositions(): void {
    const numPlayers = this.gameState.players.length;
    // Move dealer button
    this.gameState.dealerPosition = (this.gameState.dealerPosition + 1) % numPlayers;
    // Set blind positions
    this.gameState.smallBlindPosition = (this.gameState.dealerPosition + 1) % numPlayers;
    this.gameState.bigBlindPosition = (this.gameState.dealerPosition + 2) % numPlayers;
    // Set first player (after big blind)
    this.gameState.currentPlayerPosition = (this.gameState.bigBlindPosition + 1) % numPlayers;
    this.gameState.currentPlayerId = this.gameState.players[this.gameState.currentPlayerPosition].id;
  }

  private postBlinds(): void {
    const smallBlindPlayer = this.gameState.players[this.gameState.smallBlindPosition];
    const bigBlindPlayer = this.gameState.players[this.gameState.bigBlindPosition];

    // Post small blind
    smallBlindPlayer.chips -= this.gameState.smallBlind;
    smallBlindPlayer.currentBet = this.gameState.smallBlind;
    this.gameState.pot += this.gameState.smallBlind;

    // Post big blind
    bigBlindPlayer.chips -= this.gameState.bigBlind;
    bigBlindPlayer.currentBet = this.gameState.bigBlind;
    this.gameState.pot += this.gameState.bigBlind;

    this.gameState.currentBet = this.gameState.bigBlind;
    this.gameState.minBet = this.gameState.bigBlind;
  }

  public dealCommunityCards(): void {
    switch (this.gameState.phase) {
      case 'preflop':
        this.gameState.communityCards = this.deckService.dealCards(3, this.deck);
        this.gameState.phase = 'flop';
        this.resetBettingRound();
        break;
      case 'flop':
        this.gameState.communityCards.push(...this.deckService.dealCards(1, this.deck));
        this.gameState.phase = 'turn';
        this.resetBettingRound();
        break;
      case 'turn':
        this.gameState.communityCards.push(...this.deckService.dealCards(1, this.deck));
        this.gameState.phase = 'river';
        this.resetBettingRound();
        break;
      case 'river':
        this.determineWinner();
        this.gameState.phase = 'showdown';
        this.gameState.isHandComplete = true;
        break;
    }
  }

  private resetBettingRound(): void {
    this.gameState.currentBet = 0;
    this.gameState.players.forEach(player => {
      if (player.isActive) {
        player.currentBet = 0;
      }
    });
    // First to act is after dealer in post-flop
    this.gameState.currentPlayerPosition = (this.gameState.dealerPosition + 1) % this.gameState.players.length;
    this.gameState.currentPlayerId = this.gameState.players[this.gameState.currentPlayerPosition].id;
  }

  private determineWinner(): void {
    const handResults = this.evaluateHands();
    const bestHand = handResults.reduce((best, current) => {
      if (!best || current.hand.rank > best.hand.rank) {
        return current;
      }
      return best;
    });

    if (bestHand) {
      this.gameState.winner = bestHand.playerId;
      this.gameState.handEvaluation = bestHand.hand.name;
      // Award pot to winner
      const winner = this.getPlayer(bestHand.playerId);
      if (winner) {
        winner.chips += this.gameState.pot;
      }
    }
  }

  public placeBet(playerId: string, amount: number): void {
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (!player.isActive) {
      throw new Error('Player is not active in the game');
    }

    if (player.id !== this.gameState.currentPlayerId) {
      throw new Error('Not player\'s turn');
    }

    if (amount > player.chips) {
      throw new Error('Insufficient chips');
    }

    const minCallAmount = this.gameState.currentBet - player.currentBet;
    if (amount < minCallAmount) {
      throw new Error(`Must call or raise. Minimum call amount: ${minCallAmount}`);
    }

    // Check if this is a raise
    if (amount > minCallAmount) {
      const raiseAmount = amount - minCallAmount;
      if (raiseAmount < this.gameState.minBet) {
        throw new Error(`Minimum raise amount is ${this.gameState.minBet}`);
      }
    }

    player.chips -= amount;
    player.currentBet += amount;
    this.gameState.pot += amount;
    this.gameState.currentBet = Math.max(this.gameState.currentBet, player.currentBet);
    this.moveToNextPlayer();
  }

  public fold(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (!player.isActive) {
      throw new Error('Player is already folded or not in the game');
    }

    if (player.id !== this.gameState.currentPlayerId) {
      throw new Error('Not player\'s turn');
    }

    player.isActive = false;
    this.moveToNextPlayer();
  }

  private moveToNextPlayer(): void {
    let nextPosition = (this.gameState.currentPlayerPosition + 1) % this.gameState.players.length;
    while (!this.gameState.players[nextPosition].isActive) {
      nextPosition = (nextPosition + 1) % this.gameState.players.length;
    }

    this.gameState.currentPlayerPosition = nextPosition;
    this.gameState.currentPlayerId = this.gameState.players[nextPosition].id;

    const activePlayers = this.gameState.players.filter(p => p.isActive);
    
    // Check if only one player remains
    if (activePlayers.length === 1) {
      this.gameState.winner = activePlayers[0].id;
      activePlayers[0].chips += this.gameState.pot;
      this.gameState.isHandComplete = true;
      return;
    }

    // Check if betting round is complete
    const allPlayersActed = activePlayers.every(p => p.currentBet === this.gameState.currentBet);
    if (allPlayersActed) {
      this.dealCommunityCards();
    }
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getPlayer(playerId: string): Player | undefined {
    return this.gameState.players.find(p => p.id === playerId);
  }

  public addPlayer(player: Player): void {
    if (this.gameState.players.length >= this.MAX_PLAYERS) {
      throw new Error('Table is full');
    }
    this.gameState.players.push(player);
  }

  public removePlayer(playerId: string): void {
    this.gameState.players = this.gameState.players.filter(p => p.id !== playerId);
  }

  public updatePlayerStatus(playerId: string, isAway: boolean): void {
    const player = this.getPlayer(playerId);
    if (player) {
      player.isAway = isAway;
    }
  }

  public evaluateHands(): { playerId: string; hand: Hand }[] {
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    return activePlayers.map(player => ({
      playerId: player.id,
      hand: this.handEvaluator.evaluateHand(player.cards, this.gameState.communityCards)
    }));
  }

  public check(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (!player.isActive) {
      throw new Error('Player is not active in the game');
    }

    if (player.id !== this.gameState.currentPlayerId) {
      throw new Error('Not player\'s turn');
    }

    if (this.gameState.currentBet > player.currentBet) {
      throw new Error('Cannot check, must call or raise');
    }

    this.moveToNextPlayer();
  }

  public call(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (!player.isActive) {
      throw new Error('Player is not active in the game');
    }

    if (player.id !== this.gameState.currentPlayerId) {
      throw new Error('Not player\'s turn');
    }

    const callAmount = this.gameState.currentBet - player.currentBet;
    if (callAmount > player.chips) {
      throw new Error('Insufficient chips to call');
    }

    if (callAmount === 0) {
      throw new Error('No amount to call, use check instead');
    }

    player.chips -= callAmount;
    player.currentBet += callAmount;
    this.gameState.pot += callAmount;
    this.moveToNextPlayer();
  }

  public setGameId(gameId: string): void {
    this.gameState.id = gameId;
  }
} 