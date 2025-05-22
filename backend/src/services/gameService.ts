import { GameState, Player, Card, Hand } from '../types/shared';
import { DeckService } from './deckService';
import { HandEvaluator } from './handEvaluator';

export class GameService {
  private gameState: GameState;
  private deckService: DeckService;
  private handEvaluator: HandEvaluator;

  constructor() {
    this.deckService = new DeckService();
    this.handEvaluator = new HandEvaluator();
    this.gameState = this.initializeGameState();
  }

  private initializeGameState(): GameState {
    return {
      id: Math.random().toString(36).substring(7),
      players: [],
      communityCards: [],
      pot: 0,
      currentPlayerId: null,
      currentPlayerPosition: 0,
      dealerPosition: 0,
      phase: 'waiting',
      status: 'waiting',
      currentBet: 0,
      minBet: 0,
      smallBlind: 5,
      bigBlind: 10
    };
  }

  public startGame(): void {
    if (this.gameState.players.length < 2) {
      throw new Error('Not enough players to start the game');
    }

    this.gameState.status = 'playing';
    this.gameState.phase = 'preflop';
    this.deckService.shuffle();

    // Deal cards to players
    this.gameState.players.forEach(player => {
      player.cards = this.deckService.dealCards(2);
      player.isActive = true;
    });

    // Set blinds
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
    this.gameState.minBet = this.gameState.bigBlind;
  }

  public dealCommunityCards(): void {
    switch (this.gameState.phase) {
      case 'preflop':
        this.gameState.communityCards = this.deckService.dealCards(3);
        this.gameState.phase = 'flop';
        break;
      case 'flop':
        this.gameState.communityCards.push(...this.deckService.dealCards(1));
        this.gameState.phase = 'turn';
        break;
      case 'turn':
        this.gameState.communityCards.push(...this.deckService.dealCards(1));
        this.gameState.phase = 'river';
        break;
      case 'river':
        this.gameState.phase = 'showdown';
        break;
    }
  }

  public placeBet(playerId: string, amount: number): void {
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (amount < this.gameState.currentBet - player.currentBet) {
      throw new Error('Bet amount is too low');
    }

    player.chips -= amount;
    player.currentBet += amount;
    this.gameState.pot += amount;
    this.gameState.currentBet = Math.max(this.gameState.currentBet, player.currentBet);
  }

  public fold(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
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
    const allPlayersActed = activePlayers.every(p => p.currentBet === this.gameState.currentBet);

    if (allPlayersActed) {
      this.gameState.currentBet = 0;
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
} 