import { SeatManager } from '../services/seatManager';
import { Player } from '../types/shared';

describe('SeatManager', () => {
  let seatManager: SeatManager;

  beforeEach(() => {
    seatManager = new SeatManager(6); // 6-seat table for testing
  });

  describe('Seat Assignment', () => {
    it('should assign a specific seat when requested', () => {
      const result = seatManager.assignSeat('player1', 3);
      expect(result.success).toBe(true);
      expect(result.seatNumber).toBe(3);
      expect(seatManager.isPlayerSeated('player1')).toBe(true);
      expect(seatManager.getPlayerSeat('player1')).toBe(3);
    });

    it('should assign first available seat when no specific seat requested', () => {
      const result = seatManager.assignSeat('player1');
      expect(result.success).toBe(true);
      expect(result.seatNumber).toBe(1); // First seat
      expect(seatManager.isPlayerSeated('player1')).toBe(true);
    });

    it('should reject assignment to occupied seat', () => {
      seatManager.assignSeat('player1', 2);
      const result = seatManager.assignSeat('player2', 2);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Seat is already occupied');
    });

    it('should reject invalid seat numbers', () => {
      const result1 = seatManager.assignSeat('player1', 0);
      const result2 = seatManager.assignSeat('player1', 7);
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result1.error).toBe('Invalid seat number');
      expect(result2.error).toBe('Invalid seat number');
    });

    it('should return error when table is full', () => {
      // Fill all seats
      for (let i = 1; i <= 6; i++) {
        seatManager.assignSeat(`player${i}`, i);
      }
      
      const result = seatManager.assignSeat('player7');
      expect(result.success).toBe(false);
      expect(result.error).toBe('No available seats');
    });
  });

  describe('Seat Removal', () => {
    it('should allow player to leave seat', () => {
      seatManager.assignSeat('player1', 3);
      const result = seatManager.leaveSeat('player1');
      
      expect(result.success).toBe(true);
      expect(result.seatNumber).toBe(3);
      expect(seatManager.isPlayerSeated('player1')).toBe(false);
      expect(seatManager.getPlayerSeat('player1')).toBe(null);
    });

    it('should return error when player not found', () => {
      const result = seatManager.leaveSeat('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Player not found in any seat');
    });
  });

  describe('Seat Reservation', () => {
    it('should reserve an available seat', () => {
      const result = seatManager.reserveSeat(4, 'player1', 2);
      expect(result.success).toBe(true);
      
      const seatInfo = seatManager.getSeatInfo(4);
      expect(seatInfo?.isReserved).toBe(true);
      expect(seatInfo?.reservedBy).toBe('player1');
    });

    it('should reject reservation of occupied seat', () => {
      seatManager.assignSeat('player1', 4);
      const result = seatManager.reserveSeat(4, 'player2', 2);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Seat is not available for reservation');
    });

    it('should auto-expire reservations', (done) => {
      seatManager.reserveSeat(4, 'player1', 0.01); // 0.01 minutes = 600ms
      
      const seatInfo = seatManager.getSeatInfo(4);
      expect(seatInfo?.isReserved).toBe(true);
      
      setTimeout(() => {
        const updatedSeatInfo = seatManager.getSeatInfo(4);
        expect(updatedSeatInfo?.isReserved).toBe(false);
        expect(updatedSeatInfo?.reservedBy).toBeUndefined();
        done();
      }, 700);
    });
  });

  describe('Turn Management', () => {
    let players: Player[];

    beforeEach(() => {
      // Create test players and assign them to seats
      players = [
        { id: 'p1', name: 'Player1', seatNumber: 1, position: 0, chips: 1000, currentBet: 0, isDealer: false, isAway: false, isActive: true, cards: [], avatar: { type: 'default', color: '#000' } },
        { id: 'p2', name: 'Player2', seatNumber: 3, position: 1, chips: 1000, currentBet: 0, isDealer: false, isAway: false, isActive: true, cards: [], avatar: { type: 'default', color: '#000' } },
        { id: 'p3', name: 'Player3', seatNumber: 5, position: 2, chips: 1000, currentBet: 0, isDealer: false, isAway: false, isActive: true, cards: [], avatar: { type: 'default', color: '#000' } }
      ];

      // Assign seats for all players
      players.forEach(player => {
        seatManager.assignSeat(player.id, player.seatNumber);
      });
    });

    it('should calculate turn order based on seat numbers', () => {
      const turnOrder = seatManager.calculateTurnOrder(players);
      
      expect(turnOrder).toHaveLength(3);
      expect(turnOrder[0].seatNumber).toBe(1);
      expect(turnOrder[1].seatNumber).toBe(3);
      expect(turnOrder[2].seatNumber).toBe(5);
      expect(turnOrder[0].playerId).toBe('p1');
      expect(turnOrder[1].playerId).toBe('p2');
      expect(turnOrder[2].playerId).toBe('p3');
    });

    it('should get next player in turn order', () => {
      const nextPlayer = seatManager.getNextPlayer('p1', players);
      expect(nextPlayer).toBe('p2');
      
      const nextAfterP2 = seatManager.getNextPlayer('p2', players);
      expect(nextAfterP2).toBe('p3');
      
      const nextAfterP3 = seatManager.getNextPlayer('p3', players);
      expect(nextAfterP3).toBe('p1'); // Wraps around
    });

    it('should handle player folding in turn order', () => {
      // Fold player 2
      players[1].isActive = false;
      
      const nextPlayer = seatManager.getNextPlayer('p1', players);
      expect(nextPlayer).toBe('p3'); // Skip folded player
    });

    it('should return null when only one or no active players', () => {
      players.forEach(p => p.isActive = false);
      players[0].isActive = true; // Only one active
      
      const nextPlayer = seatManager.getNextPlayer('p1', players);
      expect(nextPlayer).toBe(null);
    });
  });

  describe('Dealer and Blind Management', () => {
    let players: Player[];

    beforeEach(() => {
      players = [
        { id: 'p1', name: 'Player1', seatNumber: 1, position: 0, chips: 1000, currentBet: 0, isDealer: false, isAway: false, isActive: true, cards: [], avatar: { type: 'default', color: '#000' } },
        { id: 'p2', name: 'Player2', seatNumber: 2, position: 1, chips: 1000, currentBet: 0, isDealer: false, isAway: false, isActive: true, cards: [], avatar: { type: 'default', color: '#000' } },
        { id: 'p3', name: 'Player3', seatNumber: 3, position: 2, chips: 1000, currentBet: 0, isDealer: false, isAway: false, isActive: true, cards: [], avatar: { type: 'default', color: '#000' } }
      ];

      players.forEach(player => {
        seatManager.assignSeat(player.id, player.seatNumber);
      });
    });

    it('should move dealer button correctly', () => {
      expect(seatManager.getDealerPosition()).toBe(0);
      
      const move1 = seatManager.moveDealer(players);
      expect(move1.oldDealerPosition).toBe(0);
      expect(move1.newDealerPosition).toBe(1);
      expect(seatManager.getDealerPosition()).toBe(1);
      
      const move2 = seatManager.moveDealer(players);
      expect(move2.newDealerPosition).toBe(2);
    });

    it('should calculate blind positions for 3+ players', () => {
      seatManager.setDealerPosition(0);
      const blinds = seatManager.getBlindPositions(players);
      
      expect(blinds.smallBlind).toBe(1); // Left of dealer
      expect(blinds.bigBlind).toBe(2);   // Left of small blind
    });

    it('should handle heads-up blind positions', () => {
      const headsUpPlayers = players.slice(0, 2);
      headsUpPlayers.forEach(player => {
        seatManager.assignSeat(player.id, player.seatNumber);
      });
      
      seatManager.setDealerPosition(0);
      const blinds = seatManager.getBlindPositions(headsUpPlayers);
      
      expect(blinds.smallBlind).toBe(0); // Dealer is small blind in heads-up
      expect(blinds.bigBlind).toBe(1);
    });

    it('should determine first to act pre-flop', () => {
      seatManager.setDealerPosition(0);
      const firstToAct = seatManager.getFirstToAct(players, true);
      
      // First to act pre-flop is left of big blind (position 0 in 3-player game)
      expect(firstToAct).toBe('p1');
    });

    it('should determine first to act post-flop', () => {
      seatManager.setDealerPosition(0);
      const firstToAct = seatManager.getFirstToAct(players, false);
      
      // First to act post-flop is left of dealer (position 1)
      expect(firstToAct).toBe('p2');
    });

    it('should throw error for insufficient players for blinds', () => {
      const singlePlayer = [players[0]];
      expect(() => {
        seatManager.getBlindPositions(singlePlayer);
      }).toThrow('Not enough players for blinds');
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      seatManager.assignSeat('player1', 2);
      seatManager.assignSeat('player2', 4);
      seatManager.reserveSeat(1, 'player3');
    });

    it('should return all seats with correct status', () => {
      const allSeats = seatManager.getAllSeats();
      expect(allSeats).toHaveLength(6);
      
      const seat1 = allSeats.find(s => s.seatNumber === 1);
      const seat2 = allSeats.find(s => s.seatNumber === 2);
      const seat3 = allSeats.find(s => s.seatNumber === 3);
      
      expect(seat1?.isReserved).toBe(true);
      expect(seat2?.isOccupied).toBe(true);
      expect(seat3?.isOccupied).toBe(false);
      expect(seat3?.isReserved).toBe(false);
    });

    it('should return only occupied seats', () => {
      const occupiedSeats = seatManager.getOccupiedSeats();
      expect(occupiedSeats).toHaveLength(2);
      expect(occupiedSeats.map(s => s.seatNumber)).toContain(2);
      expect(occupiedSeats.map(s => s.seatNumber)).toContain(4);
    });

    it('should return list of active players', () => {
      const activePlayers = seatManager.getActivePlayers();
      expect(activePlayers).toHaveLength(2);
      expect(activePlayers).toContain('player1');
      expect(activePlayers).toContain('player2');
    });

    it('should reset all state', () => {
      seatManager.reset();
      
      expect(seatManager.getOccupiedSeats()).toHaveLength(0);
      expect(seatManager.getActivePlayers()).toHaveLength(0);
      expect(seatManager.getDealerPosition()).toBe(0);
      expect(seatManager.isPlayerSeated('player1')).toBe(false);
    });
  });
}); 