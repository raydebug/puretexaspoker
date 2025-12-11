/// <reference path="../types/nakama.d.ts" />

// Op codes for client-server communication (matching Nakama API documentation)
const OpCodes = {
  SEAT_ACTION: 1,        // Seat selection or leave
  GAME_ACTION: 2,        // Bet, call, raise, fold, etc.
  CHAT_MESSAGE: 3,       // Player messages
  GAME_STATE: 10,        // Full game state update
  PLAYER_ACTION_RESULT: 11, // Server-validated action
  CHAT_BROADCAST: 12,    // Broadcast chat to table
  HAND_COMPLETE: 13,     // Hand result summary
  PLAYER_ELIMINATED: 14  // Player out of chips
};

interface PokerPlayer {
  userId: string;
  username: string;
  chips: number;
  seatNumber: number;
  isActive: boolean;
  currentBet: number;
  cards: Card[];
  position: string;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  hasActed: boolean;
  isFolded: boolean;
  isAllIn: boolean;
}

interface Card {
  rank: string;
  suit: string;
}

interface PokerTableState {
  tableId: string;
  tableName: string;
  maxPlayers: number;
  stakes: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  
  players: { [userId: string]: PokerPlayer };
  observers: string[];
  
  // Game state
  gamePhase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';
  gameStatus: 'waiting' | 'playing' | 'finished';
  pot: number;
  currentBet: number;
  minBet: number;
  currentPlayerId: string | null;
  dealerPosition: number;
  smallBlindPosition: number;
  bigBlindPosition: number;
  
  // Cards
  communityCards: Card[];
  deck: Card[];
  burnedCards: Card[];
  
  // Hand tracking
  handNumber: number;
  handStartTime: number;
  
  // Action tracking
  actionHistory: GameAction[];
  showdownResults?: any[];
  winners?: string[];
}

interface GameAction {
  playerId: string;
  playerName: string;
  action: string;
  amount: number;
  timestamp: number;
  phase: string;
  potBefore: number;
  potAfter: number;
}

interface SeatActionData {
  action: 'take_seat' | 'leave_seat';
  seatNumber?: number;
  buyInAmount?: number;
}

interface GameActionData {
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';
  amount?: number;
}

interface ChatMessageData {
  message: string;
  timestamp: number;
}

// Initialize a new poker table match
function pokerTableInit(
  ctx: nkruntime.Context, 
  logger: nkruntime.Logger, 
  nk: nkruntime.Nakama, 
  params: { [key: string]: any }
): { state: PokerTableState; tickRate: number; label: string } {
  logger.info('Initializing poker table match');
  
  const tableId = params.tableId || `table_${Date.now()}`;
  const tableName = params.tableName || `Table ${tableId}`;
  
  const initialState: PokerTableState = {
    tableId,
    tableName,
    maxPlayers: params.maxPlayers || 6,
    stakes: params.stakes || '$1/$2',
    smallBlind: params.smallBlind || 1,
    bigBlind: params.bigBlind || 2,
    minBuyIn: params.minBuyIn || 40,
    maxBuyIn: params.maxBuyIn || 400,
    
    players: {},
    observers: [],
    
    gamePhase: 'waiting',
    gameStatus: 'waiting',
    pot: 0,
    currentBet: 0,
    minBet: params.bigBlind || 2,
    currentPlayerId: null,
    dealerPosition: 0,
    smallBlindPosition: 1,
    bigBlindPosition: 2,
    
    communityCards: [],
    deck: [],
    burnedCards: [],
    
    handNumber: 0,
    handStartTime: 0,
    
    actionHistory: []
  };

  const label = JSON.stringify({
    type: 'poker_table',
    name: tableName,
    stakes: params.stakes || '$1/$2',
    players: 0,
    maxPlayers: params.maxPlayers || 6
  });

  return {
    state: initialState,
    tickRate: 1, // 1 tick per second
    label
  };
}

// Handle player attempting to join
function pokerTableJoinAttempt(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: PokerTableState,
  presence: nkruntime.Presence,
  metadata: { [key: string]: any }
): { state: PokerTableState; accept: boolean; rejectMessage?: string } | null {
  
  logger.info('Player attempting to join poker table:', presence.username);
  
  // Check if table is full (including observers)
  const totalPlayers = Object.keys(state.players).length;
  const totalObservers = state.observers.length;
  
  if (totalPlayers + totalObservers >= 10) { // Max 6 players + 4 observers
    return {
      state,
      accept: false,
      rejectMessage: 'Table is full'
    };
  }

  // Always accept - they'll start as observer until they take a seat
  return {
    state,
    accept: true
  };
}

// Handle player joining successfully
function pokerTableJoin(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: PokerTableState,
  presences: nkruntime.Presence[]
): { state: PokerTableState } | null {
  
  for (const presence of presences) {
    logger.info('Player joined poker table:', presence.username);
    
    // Add to observers initially
    if (!state.observers.includes(presence.userId)) {
      state.observers.push(presence.userId);
    }
    
    // Send current game state to the new player
    const gameStateData = {
      ...state,
      // Include presence information for UI
      presences: presences.map(p => ({
        userId: p.userId,
        username: p.username,
        sessionId: p.sessionId
      }))
    };
    
    dispatcher.broadcastMessage(
      OpCodes.GAME_STATE, 
      JSON.stringify(gameStateData),
      [presence]
    );
  }

  return { state };
}

// Handle player leaving
function pokerTableLeave(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: PokerTableState,
  presences: nkruntime.Presence[]
): { state: PokerTableState } | null {
  
  for (const presence of presences) {
    logger.info('Player left poker table:', presence.username);
    
    // Remove from observers
    state.observers = state.observers.filter(id => id !== presence.userId);
    
    // Remove from players if they were seated
    if (state.players[presence.userId]) {
      const player = state.players[presence.userId];
      logger.info(`Player ${presence.username} left from seat ${player.seatNumber}`);
      
      // TODO: Handle chips return to wallet
      // TODO: Handle game disruption if in middle of hand
      
      delete state.players[presence.userId];
      
      // Broadcast updated state
      broadcastGameState(dispatcher, state);
    }
  }

  return { state };
}

// Main game loop - handles periodic tasks
function pokerTableLoop(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: PokerTableState,
  messages: nkruntime.MatchMessage[]
): { state: PokerTableState } | null {
  
  // Process incoming messages
  for (const message of messages) {
    try {
      const data = JSON.parse(message.data);
      
      switch (message.opCode) {
        case OpCodes.SEAT_ACTION:
          handleSeatAction(ctx, logger, nk, dispatcher, state, message.sender!, data as SeatActionData);
          break;
          
        case OpCodes.GAME_ACTION:
          handleGameAction(ctx, logger, nk, dispatcher, state, message.sender!, data as GameActionData);
          break;
          
        case OpCodes.CHAT_MESSAGE:
          handleChatMessage(ctx, logger, nk, dispatcher, state, message.sender!, data as ChatMessageData);
          break;
          
        default:
          logger.warn('Unknown message opcode:', message.opCode);
      }
    } catch (error) {
      logger.error('Error processing message:', error);
    }
  }
  
  // TODO: Handle game timeouts, auto-actions, etc.
  
  return { state };
}

// Handle signals (admin commands, etc.)
function pokerTableSignal(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: PokerTableState,
  data: string
): { state: PokerTableState; data?: string } | null {
  
  logger.info('Received signal:', data);
  
  try {
    const signal = JSON.parse(data);
    
    switch (signal.type) {
      case 'force_start_game':
        if (Object.keys(state.players).length >= 2) {
          startNewHand(state);
          broadcastGameState(dispatcher, state);
        }
        break;
        
      case 'end_match':
        return { state, data: 'match_ended' };
        
      default:
        logger.warn('Unknown signal type:', signal.type);
    }
  } catch (error) {
    logger.error('Error processing signal:', error);
  }
  
  return { state };
}

// Handle match termination
function pokerTableTerminate(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: PokerTableState,
  graceSeconds: number
): { state: PokerTableState } | null {
  
  logger.info('Poker table match terminating');
  
  // TODO: Save final state to storage
  // TODO: Return chips to player wallets
  
  return { state };
}

// Helper functions

function handleSeatAction(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  state: PokerTableState,
  sender: nkruntime.Presence,
  data: SeatActionData
) {
  if (data.action === 'take_seat') {
    takeSeat(state, sender, data.seatNumber!, data.buyInAmount!);
  } else if (data.action === 'leave_seat') {
    leaveSeat(state, sender);
  }
  
  broadcastGameState(dispatcher, state);
}

function handleGameAction(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  state: PokerTableState,
  sender: nkruntime.Presence,
  data: GameActionData
) {
  if (state.currentPlayerId !== sender.userId) {
    // Send error to player - not their turn
    dispatcher.broadcastMessage(
      OpCodes.PLAYER_ACTION_RESULT,
      JSON.stringify({ error: 'Not your turn', success: false }),
      [sender]
    );
    return;
  }
  
  const success = processPlayerAction(state, sender.userId, data.action, data.amount);
  
  if (success) {
    // Record action in history
    recordAction(state, sender.userId, sender.username, data.action, data.amount || 0);
    
    // Move to next player or next phase
    advanceGame(state);
    
    dispatcher.broadcastMessage(
      OpCodes.PLAYER_ACTION_RESULT,
      JSON.stringify({ success: true, action: data.action, amount: data.amount }),
      [sender]
    );
  } else {
    dispatcher.broadcastMessage(
      OpCodes.PLAYER_ACTION_RESULT,
      JSON.stringify({ error: 'Invalid action', success: false }),
      [sender]
    );
  }
  
  broadcastGameState(dispatcher, state);
}

function handleChatMessage(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  state: PokerTableState,
  sender: nkruntime.Presence,
  data: ChatMessageData
) {
  const chatData = {
    userId: sender.userId,
    username: sender.username,
    message: data.message,
    timestamp: Date.now()
  };
  
  dispatcher.broadcastMessage(
    OpCodes.CHAT_BROADCAST,
    JSON.stringify(chatData)
  );
}

function takeSeat(state: PokerTableState, presence: nkruntime.Presence, seatNumber: number, buyInAmount: number) {
  // Check if seat is available
  const existingPlayer = Object.values(state.players).find(p => p.seatNumber === seatNumber);
  if (existingPlayer) {
    return false;
  }
  
  // Remove from observers
  state.observers = state.observers.filter(id => id !== presence.userId);
  
  // Add as player
  state.players[presence.userId] = {
    userId: presence.userId,
    username: presence.username,
    chips: buyInAmount,
    seatNumber,
    isActive: true,
    currentBet: 0,
    cards: [],
    position: '',
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    hasActed: false,
    isFolded: false,
    isAllIn: false
  };
  
  return true;
}

function leaveSeat(state: PokerTableState, presence: nkruntime.Presence) {
  if (state.players[presence.userId]) {
    delete state.players[presence.userId];
    
    // Add back to observers
    if (!state.observers.includes(presence.userId)) {
      state.observers.push(presence.userId);
    }
  }
}

function processPlayerAction(state: PokerTableState, playerId: string, action: string, amount?: number): boolean {
  const player = state.players[playerId];
  if (!player) return false;
  
  switch (action) {
    case 'fold':
      player.isFolded = true;
      player.isActive = false;
      break;
      
    case 'check':
      if (state.currentBet > player.currentBet) {
        return false; // Cannot check when there's a bet
      }
      break;
      
    case 'call':
      const callAmount = state.currentBet - player.currentBet;
      if (callAmount > player.chips) {
        return false; // Not enough chips
      }
      player.chips -= callAmount;
      player.currentBet = state.currentBet;
      state.pot += callAmount;
      break;
      
    case 'bet':
    case 'raise':
      if (!amount || amount <= state.currentBet || amount > player.chips) {
        return false;
      }
      const betAmount = amount - player.currentBet;
      player.chips -= betAmount;
      player.currentBet = amount;
      state.pot += betAmount;
      state.currentBet = amount;
      break;
      
    case 'all_in':
      const allInAmount = player.chips;
      player.chips = 0;
      player.currentBet += allInAmount;
      state.pot += allInAmount;
      player.isAllIn = true;
      if (player.currentBet > state.currentBet) {
        state.currentBet = player.currentBet;
      }
      break;
      
    default:
      return false;
  }
  
  player.hasActed = true;
  return true;
}

function recordAction(state: PokerTableState, playerId: string, playerName: string, action: string, amount: number) {
  const gameAction: GameAction = {
    playerId,
    playerName,
    action,
    amount,
    timestamp: Date.now(),
    phase: state.gamePhase,
    potBefore: state.pot - amount,
    potAfter: state.pot
  };
  
  state.actionHistory.push(gameAction);
}

function advanceGame(state: PokerTableState) {
  // Move to next active player
  moveToNextPlayer(state);
  
  // Check if betting round is complete
  if (isBettingRoundComplete(state)) {
    advanceToNextPhase(state);
  }
}

function moveToNextPlayer(state: PokerTableState) {
  const activePlayers = Object.values(state.players).filter(p => p.isActive && !p.isFolded);
  if (activePlayers.length <= 1) {
    state.currentPlayerId = null;
    return;
  }
  
  // Find current player index and move to next
  const currentIndex = activePlayers.findIndex(p => p.userId === state.currentPlayerId);
  const nextIndex = (currentIndex + 1) % activePlayers.length;
  state.currentPlayerId = activePlayers[nextIndex].userId;
}

function isBettingRoundComplete(state: PokerTableState): boolean {
  const activePlayers = Object.values(state.players).filter(p => p.isActive && !p.isFolded);
  
  // Check if all active players have acted and have equal bets
  const allActed = activePlayers.every(p => p.hasActed || p.isAllIn);
  const equalBets = activePlayers.every(p => p.currentBet === state.currentBet || p.isAllIn);
  
  return allActed && equalBets;
}

function advanceToNextPhase(state: PokerTableState) {
  // Reset player actions for next round
  Object.values(state.players).forEach(p => {
    p.hasActed = false;
    p.currentBet = 0;
  });
  
  state.currentBet = 0;
  
  switch (state.gamePhase) {
    case 'preflop':
      state.gamePhase = 'flop';
      dealCommunityCards(state, 3);
      break;
    case 'flop':
      state.gamePhase = 'turn';
      dealCommunityCards(state, 1);
      break;
    case 'turn':
      state.gamePhase = 'river';
      dealCommunityCards(state, 1);
      break;
    case 'river':
      state.gamePhase = 'showdown';
      handleShowdown(state);
      break;
    case 'showdown':
      endHand(state);
      break;
  }
  
  // Set first player to act for new round
  if (state.gamePhase !== 'showdown') {
    setFirstPlayerToAct(state);
  }
}

function startNewHand(state: PokerTableState) {
  state.handNumber++;
  state.handStartTime = Date.now();
  state.gamePhase = 'preflop';
  state.gameStatus = 'playing';
  state.pot = 0;
  state.currentBet = 0;
  state.communityCards = [];
  state.actionHistory = [];
  
  // Initialize deck and deal cards
  initializeDeck(state);
  dealPlayerCards(state);
  
  // Post blinds
  postBlinds(state);
  
  // Set first player to act (after big blind)
  setFirstPlayerToAct(state);
}

function initializeDeck(state: PokerTableState) {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  state.deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      state.deck.push({ rank, suit });
    }
  }
  
  // Shuffle deck
  for (let i = state.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
  }
}

function dealPlayerCards(state: PokerTableState) {
  const activePlayers = Object.values(state.players).filter(p => p.isActive);
  
  // Deal 2 cards to each player
  for (let round = 0; round < 2; round++) {
    for (const player of activePlayers) {
      const card = state.deck.pop()!;
      player.cards.push(card);
    }
  }
}

function dealCommunityCards(state: PokerTableState, count: number) {
  // Burn a card first
  const burnCard = state.deck.pop()!;
  state.burnedCards.push(burnCard);
  
  // Deal community cards
  for (let i = 0; i < count; i++) {
    const card = state.deck.pop()!;
    state.communityCards.push(card);
  }
}

function postBlinds(state: PokerTableState) {
  const activePlayers = Object.values(state.players).filter(p => p.isActive);
  if (activePlayers.length < 2) return;
  
  // Find small and big blind players
  const sbPlayer = activePlayers.find(p => p.seatNumber === state.smallBlindPosition);
  const bbPlayer = activePlayers.find(p => p.seatNumber === state.bigBlindPosition);
  
  if (sbPlayer && sbPlayer.chips >= state.smallBlind) {
    sbPlayer.chips -= state.smallBlind;
    sbPlayer.currentBet = state.smallBlind;
    state.pot += state.smallBlind;
    sbPlayer.isSmallBlind = true;
  }
  
  if (bbPlayer && bbPlayer.chips >= state.bigBlind) {
    bbPlayer.chips -= state.bigBlind;
    bbPlayer.currentBet = state.bigBlind;
    state.pot += state.bigBlind;
    state.currentBet = state.bigBlind;
    bbPlayer.isBigBlind = true;
  }
}

function setFirstPlayerToAct(state: PokerTableState) {
  const activePlayers = Object.values(state.players).filter(p => p.isActive && !p.isFolded);
  if (activePlayers.length === 0) return;
  
  // For preflop, first to act is after big blind
  // For other rounds, first to act is first active player after dealer
  let startPosition = state.gamePhase === 'preflop' ? state.bigBlindPosition + 1 : state.dealerPosition + 1;
  
  // Find first active player from start position
  for (let i = 0; i < state.maxPlayers; i++) {
    const position = (startPosition + i) % state.maxPlayers;
    const player = activePlayers.find(p => p.seatNumber === position);
    if (player && !player.isFolded) {
      state.currentPlayerId = player.userId;
      break;
    }
  }
}

function handleShowdown(state: PokerTableState) {
  state.gamePhase = 'showdown';
  
  const activePlayers = Object.values(state.players).filter(p => !p.isFolded && p.cards.length > 0);
  
  if (activePlayers.length === 1) {
    // Only one player left - they win
    const winner = activePlayers[0];
    winner.chips += state.pot;
    state.winners = [winner.userId];
    state.showdownResults = [{
      playerId: winner.userId,
      playerName: winner.username,
      hand: { name: 'Unopposed', rank: 0, cards: winner.cards },
      winAmount: state.pot
    }];
    state.pot = 0;
  } else if (activePlayers.length > 1) {
    // Multiple players - evaluate hands
    const { HandEvaluator } = require('../game_logic/hand_evaluator');
    const handEvaluator = new HandEvaluator();
    
    // Evaluate each player's hand
    const playerHands = activePlayers.map(player => ({
      playerId: player.userId,
      playerName: player.username,
      player: player,
      hand: handEvaluator.evaluateHand(player.cards, state.communityCards)
    }));
    
    // Determine winners
    const winners = handEvaluator.determineWinners(playerHands.map(ph => ({
      playerId: ph.playerId,
      hand: ph.hand
    })));
    
    // Calculate winnings and create showdown results
    const winAmount = Math.floor(state.pot / winners.length);
    const remainder = state.pot % winners.length;
    
    state.showdownResults = playerHands.map((ph, index) => {
      const isWinner = winners.includes(ph.playerId);
      const baseWin = isWinner ? winAmount : 0;
      const bonusWin = isWinner && index < remainder ? 1 : 0;
      const totalWin = baseWin + bonusWin;
      
      if (totalWin > 0) {
        ph.player.chips += totalWin;
      }
      
      return {
        playerId: ph.playerId,
        playerName: ph.playerName,
        hand: {
          name: ph.hand.name,
          rank: ph.hand.rank,
          cards: ph.hand.cards
        },
        winAmount: totalWin,
        isWinner: isWinner
      };
    });
    
    state.winners = winners;
    state.pot = 0;
  }
}

function endHand(state: PokerTableState) {
  // TODO: Distribute pot to winners, update statistics
  state.gamePhase = 'waiting';
  state.gameStatus = 'waiting';
  
  // Clear player cards
  Object.values(state.players).forEach(player => {
    player.cards = [];
    player.currentBet = 0;
    player.hasActed = false;
    player.isFolded = false;
    player.isAllIn = false;
    player.isSmallBlind = false;
    player.isBigBlind = false;
  });
}

function broadcastGameState(dispatcher: nkruntime.MatchDispatcher, state: PokerTableState) {
  dispatcher.broadcastMessage(
    OpCodes.GAME_STATE,
    JSON.stringify(state)
  );
}

// Export functions for main module
module.exports = {
  pokerTableInit,
  pokerTableJoinAttempt,
  pokerTableJoin,
  pokerTableLeave,
  pokerTableLoop,
  pokerTableSignal,
  pokerTableTerminate
}; 