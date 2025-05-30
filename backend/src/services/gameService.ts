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
  private playersActedThisRound: Set<string> = new Set();

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
    
    // Clear action tracking for new hand
    this.playersActedThisRound.clear();
    
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
    if (this.gameState.isHandComplete) {
      throw new Error('Cannot deal community cards: hand is complete');
    }

    if (this.gameState.phase === 'waiting') {
      throw new Error('Cannot deal community cards: game not started');
    }

    if (this.gameState.phase === 'showdown' || this.gameState.phase === 'finished') {
      throw new Error('Cannot deal community cards: game is in showdown or finished');
    }

    // Validate that betting round is actually complete
    if (!this.isBettingRoundComplete()) {
      throw new Error('Cannot advance phase: betting round is not complete');
    }

    this.completePhase();
  }

  private resetBettingRound(): void {
    this.gameState.currentBet = 0;
    this.gameState.players.forEach(player => {
      if (player.isActive) {
        player.currentBet = 0;
      }
    });
    
    // Clear action tracking for new betting round
    this.playersActedThisRound.clear();
    
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
    
    // Track that this player has acted
    this.playersActedThisRound.add(playerId);
    
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
    
    // Track that this player has acted
    this.playersActedThisRound.add(playerId);
    
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
    
    // Track that this player has acted
    this.playersActedThisRound.add(playerId);
    
    this.moveToNextPlayer();
  }

  private moveToNextPlayer(): void {
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    
    // Check if only one player remains
    if (activePlayers.length === 1) {
      this.gameState.winner = activePlayers[0].id;
      activePlayers[0].chips += this.gameState.pot;
      this.gameState.isHandComplete = true;
      this.gameState.phase = 'finished';
      return;
    }

    // Check if game is already finished or in showdown
    if (this.gameState.isHandComplete || this.gameState.phase === 'finished' || this.gameState.phase === 'showdown') {
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
    if (this.isBettingRoundComplete()) {
      this.completePhase();
    }
  }

  private isBettingRoundComplete(): boolean {
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    
    if (activePlayers.length <= 1) {
      return true; // Game over
    }

    // All active players must have acted and have equal bets
    const playersWhoCanAct = activePlayers.filter(p => p.chips > 0); // Players not all-in
    
    // If all remaining players are all-in, betting round is complete
    if (playersWhoCanAct.length <= 1) {
      return true;
    }

    // Check if all players who can act have matching bets
    const currentBet = this.gameState.currentBet;
    const allPlayersMatched = playersWhoCanAct.every(p => p.currentBet === currentBet);
    
    // Special handling for preflop in heads-up play
    if (this.gameState.phase === 'preflop' && activePlayers.length === 2) {
      // In heads-up preflop, if someone has acted and all bets are equal, round is complete
      const someoneActed = this.playersActedThisRound.size > 0;
      return allPlayersMatched && someoneActed;
    }
    
    // For all other cases, ALL active players must have acted in this betting round
    const allPlayersActed = activePlayers.every(p => this.playersActedThisRound.has(p.id));

    return allPlayersMatched && allPlayersActed;
  }

  private hasEveryPlayerActed(): boolean {
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    
    // Check if all active players have acted in this betting round
    return activePlayers.every(p => this.playersActedThisRound.has(p.id));
  }

  private completePhase(): void {
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
        this.gameState.phase = 'showdown';
        this.handleShowdown();
        break;
      default:
        throw new Error(`Invalid phase for completion: ${this.gameState.phase}`);
    }
  }

  private handleShowdown(): void {
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    
    if (activePlayers.length <= 1) {
      // Only one player left, they win automatically
      if (activePlayers.length === 1) {
        this.gameState.winner = activePlayers[0].id;
        activePlayers[0].chips += this.gameState.pot;
      }
      this.gameState.isHandComplete = true;
      this.gameState.phase = 'finished';
      return;
    }

    // Evaluate all hands and determine winner
    const handResults = this.evaluateHands();
    const bestResult = this.findBestHand(handResults);
    
    if (bestResult) {
      this.gameState.winner = bestResult.playerId;
      this.gameState.handEvaluation = bestResult.hand.name;
      
      // Award pot to winner
      const winner = this.getPlayer(bestResult.playerId);
      if (winner) {
        winner.chips += this.gameState.pot;
      }
    }
    
    this.gameState.isHandComplete = true;
    
    // Auto-start next hand after brief delay (in a real game)
    // For testing, we'll just mark as finished
    this.gameState.phase = 'finished';
  }

  private findBestHand(handResults: { playerId: string; hand: Hand }[]): { playerId: string; hand: Hand } | null {
    if (handResults.length === 0) return null;
    
    return handResults.reduce((best, current) => {
      if (!best || current.hand.rank > best.hand.rank) {
        return current;
      }
      return best;
    });
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

    // Track that this player has acted
    this.playersActedThisRound.add(playerId);

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

    // Track that this player has acted
    this.playersActedThisRound.add(playerId);

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

  // Enhanced method to start a new hand
  public startNewHand(): void {
    if (!this.gameState.isHandComplete) {
      throw new Error('Cannot start new hand: current hand is not complete');
    }

    const activePlayers = this.gameState.players.filter(p => p.chips > 0);
    if (activePlayers.length < 2) {
      throw new Error('Not enough players with chips to start new hand');
    }

    // Reset for new hand
    this.gameState.isHandComplete = false;
    this.gameState.winner = undefined;
    this.gameState.handEvaluation = undefined;
    this.gameState.pot = 0;
    this.gameState.currentBet = 0;
    this.gameState.communityCards = [];
    this.gameState.phase = 'preflop';
    
    // Clear action tracking for new hand
    this.playersActedThisRound.clear();
    
    // Reset player states
    this.gameState.players.forEach(player => {
      player.cards = [];
      player.currentBet = 0;
      player.isActive = player.chips > 0; // Only players with chips are active
    });

    // Move dealer button
    this.updatePositionsWithSeatManager();

    // Shuffle and deal new cards
    this.deckService.reset(this.deck);
    this.deckService.shuffle(this.deck);
    activePlayers.forEach(player => {
      player.cards = this.deckService.dealCards(2, this.deck);
    });

    // Post blinds for new hand
    this.postBlinds();
  }

  // Method to get detailed phase information
  public getPhaseInfo(): {
    phase: string;
    description: string;
    communityCardCount: number;
    canBet: boolean;
    canDeal: boolean;
  } {
    const phase = this.gameState.phase;
    
    switch (phase) {
      case 'waiting':
        return {
          phase,
          description: 'Waiting for players to join',
          communityCardCount: 0,
          canBet: false,
          canDeal: false
        };
      case 'preflop':
        return {
          phase,
          description: 'Pre-flop betting round',
          communityCardCount: 0,
          canBet: true,
          canDeal: this.isBettingRoundComplete()
        };
      case 'flop':
        return {
          phase,
          description: 'Flop betting round (3 community cards)',
          communityCardCount: 3,
          canBet: true,
          canDeal: this.isBettingRoundComplete()
        };
      case 'turn':
        return {
          phase,
          description: 'Turn betting round (4 community cards)',
          communityCardCount: 4,
          canBet: true,
          canDeal: this.isBettingRoundComplete()
        };
      case 'river':
        return {
          phase,
          description: 'River betting round (5 community cards)',
          communityCardCount: 5,
          canBet: true,
          canDeal: this.isBettingRoundComplete()
        };
      case 'showdown':
        return {
          phase,
          description: 'Showdown - revealing cards',
          communityCardCount: 5,
          canBet: false,
          canDeal: false
        };
      case 'finished':
        return {
          phase,
          description: 'Hand complete',
          communityCardCount: 5,
          canBet: false,
          canDeal: false
        };
      default:
        return {
          phase,
          description: 'Unknown phase',
          communityCardCount: 0,
          canBet: false,
          canDeal: false
        };
    }
  }
} 