import { Card, GameState, Player, Hand } from '../types/card';
import { DeckService } from './deckService';
import { HandEvaluatorService } from './handEvaluatorService';

export class GameService {
  private gameState: GameState;
  private deckService: DeckService;
  private handEvaluator: HandEvaluatorService;
  private deck: Card[];

  constructor() {
    this.deckService = new DeckService();
    this.handEvaluator = new HandEvaluatorService();
    this.deck = this.deckService.createDeck();
    this.gameState = {
      id: Math.random().toString(36).substring(7),
      players: [],
      communityCards: [],
      pot: 0,
      currentBet: 0,
      dealerPosition: 0,
      currentPlayerPosition: 0,
      currentPlayerId: '',
      phase: 'preflop',
      status: 'waiting',
      smallBlind: 5,
      bigBlind: 10
    };
  }

  public addPlayer(player: Player): void {
    if (this.gameState.players.length >= 9) {
      throw new Error('Table is full');
    }
    this.gameState.players.push(player);
  }

  public removePlayer(playerId: string): void {
    this.gameState.players = this.gameState.players.filter(p => p.id !== playerId);
  }

  public getPlayer(playerId: string): Player | undefined {
    return this.gameState.players.find(p => p.id === playerId);
  }

  public startGame(): void {
    if (this.gameState.players.length < 2) {
      throw new Error('Not enough players to start the game');
    }

    this.gameState.status = 'playing';
    this.deck = this.deckService.createDeck();
    this.deckService.shuffleDeck(this.deck);
    this.gameState.communityCards = [];
    this.gameState.pot = 0;
    this.gameState.currentBet = 0;

    // Deal cards to players
    this.gameState.players.forEach(player => {
      player.hand = this.deckService.dealCards(this.deck, 2);
      player.currentBet = 0;
      player.isActive = true;
    });

    // Post blinds
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
    this.gameState.currentPlayerId = this.gameState.players[bigBlindPos].id;
  }

  public dealCommunityCards(): void {
    if (this.gameState.phase === 'preflop') {
      this.gameState.communityCards = this.deckService.dealCards(this.deck, 3);
      this.gameState.phase = 'flop';
    } else if (this.gameState.phase === 'flop') {
      this.gameState.communityCards.push(...this.deckService.dealCards(this.deck, 1));
      this.gameState.phase = 'turn';
    } else if (this.gameState.phase === 'turn') {
      this.gameState.communityCards.push(...this.deckService.dealCards(this.deck, 1));
      this.gameState.phase = 'river';
    }
  }

  public placeBet(playerId: string, amount: number): void {
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (amount < this.gameState.currentBet - player.currentBet) {
      throw new Error('Bet amount is too small');
    }

    if (amount > player.chips) {
      throw new Error('Not enough chips');
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

    player.isActive = false;
    this.moveToNextPlayer();
  }

  public check(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (this.gameState.currentBet > player.currentBet) {
      throw new Error('Cannot check, must call or raise');
    }

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
      activePlayers.forEach(p => p.currentBet = 0);
      this.dealCommunityCards();
    }
  }

  public evaluateHands(): { playerId: string; hand: Hand }[] {
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    return activePlayers.map(player => ({
      playerId: player.id,
      hand: this.handEvaluator.evaluateHand(player.hand, this.gameState.communityCards)
    }));
  }

  public updatePlayerStatus(playerId: string, isAway: boolean): void {
    const player = this.getPlayer(playerId);
    if (player) {
      player.isAway = isAway;
    }
  }

  public getGameState(): GameState {
    return this.gameState;
  }
} 