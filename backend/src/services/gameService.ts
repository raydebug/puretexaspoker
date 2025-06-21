import { GameState, Player, Card, Hand, ShowdownResult, SidePot, BlindSchedule } from '../types/shared';
import { DeckService } from './deckService';
import { HandEvaluator, DetailedHand } from './handEvaluator';
import { SeatManager } from './seatManager';
import { SidePotManager, PotDistribution } from './sidePotManager';
import { CardOrderService } from './cardOrderService';
import { EnhancedBlindManager } from './enhancedBlindManager';

export class GameService {
  private gameState: GameState;
  private deckService: DeckService;
  private handEvaluator: HandEvaluator;
  private seatManager: SeatManager;
  private sidePotManager: SidePotManager;
  private cardOrderService: CardOrderService;
  private enhancedBlindManager: EnhancedBlindManager;
  private deck: Card[];
  private readonly MAX_PLAYERS = 9;
  private playersActedThisRound: Set<string> = new Set();
  private gameId: string;
  private cardOrderHash?: string;
  
  // ENHANCED AUTOMATION: Callback for automatic phase transitions
  private phaseTransitionCallback?: (gameId: string, fromPhase: string, toPhase: string, gameState: GameState) => void;

  constructor(gameId: string) {
    this.gameId = gameId;
    this.deckService = new DeckService();
    this.handEvaluator = new HandEvaluator();
    this.seatManager = new SeatManager(this.MAX_PLAYERS);
    this.sidePotManager = new SidePotManager();
    this.cardOrderService = new CardOrderService();
    this.deck = [];
    this.gameState = this.initializeGameState();
    
    // ENHANCED BLIND SYSTEM: Initialize enhanced blind manager
    this.enhancedBlindManager = new EnhancedBlindManager(this.gameState);
  }

  // ENHANCED AUTOMATION: Set callback for automatic phase transitions
  public setPhaseTransitionCallback(callback: (gameId: string, fromPhase: string, toPhase: string, gameState: GameState) => void): void {
    this.phaseTransitionCallback = callback;
  }

  private initializeGameState(): GameState {
    this.deckService.reset(this.deck);
    return {
      id: this.gameId,
      players: [],
      communityCards: [],
      burnedCards: [],
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
    this.gameState.burnedCards = [];
    
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

    // Generate pre-determined card order with hash for transparency
    const cardOrderData = this.cardOrderService.generateCardOrder(this.gameId);
    this.cardOrderHash = cardOrderData.hash;
    
    // Use the pre-determined deck order
    this.deck = [...cardOrderData.cardOrder];
    
    // Deal cards to active players from pre-determined order
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

    // ENHANCED BLIND SYSTEM: Check for blind level increases (tournaments)
    if (this.enhancedBlindManager.checkBlindLevelIncrease()) {
      console.log(`⬆️ BLIND SYSTEM: Blinds increased to ${this.gameState.smallBlind}/${this.gameState.bigBlind}`);
    }

    // ENHANCED BLIND SYSTEM: Check if break has ended
    if (this.enhancedBlindManager.checkBreakEnd()) {
      console.log(`🎮 BLIND SYSTEM: Tournament break ended, blinds increased`);
    }

    // ENHANCED BLIND SYSTEM: Increment hand number for statistics
    this.enhancedBlindManager.incrementHandNumber();

    // ENHANCED BLIND SYSTEM: Post antes first if applicable
    this.enhancedBlindManager.postAntes();

    // ENHANCED BLIND SYSTEM: Handle dead blinds for players with pending obligations
    this.gameState.players.forEach(player => {
      if (player.isActive && this.gameState.deadBlinds?.some(db => db.playerId === player.id)) {
        this.enhancedBlindManager.postDeadBlinds(player.id);
      }
    });

    const smallBlindPlayer = activePlayers[this.gameState.smallBlindPosition];
    const bigBlindPlayer = activePlayers[this.gameState.bigBlindPosition];

    if (!smallBlindPlayer || !bigBlindPlayer) {
      throw new Error('Could not identify blind players');
    }

    console.log(`💰 BLIND SYSTEM: Posting blinds - SB: ${smallBlindPlayer.name} (${this.gameState.smallBlind}), BB: ${bigBlindPlayer.name} (${this.gameState.bigBlind})`);

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

    console.log(`✅ BLIND SYSTEM: Blinds posted successfully, pot: ${this.gameState.pot}`);
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

    const currentPlayerBet = player.currentBet;
    const minCallAmount = this.gameState.currentBet - currentPlayerBet;
    
    // Enhanced All-In Logic: Allow all-in even if insufficient chips
    if (amount > player.chips) {
      // All-in scenario: player bets all remaining chips
      const allInAmount = player.chips;
      
      if (allInAmount < minCallAmount) {
        // All-in with less than call amount - only allowed if all chips are being bet
        if (allInAmount !== player.chips) {
          throw new Error(`Must call ${minCallAmount} or go all-in with ${player.chips}`);
        }
        // All-in with less than call is allowed - creates side pot
        console.log(`🎰 Player ${player.name} going all-in for ${allInAmount} (less than call of ${minCallAmount})`);
      } else if (allInAmount < minCallAmount + this.gameState.minBet && allInAmount > minCallAmount) {
        // All-in with more than call but less than minimum raise - allowed as all-in
        console.log(`🎰 Player ${player.name} going all-in for ${allInAmount} (less than full raise)`);
      }
      
      // Apply all-in bet
      player.chips = 0;
      player.currentBet += allInAmount;
      this.gameState.pot += allInAmount;
      this.gameState.currentBet = Math.max(this.gameState.currentBet, player.currentBet);
    } else {
      // Normal betting with sufficient chips
      if (amount < minCallAmount) {
        throw new Error(`Must call or raise. Minimum call amount: ${minCallAmount}`);
      }

      // Check if this is a raise (and validate minimum raise)
      if (amount > minCallAmount) {
        const raiseAmount = amount - minCallAmount;
        if (raiseAmount < this.gameState.minBet) {
          throw new Error(`Minimum raise amount is ${this.gameState.minBet}. Total bet must be at least ${minCallAmount + this.gameState.minBet}`);
        }
      }

      // Apply the normal bet
      player.chips -= amount;
      player.currentBet += amount;
      this.gameState.pot += amount;
      this.gameState.currentBet = Math.max(this.gameState.currentBet, player.currentBet);
    }
    
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
    const betAmount = totalAmount - currentPlayerBet;
    
    // Enhanced All-In Raise Logic
    if (betAmount > player.chips) {
      // All-in scenario: player raises with all remaining chips
      const allInAmount = player.chips;
      const newTotalBet = currentPlayerBet + allInAmount;
      
      if (newTotalBet <= this.gameState.currentBet) {
        throw new Error(`All-in amount of ${allInAmount} would not raise above current bet of ${this.gameState.currentBet}`);
      }
      
      // Check if all-in raise meets minimum raise requirement
      const actualRaise = newTotalBet - this.gameState.currentBet;
      if (actualRaise < this.gameState.minBet && allInAmount !== player.chips) {
        throw new Error(`Minimum raise is ${this.gameState.minBet}. All-in raise of ${actualRaise} is insufficient`);
      }
      
      // All-in raise is allowed even if less than minimum raise
      console.log(`🎰 Player ${player.name} going all-in with raise to ${newTotalBet} (${actualRaise} raise)`);
      
      // Apply all-in raise
      player.chips = 0;
      player.currentBet = newTotalBet;
      this.gameState.pot += allInAmount;
      this.gameState.currentBet = newTotalBet;
    } else {
      // Normal raise with sufficient chips
      if (totalAmount <= this.gameState.currentBet) {
        throw new Error(`Must raise above current bet of ${this.gameState.currentBet}`);
      }

      const actualRaiseAmount = totalAmount - this.gameState.currentBet;
      if (actualRaiseAmount < this.gameState.minBet) {
        throw new Error(`Minimum raise is ${this.gameState.minBet}. Total bet must be at least ${this.gameState.currentBet + this.gameState.minBet}`);
      }

      // Apply the normal raise
      player.chips -= betAmount;
      player.currentBet = totalAmount;
      this.gameState.pot += betAmount;
      this.gameState.currentBet = totalAmount;
    }
    
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
    const playersWhoCanAct = activePlayers.filter(p => p.chips > 0); // Players not all-in
    const allInPlayers = activePlayers.filter(p => p.chips === 0);
    const currentBet = this.gameState.currentBet;
    
    console.log(`🔍 BETTING ROUND COMPLETION CHECK:`);
    console.log(`   Phase: ${this.gameState.phase}`);
    console.log(`   Active Players: ${activePlayers.length}`);
    console.log(`   Players Who Can Act: ${playersWhoCanAct.length}`);
    console.log(`   All-In Players: ${allInPlayers.length}`);
    console.log(`   Current Bet: ${currentBet}`);
    console.log(`   Players Acted This Round: ${this.playersActedThisRound.size}`);
    
    // ENHANCED: Game over if only one player remains
    if (activePlayers.length <= 1) {
      console.log(`✅ BETTING COMPLETE: Only ${activePlayers.length} active player(s) remaining`);
      return true;
    }

    // ENHANCED: All remaining players are all-in except maybe one
    if (playersWhoCanAct.length <= 1) {
      console.log(`✅ BETTING COMPLETE: All remaining players all-in (${playersWhoCanAct.length} can act)`);
      return true;
    }

    // Check if all players who can act have matching bets
    const allPlayersMatched = playersWhoCanAct.every(p => p.currentBet === currentBet);
    console.log(`   All Bets Matched: ${allPlayersMatched}`);
    
    if (!allPlayersMatched) {
      console.log(`❌ BETTING INCOMPLETE: Not all bets matched`);
      playersWhoCanAct.forEach(p => {
        console.log(`     ${p.name}: ${p.currentBet} (need: ${currentBet})`);
      });
      return false;
    }

    // ENHANCED: Special handling for preflop in heads-up play
    if (this.gameState.phase === 'preflop' && activePlayers.length === 2) {
      const someoneActed = this.playersActedThisRound.size > 0;
      console.log(`   Heads-Up Preflop: ${someoneActed ? 'Someone acted' : 'No one acted'}`);
      const isComplete = allPlayersMatched && someoneActed;
      console.log(`${isComplete ? '✅' : '❌'} BETTING ${isComplete ? 'COMPLETE' : 'INCOMPLETE'}: Heads-up preflop logic`);
      return isComplete;
    }
    
    // ENHANCED: For all other cases, ALL active players must have acted in this betting round
    const allPlayersActed = activePlayers.every(p => this.playersActedThisRound.has(p.id));
    console.log(`   All Players Acted: ${allPlayersActed}`);
    
    if (!allPlayersActed) {
      console.log(`❌ BETTING INCOMPLETE: Not all players have acted`);
      activePlayers.forEach(p => {
        const hasActed = this.playersActedThisRound.has(p.id);
        console.log(`     ${p.name}: ${hasActed ? 'ACTED' : 'NOT ACTED'}`);
      });
      return false;
    }

    const isComplete = allPlayersMatched && allPlayersActed;
    console.log(`${isComplete ? '✅' : '❌'} BETTING ${isComplete ? 'COMPLETE' : 'INCOMPLETE'}: General logic`);
    return isComplete;
  }

  private hasEveryPlayerActed(): boolean {
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    
    // Check if all active players have acted in this betting round
    return activePlayers.every(p => this.playersActedThisRound.has(p.id));
  }

  private completePhase(): void {
    const fromPhase = this.gameState.phase;
    console.log(`🔄 AUTOMATED PHASE TRANSITION: Starting transition from ${fromPhase}`);
    
    switch (this.gameState.phase) {
      case 'preflop':
        // Burn one card before dealing the flop
        this.gameState.burnedCards = this.gameState.burnedCards || [];
        const burnedFlop = this.deckService.dealCards(1, this.deck);
        if (burnedFlop) this.gameState.burnedCards.push(...burnedFlop);
        const flopCards = this.deckService.dealCards(3, this.deck);
        if (flopCards) this.gameState.communityCards = flopCards;
        this.gameState.phase = 'flop';
        this.resetBettingRound();
        console.log(`🎯 AUTOMATED: Preflop → Flop (${flopCards?.length || 0} community cards dealt)`);
        break;
      case 'flop':
        // Burn one card before dealing the turn
        this.gameState.burnedCards = this.gameState.burnedCards || [];
        const burnedTurn = this.deckService.dealCards(1, this.deck);
        if (burnedTurn) this.gameState.burnedCards.push(...burnedTurn);
        this.gameState.communityCards = this.gameState.communityCards || [];
        const turnCard = this.deckService.dealCards(1, this.deck);
        if (turnCard) this.gameState.communityCards.push(...turnCard);
        this.gameState.phase = 'turn';
        this.resetBettingRound();
        console.log(`🎯 AUTOMATED: Flop → Turn (turn card dealt: ${turnCard?.[0]?.rank}${turnCard?.[0]?.suit})`);
        break;
      case 'turn':
        // Burn one card before dealing the river
        this.gameState.burnedCards = this.gameState.burnedCards || [];
        const burnedRiver = this.deckService.dealCards(1, this.deck);
        if (burnedRiver) this.gameState.burnedCards.push(...burnedRiver);
        this.gameState.communityCards = this.gameState.communityCards || [];
        const riverCard = this.deckService.dealCards(1, this.deck);
        if (riverCard) this.gameState.communityCards.push(...riverCard);
        this.gameState.phase = 'river';
        this.resetBettingRound();
        console.log(`🎯 AUTOMATED: Turn → River (river card dealt: ${riverCard?.[0]?.rank}${riverCard?.[0]?.suit})`);
        break;
      case 'river':
        this.gameState.phase = 'showdown';
        this.handleShowdown();
        console.log(`🎯 AUTOMATED: River → Showdown (winner: ${this.gameState.winner || 'TBD'})`);
        break;
      default:
        throw new Error(`Invalid phase for completion: ${this.gameState.phase}`);
    }

    const toPhase = this.gameState.phase;
    
    // ENHANCED AUTOMATION: Trigger callback for WebSocket broadcasting
    if (this.phaseTransitionCallback) {
      console.log(`🔔 AUTOMATED: Broadcasting phase transition ${fromPhase} → ${toPhase} via callback`);
      this.phaseTransitionCallback(this.gameId, fromPhase, toPhase, this.gameState);
    } else {
      console.log(`⚠️ AUTOMATED: No phase transition callback set - transition not broadcasted`);
    }
    
    console.log(`✅ AUTOMATED PHASE TRANSITION COMPLETE: ${fromPhase} → ${toPhase}`);
  }

  private handleShowdown(): void {
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    
    if (activePlayers.length <= 1) {
      // Only one player left, they win automatically
      if (activePlayers.length === 1) {
        this.gameState.winner = activePlayers[0].id;
        this.gameState.winners = [activePlayers[0].id];
        activePlayers[0].chips += this.gameState.pot;
        
        // Simple showdown result for single winner
        this.gameState.showdownResults = [{
          playerId: activePlayers[0].id,
          playerName: activePlayers[0].name,
          hand: { name: 'Winner by Default', rank: 0, cards: [] },
          cards: activePlayers[0].cards,
          winAmount: this.gameState.pot,
          potType: 'main'
        }];
      }
      this.gameState.isHandComplete = true;
      this.gameState.phase = 'finished';
      return;
    }

    // Evaluate all hands with enhanced evaluation
    const handResults = this.evaluateHands();
    
    // Handle side pots if there are all-in players
    const hasSidePots = this.sidePotManager.hasAllInPlayers(this.gameState.players);
    
    if (hasSidePots) {
      this.handleSidePotShowdown(handResults);
    } else {
      this.handleMainPotShowdown(handResults);
    }
    
    this.gameState.isHandComplete = true;
    this.gameState.phase = 'finished';
  }

  private handleMainPotShowdown(handResults: { playerId: string; hand: DetailedHand }[]): void {
    // Find all players with the best hand
    const winners = this.findWinners(handResults);
    
    // Split pot among winners
    const winAmount = Math.floor(this.gameState.pot / winners.length);
    const remainder = this.gameState.pot % winners.length;
    
    const showdownResults: ShowdownResult[] = [];
    const winnerIds: string[] = [];
    
    handResults.forEach(result => {
      const player = this.getPlayer(result.playerId)!;
      const isWinner = winners.some(w => w.playerId === result.playerId);
      
      if (isWinner) {
        const winnerIndex = winnerIds.length;
        const playerWinAmount = winAmount + (winnerIndex < remainder ? 1 : 0);
        player.chips += playerWinAmount;
        winnerIds.push(result.playerId);
        
        showdownResults.push({
          playerId: result.playerId,
          playerName: player.name,
          hand: result.hand,
          cards: player.cards,
          winAmount: playerWinAmount,
          potType: 'main'
        });
      } else {
        showdownResults.push({
          playerId: result.playerId,
          playerName: player.name,
          hand: result.hand,
          cards: player.cards,
          winAmount: 0,
          potType: 'main'
        });
      }
    });
    
    // Set game state
    this.gameState.winners = winnerIds;
    this.gameState.winner = winnerIds[0]; // Backward compatibility
    this.gameState.handEvaluation = winners[0].hand.name;
    this.gameState.showdownResults = showdownResults;
  }

  private handleSidePotShowdown(handResults: { playerId: string; hand: DetailedHand }[]): void {
    // Create side pots based on betting amounts
    const sidePots = this.sidePotManager.createSidePots(this.gameState.players, this.gameState.pot);
    this.gameState.sidePots = sidePots;
    
    // Distribute each side pot
    const distributions = this.sidePotManager.distributePots(sidePots, handResults);
    
    // Apply winnings to players
    const showdownResults: ShowdownResult[] = [];
    const allWinners: string[] = [];
    
    handResults.forEach(result => {
      const player = this.getPlayer(result.playerId)!;
      const playerDistributions = distributions.filter(d => d.playerId === result.playerId);
      const totalWinnings = playerDistributions.reduce((sum, d) => sum + d.amount, 0);
      
      if (totalWinnings > 0) {
        player.chips += totalWinnings;
        allWinners.push(result.playerId);
      }
      
      showdownResults.push({
        playerId: result.playerId,
        playerName: player.name,
        hand: result.hand,
        cards: player.cards,
        winAmount: totalWinnings,
        potType: playerDistributions.length > 0 ? playerDistributions[0].potType : 'main',
        potId: playerDistributions.length > 0 ? playerDistributions[0].potId : undefined
      });
    });
    
    // Set game state
    this.gameState.winners = allWinners;
    this.gameState.winner = allWinners[0]; // Backward compatibility
    this.gameState.handEvaluation = this.getBestHandName(handResults);
    this.gameState.showdownResults = showdownResults;
  }

  private findWinners(handResults: { playerId: string; hand: DetailedHand }[]): { playerId: string; hand: DetailedHand }[] {
    if (handResults.length === 0) return [];
    
    // Sort hands by strength using the enhanced comparison
    const sortedResults = [...handResults].sort((a, b) => 
      this.handEvaluator.compareHands(b.hand, a.hand)
    );
    
    // Find all players with the best hand (ties)
    const bestHand = sortedResults[0].hand;
    const winners = sortedResults.filter(result => 
      this.handEvaluator.compareHands(result.hand, bestHand) === 0
    );
    
    return winners;
  }

  private getBestHandName(handResults: { playerId: string; hand: DetailedHand }[]): string {
    if (handResults.length === 0) return 'No hands';
    
    const winners = this.findWinners(handResults);
    return winners[0]?.hand.name || 'Unknown';
  }

  public getGameState(): GameState {
    return {
      id: this.gameId,
      players: this.gameState.players,
      communityCards: this.gameState.communityCards,
      burnedCards: this.gameState.burnedCards,
      pot: this.gameState.pot,
      sidePots: this.gameState.sidePots,
      currentPlayerId: this.gameState.currentPlayerId,
      currentPlayerPosition: this.gameState.currentPlayerPosition,
      dealerPosition: this.gameState.dealerPosition,
      smallBlindPosition: this.gameState.smallBlindPosition,
      bigBlindPosition: this.gameState.bigBlindPosition,
      phase: this.gameState.phase,
      status: this.gameState.status,
      currentBet: this.gameState.currentBet,
      minBet: this.gameState.minBet,
      smallBlind: this.gameState.smallBlind,
      bigBlind: this.gameState.bigBlind,
      handEvaluation: this.gameState.handEvaluation,
      winner: this.gameState.winner,
      winners: this.gameState.winners,
      showdownResults: this.gameState.showdownResults,
      isHandComplete: this.gameState.isHandComplete
    };
  }

  public getPlayer(playerId: string): Player | undefined {
    return this.gameState.players.find(p => p.id === playerId);
  }

  public addPlayer(player: Player): void {
    if (this.gameState.players.length >= this.MAX_PLAYERS) {
      throw new Error('Maximum number of players reached');
    }

    // Check if player already exists to prevent duplicates (by ID or nickname)
    const existingPlayer = this.getPlayer(player.id);
    if (existingPlayer) {
      console.log(`DEBUG: Player ${player.name} (${player.id}) already exists in game, removing old instance`);
      this.removePlayer(player.id);
    }

    // Also remove any players with the same nickname to prevent nickname-based duplicates
    this.removePlayerByNickname(player.name);

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
    console.log(`DEBUG: Successfully added player ${player.name} to seat ${player.seatNumber}`);
  }

  public removePlayer(playerId: string): void {
    // Remove from seat manager
    this.seatManager.leaveSeat(playerId);
    
    // Remove from players array
    this.gameState.players = this.gameState.players.filter(p => p.id !== playerId);
  }

  public removePlayerByNickname(nickname: string): void {
    // Find all players with this nickname and remove them
    const playersToRemove = this.gameState.players.filter(p => p.name === nickname);
    
    if (playersToRemove.length > 0) {
      console.log(`DEBUG: Removing ${playersToRemove.length} duplicate players with nickname "${nickname}"`);
      
      playersToRemove.forEach(player => {
        // Remove from seat manager
        this.seatManager.leaveSeat(player.id);
        console.log(`DEBUG: Removed player ${player.name} (${player.id}) from seat ${player.seatNumber}`);
      });
      
      // Remove from players array
      this.gameState.players = this.gameState.players.filter(p => p.name !== nickname);
    }
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

  public evaluateHands(): { playerId: string; hand: DetailedHand }[] {
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
      // All-in call scenario: player calls with all remaining chips
      const allInAmount = player.chips;
      console.log(`🎰 Player ${player.name} calling all-in for ${allInAmount} (call amount was ${callAmount})`);
      
      player.currentBet += allInAmount;
      this.gameState.pot += allInAmount;
      player.chips = 0;
      
      // Note: Side pots will be handled automatically during showdown
    } else {
      // Normal call with sufficient chips
      player.chips -= callAmount;
      player.currentBet += callAmount;
      this.gameState.pot += callAmount;
    }

    // Track that this player has acted
    this.playersActedThisRound.add(playerId);

    this.moveToNextPlayer();
  }

  public allIn(playerId: string): void {
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

    if (player.chips <= 0) {
      throw new Error('Player has no chips to go all-in');
    }

    const allInAmount = player.chips;
    const currentPlayerBet = player.currentBet;
    const newTotalBet = currentPlayerBet + allInAmount;
    const minCallAmount = this.gameState.currentBet - currentPlayerBet;

    console.log(`🎰 Player ${player.name} going ALL-IN with ${allInAmount} chips (total bet: ${newTotalBet})`);

    // Apply all-in bet regardless of call/raise requirements
    player.chips = 0;
    player.currentBet = newTotalBet;
    this.gameState.pot += allInAmount;
    
    // Update current bet if this all-in raises it
    if (newTotalBet > this.gameState.currentBet) {
      this.gameState.currentBet = newTotalBet;
      console.log(`🎰 All-in raised current bet to ${this.gameState.currentBet}`);
    }

    // Track that this player has acted
    this.playersActedThisRound.add(playerId);

    this.moveToNextPlayer();
  }

  public setGameId(gameId: string): void {
    this.gameId = gameId;
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
    this.gameState.winners = undefined;
    this.gameState.handEvaluation = undefined;
    this.gameState.showdownResults = undefined;
    this.gameState.sidePots = undefined;
    this.gameState.pot = 0;
    this.gameState.currentBet = 0;
    this.gameState.communityCards = [];
    this.gameState.phase = 'preflop';
    
    // Clear action tracking and side pot manager for new hand
    this.playersActedThisRound.clear();
    this.sidePotManager.reset();
    
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
  public getCardOrderHash(): string | undefined {
    return this.cardOrderHash;
  }

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

  // ENHANCED BLIND SYSTEM: Tournament and cash game management methods

  public initializeBlindSchedule(schedule: BlindSchedule): void {
    this.enhancedBlindManager.initializeBlindSchedule(schedule);
    console.log(`🏆 BLIND SYSTEM: Initialized ${schedule.type} with ${schedule.levels.length} blind levels`);
  }

  public handleSeatChange(playerId: string, oldSeat: number, newSeat: number): void {
    this.enhancedBlindManager.handleSeatChange(playerId, oldSeat, newSeat);
  }

  public handleLateEntry(playerId: string): void {
    this.enhancedBlindManager.handleLateEntry(playerId);
  }

  public getBlindScheduleSummary(): any {
    return this.enhancedBlindManager.getBlindScheduleSummary();
  }

  public getEnhancedBlindManager(): EnhancedBlindManager {
    return this.enhancedBlindManager;
  }

  // ENHANCED BLIND SYSTEM: Set late entry deadline for tournaments
  public setLateEntryDeadline(deadline: number): void {
    this.gameState.lateEntryDeadline = deadline;
    console.log(`⏰ BLIND SYSTEM: Late entry deadline set to ${new Date(deadline).toLocaleString()}`);
  }

  // ENHANCED BLIND SYSTEM: Check if player has pending dead blinds
  public hasDeadBlinds(playerId: string): boolean {
    return this.gameState.deadBlinds?.some(db => db.playerId === playerId) || false;
  }

  // ENHANCED BLIND SYSTEM: Force post dead blinds for a player
  public forcePostDeadBlinds(playerId: string): boolean {
    return this.enhancedBlindManager.postDeadBlinds(playerId);
  }
} 