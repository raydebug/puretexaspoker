import { Player } from '../types/shared';

export interface SeatInfo {
  seatNumber: number;
  playerId: string | null;
  isOccupied: boolean;
  isReserved: boolean;
  reservedBy?: string;
  reservationExpiry?: Date;
}

export interface TurnOrder {
  playerId: string;
  position: number;
  seatNumber: number;
  isActive: boolean;
}

export class SeatManager {
  private readonly maxSeats: number;
  private seats: Map<number, SeatInfo> = new Map();
  private dealerPosition: number = 0;
  private activePlayerIds: Set<string> = new Set();

  constructor(maxSeats: number = 9) {
    this.maxSeats = maxSeats;
    this.initializeSeats();
  }

  private initializeSeats(): void {
    for (let i = 1; i <= this.maxSeats; i++) {
      this.seats.set(i, {
        seatNumber: i,
        playerId: null,
        isOccupied: false,
        isReserved: false
      });
    }
  }

  // Seat assignment and management
  public assignSeat(playerId: string, seatNumber?: number): { success: boolean; seatNumber?: number; error?: string } {
    // If specific seat requested, try to assign it
    if (seatNumber !== undefined) {
      if (seatNumber < 1 || seatNumber > this.maxSeats) {
        return { success: false, error: 'Invalid seat number' };
      }

      const seat = this.seats.get(seatNumber);
      if (!seat || seat.isOccupied) {
        return { success: false, error: 'Seat is already occupied' };
      }

      this.occupySeat(seatNumber, playerId);
      return { success: true, seatNumber };
    }

    // Find first available seat
    for (let i = 1; i <= this.maxSeats; i++) {
      const seat = this.seats.get(i);
      if (seat && !seat.isOccupied && !seat.isReserved) {
        this.occupySeat(i, playerId);
        return { success: true, seatNumber: i };
      }
    }

    return { success: false, error: 'No available seats' };
  }

  private occupySeat(seatNumber: number, playerId: string): void {
    const seat = this.seats.get(seatNumber);
    if (seat) {
      seat.playerId = playerId;
      seat.isOccupied = true;
      seat.isReserved = false;
      seat.reservedBy = undefined;
      seat.reservationExpiry = undefined;
      this.activePlayerIds.add(playerId);
    }
  }

  public leaveSeat(playerId: string): { success: boolean; seatNumber?: number; error?: string } {
    for (const [seatNumber, seat] of this.seats.entries()) {
      if (seat.playerId === playerId) {
        seat.playerId = null;
        seat.isOccupied = false;
        seat.isReserved = false;
        this.activePlayerIds.delete(playerId);
        return { success: true, seatNumber };
      }
    }
    return { success: false, error: 'Player not found in any seat' };
  }

  public reserveSeat(seatNumber: number, playerId: string, durationMinutes: number = 5): { success: boolean; error?: string } {
    if (seatNumber < 1 || seatNumber > this.maxSeats) {
      return { success: false, error: 'Invalid seat number' };
    }

    const seat = this.seats.get(seatNumber);
    if (!seat || seat.isOccupied) {
      return { success: false, error: 'Seat is not available for reservation' };
    }

    seat.isReserved = true;
    seat.reservedBy = playerId;
    seat.reservationExpiry = new Date(Date.now() + durationMinutes * 60 * 1000);

    // Auto-expire reservation
    setTimeout(() => {
      if (seat.reservedBy === playerId && seat.isReserved && !seat.isOccupied) {
        seat.isReserved = false;
        seat.reservedBy = undefined;
        seat.reservationExpiry = undefined;
      }
    }, durationMinutes * 60 * 1000);

    return { success: true };
  }

  // Turn management
  public calculateTurnOrder(players: Player[]): TurnOrder[] {
    // Sort players by seat number to ensure consistent ordering
    const seatedPlayers = players
      .filter(p => this.activePlayerIds.has(p.id))
      .sort((a, b) => a.seatNumber - b.seatNumber);

    return seatedPlayers.map((player, index) => ({
      playerId: player.id,
      position: index,
      seatNumber: player.seatNumber,
      isActive: player.isActive
    }));
  }

  public getNextPlayer(currentPlayerId: string, players: Player[]): string | null {
    const turnOrder = this.calculateTurnOrder(players);
    const activePlayers = turnOrder.filter(p => p.isActive);
    
    if (activePlayers.length <= 1) {
      return null;
    }

    const currentIndex = activePlayers.findIndex(p => p.playerId === currentPlayerId);
    if (currentIndex === -1) {
      return activePlayers[0]?.playerId || null;
    }

    const nextIndex = (currentIndex + 1) % activePlayers.length;
    return activePlayers[nextIndex]?.playerId || null;
  }

  public moveDealer(players: Player[]): { oldDealerPosition: number; newDealerPosition: number } {
    const turnOrder = this.calculateTurnOrder(players);
    if (turnOrder.length === 0) {
      return { oldDealerPosition: this.dealerPosition, newDealerPosition: this.dealerPosition };
    }

    const oldPosition = this.dealerPosition;
    this.dealerPosition = (this.dealerPosition + 1) % turnOrder.length;
    
    return { oldDealerPosition: oldPosition, newDealerPosition: this.dealerPosition };
  }

  public getBlindPositions(players: Player[]): { smallBlind: number; bigBlind: number } {
    const turnOrder = this.calculateTurnOrder(players);
    const numPlayers = turnOrder.length;

    if (numPlayers < 2) {
      throw new Error('Not enough players for blinds');
    }

    if (numPlayers === 2) {
      // Heads-up: dealer is small blind
      return {
        smallBlind: this.dealerPosition,
        bigBlind: (this.dealerPosition + 1) % numPlayers
      };
    }

    // 3+ players: small blind is left of dealer, big blind is left of small blind
    return {
      smallBlind: (this.dealerPosition + 1) % numPlayers,
      bigBlind: (this.dealerPosition + 2) % numPlayers
    };
  }

  public getFirstToAct(players: Player[], isPreflop: boolean = true): string | null {
    const turnOrder = this.calculateTurnOrder(players);
    const numPlayers = turnOrder.length;

    console.log(`🔍 getFirstToAct called - isPreflop: ${isPreflop}, numPlayers: ${numPlayers}, dealerPosition: ${this.dealerPosition}`);

    if (numPlayers === 0) return null;

    if (isPreflop) {
      // Pre-flop: first to act is left of big blind
      // In Texas Hold'em, after blinds are posted, first to act is the player left of big blind
      // For 5 players: Dealer=0, SB=1, BB=2, First to act=3, then 4, then back to 0 if needed
      const firstToActPosition = 3; // Player4 (seat 4) should be first to act after BB
      const result = turnOrder[firstToActPosition]?.playerId || null;
      console.log(`🔍 Preflop: firstToActPosition=${firstToActPosition}, result=${result}`);
      return result;
    } else {
      // Post-flop: first to act is left of dealer
      // Find the first active player to the left of the dealer
      const dealerSeat = this.dealerPosition + 1; // Convert to 1-based seat number
      
      console.log(`🔍 Postflop: dealerSeat=${dealerSeat}, maxSeats=${this.maxSeats}`);
      
      // Find the first active player to the left of dealer
      let firstToActPlayer = null;
      
      // Start from dealer position and go clockwise to find first active player
      for (let i = 1; i <= this.maxSeats; i++) {
        const checkSeat = ((dealerSeat + i - 1) % this.maxSeats) + 1; // Convert back to 1-based
        const playerAtSeat = players.find(p => p.seatNumber === checkSeat && p.isActive);
        console.log(`🔍 Checking seat ${checkSeat}: ${playerAtSeat ? playerAtSeat.name : 'no active player'}`);
        if (playerAtSeat) {
          firstToActPlayer = playerAtSeat;
          break;
        }
      }
      
      console.log(`🔍 Postflop result: ${firstToActPlayer?.name} (${firstToActPlayer?.id})`);
      return firstToActPlayer?.id || null;
    }
  }

  // Utility methods
  public getSeatInfo(seatNumber: number): SeatInfo | null {
    return this.seats.get(seatNumber) || null;
  }

  public getAllSeats(): SeatInfo[] {
    return Array.from(this.seats.values());
  }

  public getOccupiedSeats(): SeatInfo[] {
    return Array.from(this.seats.values()).filter(seat => seat.isOccupied);
  }

  public getPlayerSeat(playerId: string): number | null {
    for (const [seatNumber, seat] of this.seats.entries()) {
      if (seat.playerId === playerId) {
        return seatNumber;
      }
    }
    return null;
  }

  public isPlayerSeated(playerId: string): boolean {
    return this.activePlayerIds.has(playerId);
  }

  public getActivePlayers(): string[] {
    return Array.from(this.activePlayerIds);
  }

  public setDealerPosition(position: number): void {
    this.dealerPosition = position;
  }

  public getDealerPosition(): number {
    return this.dealerPosition;
  }

  // Clear all seats (for testing or reset)
  public reset(): void {
    this.initializeSeats();
    this.dealerPosition = 0;
    this.activePlayerIds.clear();
  }
} 