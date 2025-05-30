import { GameState, Player, Card, Hand } from '../types/shared';
import { DeckService } from './deckService';
import { HandEvaluator } from './handEvaluator';
import { SeatManager } from './seatManager';

export class GameService {
  private gameState: GameState;
  private deckService: DeckService;
  private handEvaluator: HandEvaluator;
  private seatManager: SeatManager;
  private deck: Card[];
  private readonly MAX_PLAYERS = 9;

  constructor() {
    this.deckService = new DeckService();
    this.handEvaluator = new HandEvaluator();
    this.seatManager = new SeatManager(this.MAX_PLAYERS);
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
    
    // Reset player states and ensure all seated players are active
    this.gameState.players.forEach(player => {
      player.cards = [];
      player.currentBet = 0;
      // Only activate players who are actually seated
      player.isActive = this.seatManager.isPlayerSeated(player.id);
    });

    // Verify we have enough active players
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    if (activePlayers.length < 2) {
      throw new Error('Not enough active players to start the game');
    }

    // Update positions using seat manager
    this.updatePositionsWithSeatManager();

    // Shuffle and deal cards only to active players
    this.deckService.shuffle(this.deck);
    activePlayers.forEach(player => {
      player.cards = this.deckService.dealCards(2, this.deck);
    });

    // Post blinds
    this.postBlinds();
  }

  private updatePositionsWithSeatManager(): void {
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    
    if (activePlayers.length === 0) {
      throw new Error('No active players');
    }

    // Move dealer using seat manager
    const dealerMove = this.seatManager.moveDealer(activePlayers);
    this.gameState.dealerPosition = dealerMove.newDealerPosition;

    // Get blind positions
    const blindPositions = this.seatManager.getBlindPositions(activePlayers);
    this.gameState.smallBlindPosition = blindPositions.smallBlind;
    this.gameState.bigBlindPosition = blindPositions.bigBlind;

    // Set first player to act (left of big blind in preflop)
    const firstToAct = this.seatManager.getFirstToAct(activePlayers, true);
    if (firstToAct) {
      this.gameState.currentPlayerId = firstToAct;
      const currentPlayerIndex = activePlayers.findIndex(p => p.id === firstToAct);
      this.gameState.currentPlayerPosition = currentPlayerIndex;
    }
  }

  private postBlinds(): void {
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    
    if (activePlayers.length < 2) {
      throw new Error('Not enough players for blinds');
    }

    const smallBlindPlayer = activePlayers[this.gameState.smallBlindPosition];
    const bigBlindPlayer = activePlayers[this.gameState.bigBlindPosition];

    if (!smallBlindPlayer || !bigBlindPlayer) {
      throw new Error('Could not identify blind players');
    }

    // Post small blind
    const smallBlindAmount = Math.min(this.gameState.smallBlind, smallBlindPlayer.chips);
    smallBlindPlayer.chips -= smallBlindAmount;
    smallBlindPlayer.currentBet = smallBlindAmount;
    this.gameState.pot += smallBlindAmount;

    // Post big blind
    const bigBlindAmount = Math.min(this.gameState.bigBlind, bigBlindPlayer.chips);
    bigBlindPlayer.chips -= bigBlindAmount;
    bigBlindPlayer.currentBet = bigBlindAmount;
    this.gameState.pot += bigBlindAmount;

    this.gameState.currentBet = bigBlindAmount;
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
    
    // First to act in post-flop is left of dealer
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    const firstToAct = this.seatManager.getFirstToAct(activePlayers, false);
    
    if (firstToAct) {
      this.gameState.currentPlayerId = firstToAct;
      const currentPlayerIndex = activePlayers.findIndex(p => p.id === firstToAct);
      this.gameState.currentPlayerPosition = currentPlayerIndex;
    }
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

    if (amount <= 0) {
      throw new Error('Bet amount must be positive');
    }

    if (amount > player.chips) {
      throw new Error('Insufficient chips');
    }

    const currentPlayerBet = player.currentBet;
    const minCallAmount = this.gameState.currentBet - currentPlayerBet;
    
    if (amount < minCallAmount) {
      throw new Error(`Must call or raise. Minimum call amount: ${minCallAmount}`);
    }

    // Check if this is a raise
    if (amount > minCallAmount) {
      const raiseAmount = amount - minCallAmount;
      if (raiseAmount < this.gameState.minBet) {
        throw new Error(`Minimum raise amount is ${this.gameState.minBet}. Total bet must be at least ${minCallAmount + this.gameState.minBet}`);
      }
    }

    // Apply the bet
    player.chips -= amount;
    player.currentBet += amount;
    this.gameState.pot += amount;
    this.gameState.currentBet = Math.max(this.gameState.currentBet, player.currentBet);
    
    this.moveToNextPlayer();
  }

  public raise(playerId: string, totalAmount: number): void {
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

    const currentPlayerBet = player.currentBet;
    const minCallAmount = this.gameState.currentBet - currentPlayerBet;
    const totalBetAmount = totalAmount;
    
    if (totalBetAmount <= this.gameState.currentBet) {
      throw new Error(`Must raise above current bet of ${this.gameState.currentBet}`);
    }

    const actualRaiseAmount = totalBetAmount - this.gameState.currentBet;
    if (actualRaiseAmount < this.gameState.minBet) {
      throw new Error(`Minimum raise is ${this.gameState.minBet}. Total bet must be at least ${this.gameState.currentBet + this.gameState.minBet}`);
    }

    const betAmount = totalBetAmount - currentPlayerBet;
    if (betAmount > player.chips) {
      throw new Error('Insufficient chips for this raise');
    }

    // Apply the raise
    player.chips -= betAmount;
    player.currentBet = totalBetAmount;
    this.gameState.pot += betAmount;
    this.gameState.currentBet = totalBetAmount;
    
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
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    
    // Check if only one player remains
    if (activePlayers.length === 1) {
      this.gameState.winner = activePlayers[0].id;
      activePlayers[0].chips += this.gameState.pot;
      this.gameState.isHandComplete = true;
      return;
    }

    // Get next player using seat manager
    const nextPlayerId = this.seatManager.getNextPlayer(this.gameState.currentPlayerId!, activePlayers);
    
    if (!nextPlayerId) {
      throw new Error('Could not determine next player');
    }

    this.gameState.currentPlayerId = nextPlayerId;
    const nextPlayerIndex = activePlayers.findIndex(p => p.id === nextPlayerId);
    this.gameState.currentPlayerPosition = nextPlayerIndex;

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
      throw new Error('Maximum number of players reached');
    }

    // If player has a seat number, try to assign that specific seat
    if (player.seatNumber) {
      const result = this.seatManager.assignSeat(player.id, player.seatNumber);
      if (!result.success) {
        throw new Error(result.error || 'Failed to assign seat');
      }
    } else {
      // Assign first available seat
      const result = this.seatManager.assignSeat(player.id);
      if (!result.success) {
        throw new Error(result.error || 'No available seats');
      }
      // Update player's seat number
      player.seatNumber = result.seatNumber!;
    }

    this.gameState.players.push(player);
  }

  public removePlayer(playerId: string): void {
    // Remove from seat manager
    this.seatManager.leaveSeat(playerId);
    
    // Remove from players array
    this.gameState.players = this.gameState.players.filter(p => p.id !== playerId);
  }

  public updatePlayerStatus(playerId: string, isAway: boolean): void {
    const player = this.getPlayer(playerId);
    if (player) {
      player.isAway = isAway;
      // If player comes back, reactivate them if game is not in progress
      if (!isAway && this.gameState.phase === 'waiting') {
        player.isActive = true;
      }
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

    const amountToCall = this.gameState.currentBet - player.currentBet;
    if (amountToCall > 0) {
      throw new Error(`Cannot check, must call ${amountToCall} or raise`);
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
    
    if (callAmount <= 0) {
      throw new Error('No amount to call, use check instead');
    }

    if (callAmount > player.chips) {
      // All-in scenario
      const allInAmount = player.chips;
      player.currentBet += allInAmount;
      this.gameState.pot += allInAmount;
      player.chips = 0;
      // Note: In a full implementation, we'd handle side pots here
    } else {
      // Normal call
      player.chips -= callAmount;
      player.currentBet += callAmount;
      this.gameState.pot += callAmount;
    }

    this.moveToNextPlayer();
  }

  public setGameId(gameId: string): void {
    this.gameState.id = gameId;
  }

  // Seat management access methods
  public getSeatManager(): SeatManager {
    return this.seatManager;
  }

  public getSeatInfo(seatNumber: number) {
    return this.seatManager.getSeatInfo(seatNumber);
  }

  public getAllSeats() {
    return this.seatManager.getAllSeats();
  }
} 