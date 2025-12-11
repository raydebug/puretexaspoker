/**
 * Fixed Dummy Data for 3-Round Tournament Test
 * 
 * Complete game progression data with fixed timestamps and pre-defined states
 * for each player at each step of the tournament.
 */

const FIXED_BASE_TIMESTAMP = '2025-09-10T15:30:00.000Z';

// Generate fixed sequential timestamps
function getFixedTimestamp(sequenceNumber) {
  const baseTime = new Date(FIXED_BASE_TIMESTAMP).getTime();
  return new Date(baseTime + (sequenceNumber * 5000)).toISOString(); // 5 seconds apart
}

/**
 * Complete Tournament Game Progress Data
 * Organized by phases with player states at each step
 */
const TOURNAMENT_GAME_DATA = {
  
  // ===== INITIAL SETUP =====
  initial_setup: {
    phase: 'setup',
    blinds: { small: 5, big: 10 },
    pot: 0,
    activePlayerCount: 5,
    players: {
      Player1: { 
        id: 'Player1', chips: 100, position: 'SB', seat: 1, isActive: true, 
        holeCards: ['8♠', '3♦'], isEliminated: false, eliminated_round: null 
      },
      Player2: { 
        id: 'Player2', chips: 100, position: 'BB', seat: 2, isActive: true, 
        holeCards: ['K♥', 'Q♠'], isEliminated: false, eliminated_round: null 
      },
      Player3: { 
        id: 'Player3', chips: 100, position: 'UTG', seat: 3, isActive: true, 
        holeCards: ['7♣', '2♥'], isEliminated: false, eliminated_round: null 
      },
      Player4: { 
        id: 'Player4', chips: 100, position: 'CO', seat: 4, isActive: true, 
        holeCards: ['10♦', '10♣'], isEliminated: false, eliminated_round: null 
      },
      Player5: { 
        id: 'Player5', chips: 100, position: 'BTN', seat: 5, isActive: true, 
        holeCards: ['A♥', 'Q♦'], isEliminated: false, eliminated_round: null 
      }
    },
    gameHistory: []
  },

  // ===== ROUND 1: $5/$10 BLINDS =====
  
  // Step 1: Blinds Posted
  r1_blinds_posted: {
    phase: 'preflop_blinds',
    blinds: { small: 5, big: 10 },
    pot: 15,
    activePlayerCount: 5,
    players: {
      Player1: { 
        id: 'Player1', chips: 95, position: 'SB', seat: 1, isActive: true, 
        holeCards: ['8♠', '3♦'], isEliminated: false, eliminated_round: null,
        currentBet: 5, inPot: 5
      },
      Player2: { 
        id: 'Player2', chips: 90, position: 'BB', seat: 2, isActive: true, 
        holeCards: ['K♥', 'Q♠'], isEliminated: false, eliminated_round: null,
        currentBet: 10, inPot: 10
      },
      Player3: { 
        id: 'Player3', chips: 100, position: 'UTG', seat: 3, isActive: true, 
        holeCards: ['7♣', '2♥'], isEliminated: false, eliminated_round: null,
        currentBet: 0, inPot: 0
      },
      Player4: { 
        id: 'Player4', chips: 100, position: 'CO', seat: 4, isActive: true, 
        holeCards: ['10♦', '10♣'], isEliminated: false, eliminated_round: null,
        currentBet: 0, inPot: 0
      },
      Player5: { 
        id: 'Player5', chips: 100, position: 'BTN', seat: 5, isActive: true, 
        holeCards: ['A♥', 'Q♦'], isEliminated: false, eliminated_round: null,
        currentBet: 0, inPot: 0
      }
    },
    gameHistory: [
      {
        id: 'GH-1',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'Small_Blind',
        amount: 5,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 1,
        timestamp: getFixedTimestamp(1)
      },
      {
        id: 'GH-2',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'Big_Blind',
        amount: 10,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 2,
        timestamp: getFixedTimestamp(2)
      }
    ]
  },

  // Step 2: Player3 UTG All-in
  r1_player3_allin: {
    phase: 'preflop_betting',
    blinds: { small: 5, big: 10 },
    pot: 115,
    activePlayerCount: 5,
    players: {
      Player1: { 
        id: 'Player1', chips: 95, position: 'SB', seat: 1, isActive: true, 
        holeCards: ['8♠', '3♦'], isEliminated: false, eliminated_round: null,
        currentBet: 5, inPot: 5
      },
      Player2: { 
        id: 'Player2', chips: 90, position: 'BB', seat: 2, isActive: true, 
        holeCards: ['K♥', 'Q♠'], isEliminated: false, eliminated_round: null,
        currentBet: 10, inPot: 10
      },
      Player3: { 
        id: 'Player3', chips: 0, position: 'UTG', seat: 3, isActive: true, 
        holeCards: ['7♣', '2♥'], isEliminated: false, eliminated_round: null,
        currentBet: 100, inPot: 100, isAllIn: true
      },
      Player4: { 
        id: 'Player4', chips: 100, position: 'CO', seat: 4, isActive: true, 
        holeCards: ['10♦', '10♣'], isEliminated: false, eliminated_round: null,
        currentBet: 0, inPot: 0
      },
      Player5: { 
        id: 'Player5', chips: 100, position: 'BTN', seat: 5, isActive: true, 
        holeCards: ['A♥', 'Q♦'], isEliminated: false, eliminated_round: null,
        currentBet: 0, inPot: 0
      }
    },
    gameHistory: [
      {
        id: 'GH-1',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'Small_Blind',
        amount: 5,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 1,
        timestamp: getFixedTimestamp(1)
      },
      {
        id: 'GH-2',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'Big_Blind',
        amount: 10,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 2,
        timestamp: getFixedTimestamp(2)
      },
      {
        id: 'GH-3',
        playerId: 'Player3',
        playerName: 'Player3',
        action: 'ALL_IN',
        amount: 100,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 3,
        timestamp: getFixedTimestamp(3)
      }
    ]
  },

  // Step 3: Player4 Calls All-in
  r1_player4_calls: {
    phase: 'preflop_betting',
    blinds: { small: 5, big: 10 },
    pot: 215,
    activePlayerCount: 5,
    players: {
      Player1: { 
        id: 'Player1', chips: 95, position: 'SB', seat: 1, isActive: true, 
        holeCards: ['8♠', '3♦'], isEliminated: false, eliminated_round: null,
        currentBet: 5, inPot: 5
      },
      Player2: { 
        id: 'Player2', chips: 90, position: 'BB', seat: 2, isActive: true, 
        holeCards: ['K♥', 'Q♠'], isEliminated: false, eliminated_round: null,
        currentBet: 10, inPot: 10
      },
      Player3: { 
        id: 'Player3', chips: 0, position: 'UTG', seat: 3, isActive: true, 
        holeCards: ['7♣', '2♥'], isEliminated: false, eliminated_round: null,
        currentBet: 100, inPot: 100, isAllIn: true
      },
      Player4: { 
        id: 'Player4', chips: 0, position: 'CO', seat: 4, isActive: true, 
        holeCards: ['10♦', '10♣'], isEliminated: false, eliminated_round: null,
        currentBet: 100, inPot: 100, isAllIn: true
      },
      Player5: { 
        id: 'Player5', chips: 100, position: 'BTN', seat: 5, isActive: true, 
        holeCards: ['A♥', 'Q♦'], isEliminated: false, eliminated_round: null,
        currentBet: 0, inPot: 0
      }
    },
    gameHistory: [
      {
        id: 'GH-1',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'Small_Blind',
        amount: 5,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 1,
        timestamp: getFixedTimestamp(1)
      },
      {
        id: 'GH-2',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'Big_Blind',
        amount: 10,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 2,
        timestamp: getFixedTimestamp(2)
      },
      {
        id: 'GH-3',
        playerId: 'Player3',
        playerName: 'Player3',
        action: 'ALL_IN',
        amount: 100,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 3,
        timestamp: getFixedTimestamp(3)
      },
      {
        id: 'GH-4',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'CALL',
        amount: 100,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 4,
        timestamp: getFixedTimestamp(4)
      }
    ]
  },

  // Step 4: Others Fold
  r1_others_fold: {
    phase: 'preflop_complete',
    blinds: { small: 5, big: 10 },
    pot: 215,
    activePlayerCount: 2, // Only Player3 and Player4 in showdown
    players: {
      Player1: { 
        id: 'Player1', chips: 95, position: 'SB', seat: 1, isActive: true, 
        holeCards: ['8♠', '3♦'], isEliminated: false, eliminated_round: null,
        currentBet: 0, inPot: 0, hasFolded: true
      },
      Player2: { 
        id: 'Player2', chips: 90, position: 'BB', seat: 2, isActive: true, 
        holeCards: ['K♥', 'Q♠'], isEliminated: false, eliminated_round: null,
        currentBet: 0, inPot: 0, hasFolded: true
      },
      Player3: { 
        id: 'Player3', chips: 0, position: 'UTG', seat: 3, isActive: true, 
        holeCards: ['7♣', '2♥'], isEliminated: false, eliminated_round: null,
        currentBet: 100, inPot: 100, isAllIn: true
      },
      Player4: { 
        id: 'Player4', chips: 0, position: 'CO', seat: 4, isActive: true, 
        holeCards: ['10♦', '10♣'], isEliminated: false, eliminated_round: null,
        currentBet: 100, inPot: 100, isAllIn: true
      },
      Player5: { 
        id: 'Player5', chips: 100, position: 'BTN', seat: 5, isActive: true, 
        holeCards: ['A♥', 'Q♦'], isEliminated: false, eliminated_round: null,
        currentBet: 0, inPot: 0, hasFolded: true
      }
    },
    gameHistory: [
      {
        id: 'GH-1',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'Small_Blind',
        amount: 5,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 1,
        timestamp: getFixedTimestamp(1)
      },
      {
        id: 'GH-2',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'Big_Blind',
        amount: 10,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 2,
        timestamp: getFixedTimestamp(2)
      },
      {
        id: 'GH-3',
        playerId: 'Player3',
        playerName: 'Player3',
        action: 'ALL_IN',
        amount: 100,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 3,
        timestamp: getFixedTimestamp(3)
      },
      {
        id: 'GH-4',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'CALL',
        amount: 100,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 4,
        timestamp: getFixedTimestamp(4)
      },
      {
        id: 'GH-5',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 5,
        timestamp: getFixedTimestamp(5)
      },
      {
        id: 'GH-6',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 6,
        timestamp: getFixedTimestamp(6)
      },
      {
        id: 'GH-7',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 7,
        timestamp: getFixedTimestamp(7)
      }
    ]
  },

  // Step 5: Flop Revealed
  r1_flop: {
    phase: 'flop',
    blinds: { small: 5, big: 10 },
    pot: 215,
    activePlayerCount: 2,
    communityCards: ['9♠', '4♦', '6♣'],
    players: {
      Player1: { 
        id: 'Player1', chips: 95, position: 'SB', seat: 1, isActive: true, 
        holeCards: ['8♠', '3♦'], isEliminated: false, eliminated_round: null,
        hasFolded: true
      },
      Player2: { 
        id: 'Player2', chips: 90, position: 'BB', seat: 2, isActive: true, 
        holeCards: ['K♥', 'Q♠'], isEliminated: false, eliminated_round: null,
        hasFolded: true
      },
      Player3: { 
        id: 'Player3', chips: 0, position: 'UTG', seat: 3, isActive: true, 
        holeCards: ['7♣', '2♥'], isEliminated: false, eliminated_round: null,
        isAllIn: true, inPot: 100
      },
      Player4: { 
        id: 'Player4', chips: 0, position: 'CO', seat: 4, isActive: true, 
        holeCards: ['10♦', '10♣'], isEliminated: false, eliminated_round: null,
        isAllIn: true, inPot: 100
      },
      Player5: { 
        id: 'Player5', chips: 100, position: 'BTN', seat: 5, isActive: true, 
        holeCards: ['A♥', 'Q♦'], isEliminated: false, eliminated_round: null,
        hasFolded: true
      }
    },
    gameHistory: [
      {
        id: 'GH-1',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'Small_Blind',
        amount: 5,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 1,
        timestamp: getFixedTimestamp(1)
      },
      {
        id: 'GH-2',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'Big_Blind',
        amount: 10,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 2,
        timestamp: getFixedTimestamp(2)
      },
      {
        id: 'GH-3',
        playerId: 'Player3',
        playerName: 'Player3',
        action: 'ALL_IN',
        amount: 100,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 3,
        timestamp: getFixedTimestamp(3)
      },
      {
        id: 'GH-4',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'CALL',
        amount: 100,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 4,
        timestamp: getFixedTimestamp(4)
      },
      {
        id: 'GH-5',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 5,
        timestamp: getFixedTimestamp(5)
      },
      {
        id: 'GH-6',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 6,
        timestamp: getFixedTimestamp(6)
      },
      {
        id: 'GH-7',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 7,
        timestamp: getFixedTimestamp(7)
      },
      {
        id: 'GH-8',
        playerId: 'DEALER',
        playerName: 'Dealer',
        action: 'FLOP',
        amount: null,
        phase: 'flop',
        handNumber: 1,
        actionSequence: 8,
        timestamp: getFixedTimestamp(8),
        cards: ['9♠', '4♦', '6♣']
      }
    ]
  },

  // Step 6: Turn Revealed
  r1_turn: {
    phase: 'turn',
    blinds: { small: 5, big: 10 },
    pot: 215,
    activePlayerCount: 2,
    communityCards: ['9♠', '4♦', '6♣', 'K♦'],
    players: {
      Player1: { 
        id: 'Player1', chips: 95, position: 'SB', seat: 1, isActive: true, 
        holeCards: ['8♠', '3♦'], isEliminated: false, eliminated_round: null,
        hasFolded: true
      },
      Player2: { 
        id: 'Player2', chips: 90, position: 'BB', seat: 2, isActive: true, 
        holeCards: ['K♥', 'Q♠'], isEliminated: false, eliminated_round: null,
        hasFolded: true
      },
      Player3: { 
        id: 'Player3', chips: 0, position: 'UTG', seat: 3, isActive: true, 
        holeCards: ['7♣', '2♥'], isEliminated: false, eliminated_round: null,
        isAllIn: true, inPot: 100
      },
      Player4: { 
        id: 'Player4', chips: 0, position: 'CO', seat: 4, isActive: true, 
        holeCards: ['10♦', '10♣'], isEliminated: false, eliminated_round: null,
        isAllIn: true, inPot: 100
      },
      Player5: { 
        id: 'Player5', chips: 100, position: 'BTN', seat: 5, isActive: true, 
        holeCards: ['A♥', 'Q♦'], isEliminated: false, eliminated_round: null,
        hasFolded: true
      }
    },
    gameHistory: [
      {
        id: 'GH-1',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'Small_Blind',
        amount: 5,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 1,
        timestamp: getFixedTimestamp(1)
      },
      {
        id: 'GH-2',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'Big_Blind',
        amount: 10,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 2,
        timestamp: getFixedTimestamp(2)
      },
      {
        id: 'GH-3',
        playerId: 'Player3',
        playerName: 'Player3',
        action: 'ALL_IN',
        amount: 100,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 3,
        timestamp: getFixedTimestamp(3)
      },
      {
        id: 'GH-4',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'CALL',
        amount: 100,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 4,
        timestamp: getFixedTimestamp(4)
      },
      {
        id: 'GH-5',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 5,
        timestamp: getFixedTimestamp(5)
      },
      {
        id: 'GH-6',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 6,
        timestamp: getFixedTimestamp(6)
      },
      {
        id: 'GH-7',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 7,
        timestamp: getFixedTimestamp(7)
      },
      {
        id: 'GH-8',
        playerId: 'DEALER',
        playerName: 'Dealer',
        action: 'FLOP',
        amount: null,
        phase: 'flop',
        handNumber: 1,
        actionSequence: 8,
        timestamp: getFixedTimestamp(8),
        cards: ['9♠', '4♦', '6♣']
      },
      {
        id: 'GH-9',
        playerId: 'DEALER',
        playerName: 'Dealer',
        action: 'TURN',
        amount: null,
        phase: 'turn',
        handNumber: 1,
        actionSequence: 9,
        timestamp: getFixedTimestamp(9),
        cards: ['K♦']
      }
    ]
  },

  // Step 7: River and Player3 Elimination
  r1_river_player3_eliminated: {
    phase: 'river_complete',
    blinds: { small: 5, big: 10 },
    pot: 0, // Pot awarded to Player4
    activePlayerCount: 4,
    communityCards: ['9♠', '4♦', '6♣', 'K♦', '3♠'],
    players: {
      Player1: { 
        id: 'Player1', chips: 95, position: 'SB', seat: 1, isActive: true, 
        holeCards: ['8♠', '3♦'], isEliminated: false, eliminated_round: null
      },
      Player2: { 
        id: 'Player2', chips: 90, position: 'BB', seat: 2, isActive: true, 
        holeCards: ['K♥', 'Q♠'], isEliminated: false, eliminated_round: null
      },
      Player3: { 
        id: 'Player3', chips: 0, position: 'UTG', seat: 3, isActive: false, 
        holeCards: ['7♣', '2♥'], isEliminated: true, eliminated_round: 1,
        eliminatedBy: 'Player4', eliminationHand: 'pair of tens'
      },
      Player4: { 
        id: 'Player4', chips: 215, position: 'CO', seat: 4, isActive: true, 
        holeCards: ['10♦', '10♣'], isEliminated: false, eliminated_round: null,
        winningHand: 'pair of tens'
      },
      Player5: { 
        id: 'Player5', chips: 100, position: 'BTN', seat: 5, isActive: true, 
        holeCards: ['A♥', 'Q♦'], isEliminated: false, eliminated_round: null
      }
    },
    gameHistory: [
      {
        id: 'GH-1',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'Small_Blind',
        amount: 5,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 1,
        timestamp: getFixedTimestamp(1)
      },
      {
        id: 'GH-2',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'Big_Blind',
        amount: 10,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 2,
        timestamp: getFixedTimestamp(2)
      },
      {
        id: 'GH-3',
        playerId: 'Player3',
        playerName: 'Player3',
        action: 'ALL_IN',
        amount: 100,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 3,
        timestamp: getFixedTimestamp(3)
      },
      {
        id: 'GH-4',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'CALL',
        amount: 100,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 4,
        timestamp: getFixedTimestamp(4)
      },
      {
        id: 'GH-5',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 5,
        timestamp: getFixedTimestamp(5)
      },
      {
        id: 'GH-6',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 6,
        timestamp: getFixedTimestamp(6)
      },
      {
        id: 'GH-7',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 1,
        actionSequence: 7,
        timestamp: getFixedTimestamp(7)
      },
      {
        id: 'GH-8',
        playerId: 'DEALER',
        playerName: 'Dealer',
        action: 'FLOP',
        amount: null,
        phase: 'flop',
        handNumber: 1,
        actionSequence: 8,
        timestamp: getFixedTimestamp(8),
        cards: ['9♠', '4♦', '6♣']
      },
      {
        id: 'GH-9',
        playerId: 'DEALER',
        playerName: 'Dealer',
        action: 'TURN',
        amount: null,
        phase: 'turn',
        handNumber: 1,
        actionSequence: 9,
        timestamp: getFixedTimestamp(9),
        cards: ['K♦']
      },
      {
        id: 'GH-10',
        playerId: 'DEALER',
        playerName: 'Dealer',
        action: 'RIVER',
        amount: null,
        phase: 'river',
        handNumber: 1,
        actionSequence: 10,
        timestamp: getFixedTimestamp(10),
        cards: ['3♠']
      },
      {
        id: 'GH-11',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'WINNER',
        amount: 215,
        phase: 'showdown',
        handNumber: 1,
        actionSequence: 11,
        timestamp: getFixedTimestamp(11),
        winningHand: 'pair of tens'
      },
      {
        id: 'GH-12',
        playerId: 'Player3',
        playerName: 'Player3',
        action: 'ELIMINATE',
        amount: 0,
        phase: 'elimination',
        handNumber: 1,
        actionSequence: 12,
        timestamp: getFixedTimestamp(12),
        eliminatedBy: 'Player4',
        eliminationRound: 1
      }
    ]
  },

  // ===== ROUND 2: $10/$20 BLINDS =====
  
  // Step 8: Round 2 Setup
  r2_setup: {
    phase: 'setup',
    blinds: { small: 10, big: 20 },
    pot: 0,
    activePlayerCount: 4,
    handNumber: 2,
    players: {
      Player1: { 
        id: 'Player1', chips: 95, position: 'UTG', seat: 1, isActive: true, 
        holeCards: ['5♦', '3♣'], isEliminated: false, eliminated_round: null
      },
      Player2: { 
        id: 'Player2', chips: 90, position: 'CO', seat: 2, isActive: true, 
        holeCards: ['A♣', '9♠'], isEliminated: false, eliminated_round: null
      },
      Player3: { 
        id: 'Player3', chips: 0, position: null, seat: 3, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 1
      },
      Player4: { 
        id: 'Player4', chips: 215, position: 'SB', seat: 4, isActive: true, 
        holeCards: ['J♥', '8♦'], isEliminated: false, eliminated_round: null
      },
      Player5: { 
        id: 'Player5', chips: 100, position: 'BB', seat: 5, isActive: true, 
        holeCards: ['8♣', '8♥'], isEliminated: false, eliminated_round: null
      }
    },
    gameHistory: [] // Previous round history maintained, new entries to be added
  },

  // Step 9: R2 Blinds Posted  
  r2_blinds_posted: {
    phase: 'preflop_blinds',
    blinds: { small: 10, big: 20 },
    pot: 30,
    activePlayerCount: 4,
    handNumber: 2,
    players: {
      Player1: { 
        id: 'Player1', chips: 95, position: 'UTG', seat: 1, isActive: true, 
        holeCards: ['5♦', '3♣'], isEliminated: false, eliminated_round: null,
        currentBet: 0, inPot: 0
      },
      Player2: { 
        id: 'Player2', chips: 90, position: 'CO', seat: 2, isActive: true, 
        holeCards: ['A♣', '9♠'], isEliminated: false, eliminated_round: null,
        currentBet: 0, inPot: 0
      },
      Player3: { 
        id: 'Player3', chips: 0, position: null, seat: 3, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 1
      },
      Player4: { 
        id: 'Player4', chips: 205, position: 'SB', seat: 4, isActive: true, 
        holeCards: ['J♥', '8♦'], isEliminated: false, eliminated_round: null,
        currentBet: 10, inPot: 10
      },
      Player5: { 
        id: 'Player5', chips: 80, position: 'BB', seat: 5, isActive: true, 
        holeCards: ['8♣', '8♥'], isEliminated: false, eliminated_round: null,
        currentBet: 20, inPot: 20
      }
    },
    gameHistory: [
      {
        id: 'GH-13',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'Small_Blind',
        amount: 10,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 13,
        timestamp: getFixedTimestamp(13)
      },
      {
        id: 'GH-14',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'Big_Blind',
        amount: 20,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 14,
        timestamp: getFixedTimestamp(14)
      }
    ]
  },

  // Step 10: Player1 All-in Push
  r2_player1_allin: {
    phase: 'preflop_betting',
    blinds: { small: 10, big: 20 },
    pot: 125,
    activePlayerCount: 4,
    handNumber: 2,
    players: {
      Player1: { 
        id: 'Player1', chips: 0, position: 'UTG', seat: 1, isActive: true, 
        holeCards: ['5♦', '3♣'], isEliminated: false, eliminated_round: null,
        currentBet: 95, inPot: 95, isAllIn: true
      },
      Player2: { 
        id: 'Player2', chips: 90, position: 'CO', seat: 2, isActive: true, 
        holeCards: ['A♣', '9♠'], isEliminated: false, eliminated_round: null,
        currentBet: 0, inPot: 0
      },
      Player3: { 
        id: 'Player3', chips: 0, position: null, seat: 3, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 1
      },
      Player4: { 
        id: 'Player4', chips: 205, position: 'SB', seat: 4, isActive: true, 
        holeCards: ['J♥', '8♦'], isEliminated: false, eliminated_round: null,
        currentBet: 10, inPot: 10
      },
      Player5: { 
        id: 'Player5', chips: 80, position: 'BB', seat: 5, isActive: true, 
        holeCards: ['8♣', '8♥'], isEliminated: false, eliminated_round: null,
        currentBet: 20, inPot: 20
      }
    },
    gameHistory: [
      {
        id: 'GH-13',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'Small_Blind',
        amount: 10,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 13,
        timestamp: getFixedTimestamp(13)
      },
      {
        id: 'GH-14',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'Big_Blind',
        amount: 20,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 14,
        timestamp: getFixedTimestamp(14)
      },
      {
        id: 'GH-15',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'ALL_IN',
        amount: 95,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 15,
        timestamp: getFixedTimestamp(15)
      }
    ]
  },

  // Step 11: Player2 Calls
  r2_player2_calls: {
    phase: 'preflop_betting',
    blinds: { small: 10, big: 20 },
    pot: 220,
    activePlayerCount: 4,
    handNumber: 2,
    players: {
      Player1: { 
        id: 'Player1', chips: 0, position: 'UTG', seat: 1, isActive: true, 
        holeCards: ['5♦', '3♣'], isEliminated: false, eliminated_round: null,
        currentBet: 95, inPot: 95, isAllIn: true
      },
      Player2: { 
        id: 'Player2', chips: 0, position: 'CO', seat: 2, isActive: true, 
        holeCards: ['A♣', '9♠'], isEliminated: false, eliminated_round: null,
        currentBet: 90, inPot: 90, isAllIn: true
      },
      Player3: { 
        id: 'Player3', chips: 0, position: null, seat: 3, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 1
      },
      Player4: { 
        id: 'Player4', chips: 205, position: 'SB', seat: 4, isActive: true, 
        holeCards: ['J♥', '8♦'], isEliminated: false, eliminated_round: null,
        currentBet: 10, inPot: 10
      },
      Player5: { 
        id: 'Player5', chips: 80, position: 'BB', seat: 5, isActive: true, 
        holeCards: ['8♣', '8♥'], isEliminated: false, eliminated_round: null,
        currentBet: 20, inPot: 20
      }
    },
    gameHistory: [
      {
        id: 'GH-13',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'Small_Blind',
        amount: 10,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 13,
        timestamp: getFixedTimestamp(13)
      },
      {
        id: 'GH-14',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'Big_Blind',
        amount: 20,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 14,
        timestamp: getFixedTimestamp(14)
      },
      {
        id: 'GH-15',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'ALL_IN',
        amount: 95,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 15,
        timestamp: getFixedTimestamp(15)
      },
      {
        id: 'GH-16',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'CALL',
        amount: 90,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 16,
        timestamp: getFixedTimestamp(16)
      }
    ]
  },

  // Step 12: Others Fold
  r2_others_fold: {
    phase: 'preflop_complete',
    blinds: { small: 10, big: 20 },
    pot: 200,
    activePlayerCount: 2, // Only Player1 and Player2 in showdown
    handNumber: 2,
    players: {
      Player1: { 
        id: 'Player1', chips: 0, position: 'UTG', seat: 1, isActive: true, 
        holeCards: ['5♦', '3♣'], isEliminated: false, eliminated_round: null,
        isAllIn: true, inPot: 95
      },
      Player2: { 
        id: 'Player2', chips: 0, position: 'CO', seat: 2, isActive: true, 
        holeCards: ['A♣', '9♠'], isEliminated: false, eliminated_round: null,
        isAllIn: true, inPot: 90
      },
      Player3: { 
        id: 'Player3', chips: 0, position: null, seat: 3, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 1
      },
      Player4: { 
        id: 'Player4', chips: 205, position: 'SB', seat: 4, isActive: true, 
        holeCards: ['J♥', '8♦'], isEliminated: false, eliminated_round: null,
        hasFolded: true
      },
      Player5: { 
        id: 'Player5', chips: 85, position: 'BB', seat: 5, isActive: true, 
        holeCards: ['8♣', '8♥'], isEliminated: false, eliminated_round: null,
        hasFolded: true
      }
    },
    gameHistory: [
      {
        id: 'GH-13',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'Small_Blind',
        amount: 10,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 13,
        timestamp: getFixedTimestamp(13)
      },
      {
        id: 'GH-14',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'Big_Blind',
        amount: 20,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 14,
        timestamp: getFixedTimestamp(14)
      },
      {
        id: 'GH-15',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'ALL_IN',
        amount: 95,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 15,
        timestamp: getFixedTimestamp(15)
      },
      {
        id: 'GH-16',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'CALL',
        amount: 90,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 16,
        timestamp: getFixedTimestamp(16)
      },
      {
        id: 'GH-17',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 17,
        timestamp: getFixedTimestamp(17)
      },
      {
        id: 'GH-18',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 18,
        timestamp: getFixedTimestamp(18)
      }
    ]
  },

  // Step 13: R2 Flop
  r2_flop: {
    phase: 'flop',
    blinds: { small: 10, big: 20 },
    pot: 200,
    activePlayerCount: 2,
    handNumber: 2,
    communityCards: ['A♦', 'Q♣', '3♠'],
    players: {
      Player1: { 
        id: 'Player1', chips: 0, position: 'UTG', seat: 1, isActive: true, 
        holeCards: ['5♦', '3♣'], isEliminated: false, eliminated_round: null,
        isAllIn: true, inPot: 95
      },
      Player2: { 
        id: 'Player2', chips: 0, position: 'CO', seat: 2, isActive: true, 
        holeCards: ['A♣', '9♠'], isEliminated: false, eliminated_round: null,
        isAllIn: true, inPot: 90
      },
      Player3: { 
        id: 'Player3', chips: 0, position: null, seat: 3, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 1
      },
      Player4: { 
        id: 'Player4', chips: 205, position: 'SB', seat: 4, isActive: true, 
        holeCards: ['J♥', '8♦'], isEliminated: false, eliminated_round: null,
        hasFolded: true
      },
      Player5: { 
        id: 'Player5', chips: 85, position: 'BB', seat: 5, isActive: true, 
        holeCards: ['8♣', '8♥'], isEliminated: false, eliminated_round: null,
        hasFolded: true
      }
    },
    gameHistory: [
      {
        id: 'GH-13',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'Small_Blind',
        amount: 10,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 13,
        timestamp: getFixedTimestamp(13)
      },
      {
        id: 'GH-14',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'Big_Blind',
        amount: 20,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 14,
        timestamp: getFixedTimestamp(14)
      },
      {
        id: 'GH-15',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'ALL_IN',
        amount: 95,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 15,
        timestamp: getFixedTimestamp(15)
      },
      {
        id: 'GH-16',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'CALL',
        amount: 90,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 16,
        timestamp: getFixedTimestamp(16)
      },
      {
        id: 'GH-17',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 17,
        timestamp: getFixedTimestamp(17)
      },
      {
        id: 'GH-18',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 18,
        timestamp: getFixedTimestamp(18)
      },
      {
        id: 'GH-19',
        playerId: 'DEALER',
        playerName: 'Dealer',
        action: 'FLOP',
        amount: null,
        phase: 'flop',
        handNumber: 2,
        actionSequence: 19,
        timestamp: getFixedTimestamp(19),
        cards: ['A♦', 'Q♣', '3♠']
      }
    ]
  },

  // Step 14: R2 Turn
  r2_turn: {
    phase: 'turn',
    blinds: { small: 10, big: 20 },
    pot: 200,
    activePlayerCount: 2,
    handNumber: 2,
    communityCards: ['A♦', 'Q♣', '3♠', '7♥'],
    players: {
      Player1: { 
        id: 'Player1', chips: 0, position: 'UTG', seat: 1, isActive: true, 
        holeCards: ['5♦', '3♣'], isEliminated: false, eliminated_round: null,
        isAllIn: true, inPot: 95
      },
      Player2: { 
        id: 'Player2', chips: 0, position: 'CO', seat: 2, isActive: true, 
        holeCards: ['A♣', '9♠'], isEliminated: false, eliminated_round: null,
        isAllIn: true, inPot: 90
      },
      Player3: { 
        id: 'Player3', chips: 0, position: null, seat: 3, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 1
      },
      Player4: { 
        id: 'Player4', chips: 205, position: 'SB', seat: 4, isActive: true, 
        holeCards: ['J♥', '8♦'], isEliminated: false, eliminated_round: null,
        hasFolded: true
      },
      Player5: { 
        id: 'Player5', chips: 85, position: 'BB', seat: 5, isActive: true, 
        holeCards: ['8♣', '8♥'], isEliminated: false, eliminated_round: null,
        hasFolded: true
      }
    },
    gameHistory: [
      {
        id: 'GH-13',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'Small_Blind',
        amount: 10,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 13,
        timestamp: getFixedTimestamp(13)
      },
      {
        id: 'GH-14',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'Big_Blind',
        amount: 20,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 14,
        timestamp: getFixedTimestamp(14)
      },
      {
        id: 'GH-15',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'ALL_IN',
        amount: 95,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 15,
        timestamp: getFixedTimestamp(15)
      },
      {
        id: 'GH-16',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'CALL',
        amount: 90,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 16,
        timestamp: getFixedTimestamp(16)
      },
      {
        id: 'GH-17',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 17,
        timestamp: getFixedTimestamp(17)
      },
      {
        id: 'GH-18',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 18,
        timestamp: getFixedTimestamp(18)
      },
      {
        id: 'GH-19',
        playerId: 'DEALER',
        playerName: 'Dealer',
        action: 'FLOP',
        amount: null,
        phase: 'flop',
        handNumber: 2,
        actionSequence: 19,
        timestamp: getFixedTimestamp(19),
        cards: ['A♦', 'Q♣', '3♠']
      },
      {
        id: 'GH-20',
        playerId: 'DEALER',
        playerName: 'Dealer',
        action: 'TURN',
        amount: null,
        phase: 'turn',
        handNumber: 2,
        actionSequence: 20,
        timestamp: getFixedTimestamp(20),
        cards: ['7♥']
      }
    ]
  },

  // Step 15: R2 River and Player1 Elimination
  r2_river_player1_eliminated: {
    phase: 'river_complete',
    blinds: { small: 10, big: 20 },
    pot: 0, // Pot awarded to Player2
    activePlayerCount: 3,
    handNumber: 2,
    communityCards: ['A♦', 'Q♣', '3♠', '7♥', '2♦'],
    players: {
      Player1: { 
        id: 'Player1', chips: 0, position: null, seat: 1, isActive: false, 
        holeCards: ['5♦', '3♣'], isEliminated: true, eliminated_round: 2,
        eliminatedBy: 'Player2', eliminationHand: 'pair of aces'
      },
      Player2: { 
        id: 'Player2', chips: 185, position: 'CO', seat: 2, isActive: true, 
        holeCards: ['A♣', '9♠'], isEliminated: false, eliminated_round: null,
        winningHand: 'pair of aces'
      },
      Player3: { 
        id: 'Player3', chips: 0, position: null, seat: 3, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 1
      },
      Player4: { 
        id: 'Player4', chips: 205, position: 'SB', seat: 4, isActive: true, 
        holeCards: ['J♥', '8♦'], isEliminated: false, eliminated_round: null
      },
      Player5: { 
        id: 'Player5', chips: 85, position: 'BB', seat: 5, isActive: true, 
        holeCards: ['8♣', '8♥'], isEliminated: false, eliminated_round: null
      }
    },
    gameHistory: [
      {
        id: 'GH-13',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'Small_Blind',
        amount: 10,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 13,
        timestamp: getFixedTimestamp(13)
      },
      {
        id: 'GH-14',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'Big_Blind',
        amount: 20,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 14,
        timestamp: getFixedTimestamp(14)
      },
      {
        id: 'GH-15',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'ALL_IN',
        amount: 95,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 15,
        timestamp: getFixedTimestamp(15)
      },
      {
        id: 'GH-16',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'CALL',
        amount: 90,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 16,
        timestamp: getFixedTimestamp(16)
      },
      {
        id: 'GH-17',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 17,
        timestamp: getFixedTimestamp(17)
      },
      {
        id: 'GH-18',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'FOLD',
        amount: 0,
        phase: 'preflop',
        handNumber: 2,
        actionSequence: 18,
        timestamp: getFixedTimestamp(18)
      },
      {
        id: 'GH-19',
        playerId: 'DEALER',
        playerName: 'Dealer',
        action: 'FLOP',
        amount: null,
        phase: 'flop',
        handNumber: 2,
        actionSequence: 19,
        timestamp: getFixedTimestamp(19),
        cards: ['A♦', 'Q♣', '3♠']
      },
      {
        id: 'GH-20',
        playerId: 'DEALER',
        playerName: 'Dealer',
        action: 'TURN',
        amount: null,
        phase: 'turn',
        handNumber: 2,
        actionSequence: 20,
        timestamp: getFixedTimestamp(20),
        cards: ['7♥']
      },
      {
        id: 'GH-21',
        playerId: 'DEALER',
        playerName: 'Dealer',
        action: 'RIVER',
        amount: null,
        phase: 'river',
        handNumber: 2,
        actionSequence: 21,
        timestamp: getFixedTimestamp(21),
        cards: ['2♦']
      },
      {
        id: 'GH-22',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'WINNER',
        amount: 200,
        phase: 'showdown',
        handNumber: 2,
        actionSequence: 22,
        timestamp: getFixedTimestamp(22),
        winningHand: 'pair of aces'
      },
      {
        id: 'GH-23',
        playerId: 'Player1',
        playerName: 'Player1',
        action: 'ELIMINATE',
        amount: 0,
        phase: 'elimination',
        handNumber: 2,
        actionSequence: 23,
        timestamp: getFixedTimestamp(23),
        eliminatedBy: 'Player2',
        eliminationRound: 2
      }
    ]
  },

  // ===== ROUND 3: $20/$40 BLINDS (FINAL TABLE) =====
  
  // Step 16: R3 Setup (Final 3 Players)
  r3_setup: {
    phase: 'setup',
    blinds: { small: 20, big: 40 },
    pot: 0,
    activePlayerCount: 3,
    handNumber: 3,
    players: {
      Player1: { 
        id: 'Player1', chips: 0, position: null, seat: 1, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 2
      },
      Player2: { 
        id: 'Player2', chips: 185, position: 'BTN', seat: 2, isActive: true, 
        holeCards: ['K♦', 'J♠'], isEliminated: false, eliminated_round: null
      },
      Player3: { 
        id: 'Player3', chips: 0, position: null, seat: 3, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 1
      },
      Player4: { 
        id: 'Player4', chips: 205, position: 'SB', seat: 4, isActive: true, 
        holeCards: ['Q♥', '10♣'], isEliminated: false, eliminated_round: null
      },
      Player5: { 
        id: 'Player5', chips: 85, position: 'BB', seat: 5, isActive: true, 
        holeCards: ['9♠', '9♦'], isEliminated: false, eliminated_round: null
      }
    },
    gameHistory: [] // Previous rounds maintained, new entries to be added
  },

  // Step 17: R3 Blinds Posted
  r3_blinds_posted: {
    phase: 'preflop_blinds',
    blinds: { small: 20, big: 40 },
    pot: 60,
    activePlayerCount: 3,
    handNumber: 3,
    players: {
      Player1: { 
        id: 'Player1', chips: 0, position: null, seat: 1, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 2
      },
      Player2: { 
        id: 'Player2', chips: 185, position: 'BTN', seat: 2, isActive: true, 
        holeCards: ['K♦', 'J♠'], isEliminated: false, eliminated_round: null,
        currentBet: 0, inPot: 0
      },
      Player3: { 
        id: 'Player3', chips: 0, position: null, seat: 3, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 1
      },
      Player4: { 
        id: 'Player4', chips: 185, position: 'SB', seat: 4, isActive: true, 
        holeCards: ['Q♥', '10♣'], isEliminated: false, eliminated_round: null,
        currentBet: 20, inPot: 20
      },
      Player5: { 
        id: 'Player5', chips: 45, position: 'BB', seat: 5, isActive: true, 
        holeCards: ['9♠', '9♦'], isEliminated: false, eliminated_round: null,
        currentBet: 40, inPot: 40
      }
    },
    gameHistory: [
      {
        id: 'GH-24',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'Small_Blind',
        amount: 20,
        phase: 'preflop',
        handNumber: 3,
        actionSequence: 24,
        timestamp: getFixedTimestamp(24)
      },
      {
        id: 'GH-25',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'Big_Blind',
        amount: 40,
        phase: 'preflop',
        handNumber: 3,
        actionSequence: 25,
        timestamp: getFixedTimestamp(25)
      }
    ]
  },

  // Step 18: Player2 Raises
  r3_player2_raises: {
    phase: 'preflop_betting',
    blinds: { small: 20, big: 40 },
    pot: 180,
    activePlayerCount: 3,
    handNumber: 3,
    players: {
      Player1: { 
        id: 'Player1', chips: 0, position: null, seat: 1, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 2
      },
      Player2: { 
        id: 'Player2', chips: 65, position: 'BTN', seat: 2, isActive: true, 
        holeCards: ['K♦', 'J♠'], isEliminated: false, eliminated_round: null,
        currentBet: 120, inPot: 120
      },
      Player3: { 
        id: 'Player3', chips: 0, position: null, seat: 3, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 1
      },
      Player4: { 
        id: 'Player4', chips: 185, position: 'SB', seat: 4, isActive: true, 
        holeCards: ['Q♥', '10♣'], isEliminated: false, eliminated_round: null,
        currentBet: 20, inPot: 20
      },
      Player5: { 
        id: 'Player5', chips: 45, position: 'BB', seat: 5, isActive: true, 
        holeCards: ['9♠', '9♦'], isEliminated: false, eliminated_round: null,
        currentBet: 40, inPot: 40
      }
    },
    gameHistory: [
      {
        id: 'GH-24',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'Small_Blind',
        amount: 20,
        phase: 'preflop',
        handNumber: 3,
        actionSequence: 24,
        timestamp: getFixedTimestamp(24)
      },
      {
        id: 'GH-25',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'Big_Blind',
        amount: 40,
        phase: 'preflop',
        handNumber: 3,
        actionSequence: 25,
        timestamp: getFixedTimestamp(25)
      },
      {
        id: 'GH-26',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'RAISE',
        amount: 120,
        phase: 'preflop',
        handNumber: 3,
        actionSequence: 26,
        timestamp: getFixedTimestamp(26)
      }
    ]
  },

  // Step 19: All Call Championship
  r3_all_call_championship: {
    phase: 'preflop_complete',
    blinds: { small: 20, big: 40 },
    pot: 360,
    activePlayerCount: 3,
    handNumber: 3,
    players: {
      Player1: { 
        id: 'Player1', chips: 0, position: null, seat: 1, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 2
      },
      Player2: { 
        id: 'Player2', chips: 65, position: 'BTN', seat: 2, isActive: true, 
        holeCards: ['K♦', 'J♠'], isEliminated: false, eliminated_round: null,
        currentBet: 120, inPot: 120
      },
      Player3: { 
        id: 'Player3', chips: 0, position: null, seat: 3, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 1
      },
      Player4: { 
        id: 'Player4', chips: 85, position: 'SB', seat: 4, isActive: true, 
        holeCards: ['Q♥', '10♣'], isEliminated: false, eliminated_round: null,
        currentBet: 120, inPot: 120
      },
      Player5: { 
        id: 'Player5', chips: 0, position: 'BB', seat: 5, isActive: true, 
        holeCards: ['9♠', '9♦'], isEliminated: false, eliminated_round: null,
        currentBet: 85, inPot: 85, isAllIn: true // Only had 85 chips left after big blind
      }
    },
    gameHistory: [
      {
        id: 'GH-24',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'Small_Blind',
        amount: 20,
        phase: 'preflop',
        handNumber: 3,
        actionSequence: 24,
        timestamp: getFixedTimestamp(24)
      },
      {
        id: 'GH-25',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'Big_Blind',
        amount: 40,
        phase: 'preflop',
        handNumber: 3,
        actionSequence: 25,
        timestamp: getFixedTimestamp(25)
      },
      {
        id: 'GH-26',
        playerId: 'Player2',
        playerName: 'Player2',
        action: 'RAISE',
        amount: 120,
        phase: 'preflop',
        handNumber: 3,
        actionSequence: 26,
        timestamp: getFixedTimestamp(26)
      },
      {
        id: 'GH-27',
        playerId: 'Player4',
        playerName: 'Player4',
        action: 'CALL',
        amount: 100,
        phase: 'preflop',
        handNumber: 3,
        actionSequence: 27,
        timestamp: getFixedTimestamp(27)
      },
      {
        id: 'GH-28',
        playerId: 'Player5',
        playerName: 'Player5',
        action: 'ALL_IN',
        amount: 45,
        phase: 'preflop',
        handNumber: 3,
        actionSequence: 28,
        timestamp: getFixedTimestamp(28)
      }
    ]
  },

  // ===== CHAMPIONSHIP FINAL STAGES =====
  
  // Final steps would continue with flop, turn, river, and Player2 winning...
  // For brevity, showing the final championship state
  
  championship_complete: {
    phase: 'tournament_complete',
    blinds: { small: 20, big: 40 },
    pot: 0,
    activePlayerCount: 1,
    handNumber: 3,
    communityCards: ['7♠', 'J♣', '4♦', '8♥', 'J♥'],
    tournamentWinner: 'Player2',
    finalStandings: [
      { place: 1, player: 'Player2', chips: 500, prize: 'Champion' },
      { place: 2, player: 'Player4', chips: 0, eliminated_round: 3 },
      { place: 3, player: 'Player5', chips: 0, eliminated_round: 3 },
      { place: 4, player: 'Player1', chips: 0, eliminated_round: 2 },
      { place: 5, player: 'Player3', chips: 0, eliminated_round: 1 }
    ],
    players: {
      Player1: { 
        id: 'Player1', chips: 0, position: null, seat: 1, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 2, finalPlace: 4
      },
      Player2: { 
        id: 'Player2', chips: 500, position: 'CHAMPION', seat: 2, isActive: true, 
        holeCards: ['K♦', 'J♠'], isEliminated: false, eliminated_round: null,
        finalPlace: 1, isChampion: true, winningHand: 'three jacks'
      },
      Player3: { 
        id: 'Player3', chips: 0, position: null, seat: 3, isActive: false, 
        holeCards: null, isEliminated: true, eliminated_round: 1, finalPlace: 5
      },
      Player4: { 
        id: 'Player4', chips: 0, position: null, seat: 4, isActive: false, 
        holeCards: ['Q♥', '10♣'], isEliminated: true, eliminated_round: 3, finalPlace: 2
      },
      Player5: { 
        id: 'Player5', chips: 0, position: null, seat: 5, isActive: false, 
        holeCards: ['9♠', '9♦'], isEliminated: true, eliminated_round: 3, finalPlace: 3
      }
    }
  }
};

/**
 * Helper Functions for Data Access
 */

// Get player state at specific game step
function getPlayerStateAtStep(step, playerId) {
  const stepData = TOURNAMENT_GAME_DATA[step];
  if (!stepData || !stepData.players[playerId]) {
    return null;
  }
  return {
    ...stepData.players[playerId],
    gamePhase: stepData.phase,
    blinds: stepData.blinds,
    pot: stepData.pot,
    activePlayerCount: stepData.activePlayerCount,
    communityCards: stepData.communityCards || []
  };
}

// Get all active players at specific step
function getActivePlayersAtStep(step) {
  const stepData = TOURNAMENT_GAME_DATA[step];
  if (!stepData) return [];
  
  return Object.values(stepData.players).filter(player => player.isActive);
}

// Get game history up to specific step
function getGameHistoryAtStep(step) {
  const stepData = TOURNAMENT_GAME_DATA[step];
  return stepData ? stepData.gameHistory : [];
}

// Get all available game steps
function getAllGameSteps() {
  return Object.keys(TOURNAMENT_GAME_DATA);
}

module.exports = {
  TOURNAMENT_GAME_DATA,
  getPlayerStateAtStep,
  getActivePlayersAtStep, 
  getGameHistoryAtStep,
  getAllGameSteps,
  getFixedTimestamp
};