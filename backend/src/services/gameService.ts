import { Card, GameState, Player } from '../types/card';
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
      deck: this.deckService.createDeck(),
      communityCards: [],
      pot: 0,
      currentPlayerId: '',
      currentPlayerPosition: 0,
      dealerPosition: 0,
      currentBet: 0,
      smallBlind: 5,
      bigBlind: 10,
      status: 'waiting',
      phase: 'pre-flop'
    };
  }

  public startGame(): void {
    if (this.gameState.players.length < 2) {
      throw new Error('Need at least 2 players to start the game');
    }

    this.gameState.status = 'playing';
    this.deckService.shuffleDeck(this.gameState.deck);

    // Deal cards to players
    this.gameState.players.forEach(player => {
      player.hand = this.deckService.dealCards(this.gameState.deck, 2);
      player.isActive = true;
      player.currentBet = 0;
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
    this.gameState.currentPlayerPosition = bigBlindPos;
  }

  public dealCommunityCards(): void {
    switch (this.gameState.phase) {
      case 'pre-flop':
        this.gameState.communityCards = this.deckService.dealCards(this.gameState.deck, 3);
        this.gameState.phase = 'flop';
        break;
      case 'flop':
        this.gameState.communityCards.push(...this.deckService.dealCards(this.gameState.deck, 1));
        this.gameState.phase = 'turn';
        break;
      case 'turn':
        this.gameState.communityCards.push(...this.deckService.dealCards(this.gameState.deck, 1));
        this.gameState.phase = 'river';
        break;
      case 'river':
        this.gameState.phase = 'showdown';
        this.determineWinner();
        break;
    }
  }

  public placeBet(playerId: string, amount: number): void {
    const player = this.getPlayer(playerId);
    if (!player || !player.isActive) {
      throw new Error('Invalid player or player is not active');
    }

    if (amount < this.gameState.currentBet - player.currentBet) {
      throw new Error('Bet amount is too low');
    }

    const betAmount = Math.min(amount, player.chips);
    player.chips -= betAmount;
    player.currentBet += betAmount;
    this.gameState.pot += betAmount;
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
      this.gameState.players.forEach(p => p.currentBet = 0);
      this.dealCommunityCards();
    }
  }

  private determineWinner(): void {
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    const playerHands = activePlayers.map(player => ({
      player,
      hand: this.handEvaluator.evaluateHand(player.hand, this.gameState.communityCards)
    }));

    // Sort by hand rank
    playerHands.sort((a, b) => b.hand.rank.localeCompare(a.hand.rank));

    // Award pot to winner(s)
    const winners = playerHands.filter(h => h.hand.rank === playerHands[0].hand.rank);
    const potPerWinner = Math.floor(this.gameState.pot / winners.length);

    winners.forEach(winner => {
      winner.player.chips += potPerWinner;
    });

    this.gameState.status = 'finished';
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

  public getGameState(): GameState {
    return { ...this.gameState };
  }
} 