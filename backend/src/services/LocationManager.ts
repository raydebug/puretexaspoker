import { prisma } from '../db';

/**
 * Location Manager - Tracks user locations using table/seat attributes
 * 
 * Location logic:
 * - table: null, seat: null → user is in lobby
 * - table: X, seat: null → user is observing table X  
 * - table: X, seat: Y → user is playing at table X, seat Y
 */

export interface UserLocation {
  playerId: string;
  nickname: string;
  table: number | null;
  seat: number | null;
  updatedAt: Date;
}

export class LocationManager {
  private static instance: LocationManager;
  
  // In-memory cache for real-time location tracking
  private userLocations = new Map<string, UserLocation>();

  private constructor() {}

  static getInstance(): LocationManager {
    if (!LocationManager.instance) {
      LocationManager.instance = new LocationManager();
    }
    return LocationManager.instance;
  }

  /**
   * Update user location both in memory and database
   */
  async updateUserLocation(playerId: string, nickname: string, table: number | null, seat: number | null = null): Promise<void> {
    console.log(`LocationManager: Updating ${nickname} (${playerId}) to table: ${table}, seat: ${seat}`);
    
    const userLocation: UserLocation = {
      playerId,
      nickname,
      table,
      seat,
      updatedAt: new Date()
    };

    // Update in-memory cache
    this.userLocations.set(playerId, userLocation);

    // Update database
    try {
      await prisma.player.update({
        where: { id: playerId },
        data: { table, seat }
      });
      console.log(`LocationManager: Successfully updated ${nickname} location in database`);
    } catch (error) {
      console.error(`LocationManager: Failed to update ${nickname} location in database:`, error);
      // Remove from cache if database update failed
      this.userLocations.delete(playerId);
      throw error;
    }
  }

  /**
   * Move user to lobby (table: null, seat: null)
   */
  async moveToLobby(playerId: string, nickname: string): Promise<void> {
    return this.updateUserLocation(playerId, nickname, null, null);
  }

  /**
   * Move user to observe a table (table: X, seat: null)
   */
  async moveToTableObserver(playerId: string, nickname: string, tableId: number): Promise<void> {
    return this.updateUserLocation(playerId, nickname, tableId, null);
  }

  /**
   * Move user to a seat at a table (table: X, seat: Y)
   */
  async moveToTableSeat(playerId: string, nickname: string, tableId: number, seatNumber: number): Promise<void> {
    return this.updateUserLocation(playerId, nickname, tableId, seatNumber);
  }

  /**
   * Get user's current location
   */
  getUserLocation(playerId: string): UserLocation | null {
    return this.userLocations.get(playerId) || null;
  }

  /**
   * Get all users in lobby (table: null)
   */
  getUsersInLobby(): UserLocation[] {
    return Array.from(this.userLocations.values())
      .filter(user => user.table === null);
  }

  /**
   * Get all users observing a specific table (table: X, seat: null)
   */
  getObserversAtTable(tableId: number): UserLocation[] {
    return Array.from(this.userLocations.values())
      .filter(user => user.table === tableId && user.seat === null);
  }

  /**
   * Get all users seated at a specific table (table: X, seat: not null)
   */
  getPlayersAtTable(tableId: number): UserLocation[] {
    return Array.from(this.userLocations.values())
      .filter(user => user.table === tableId && user.seat !== null);
  }

  /**
   * Get all users at a specific table (both observers and players)
   */
  getAllUsersAtTable(tableId: number): UserLocation[] {
    return Array.from(this.userLocations.values())
      .filter(user => user.table === tableId);
  }

  /**
   * Check if user is in lobby
   */
  isUserInLobby(playerId: string): boolean {
    const location = this.getUserLocation(playerId);
    return location ? location.table === null : true;
  }

  /**
   * Check if user is observing a table
   */
  isUserObservingTable(playerId: string, tableId?: number): boolean {
    const location = this.getUserLocation(playerId);
    if (!location) return false;
    
    const isObserving = location.table !== null && location.seat === null;
    if (tableId !== undefined) {
      return isObserving && location.table === tableId;
    }
    return isObserving;
  }

  /**
   * Check if user is playing at a table
   */
  isUserPlayingAtTable(playerId: string, tableId?: number): boolean {
    const location = this.getUserLocation(playerId);
    if (!location) return false;
    
    const isPlaying = location.table !== null && location.seat !== null;
    if (tableId !== undefined) {
      return isPlaying && location.table === tableId;
    }
    return isPlaying;
  }

  /**
   * Get user's current table (if any)
   */
  getUserTable(playerId: string): number | null {
    const location = this.getUserLocation(playerId);
    return location ? location.table : null;
  }

  /**
   * Get user's current seat (if any)
   */
  getUserSeat(playerId: string): number | null {
    const location = this.getUserLocation(playerId);
    return location ? location.seat : null;
  }

  /**
   * Remove user from location tracking (when they disconnect)
   */
  removeUser(playerId: string): void {
    const user = this.userLocations.get(playerId);
    if (user) {
      console.log(`LocationManager: Removing ${user.nickname} from location tracking`);
      this.userLocations.delete(playerId);
    }
  }

  /**
   * Get location display string for logging/debugging
   */
  getLocationDisplay(playerId: string): string {
    const location = this.getUserLocation(playerId);
    if (!location) return 'unknown';
    
    if (location.table === null) return 'lobby';
    if (location.seat === null) return `table-${location.table} (observer)`;
    return `table-${location.table} seat-${location.seat}`;
  }

  /**
   * Get summary of all locations for debugging
   */
  getLocationSummary(): { [locationKey: string]: string[] } {
    const summary: { [locationKey: string]: string[] } = {};
    
    for (const user of this.userLocations.values()) {
      let locationKey: string;
      if (user.table === null) {
        locationKey = 'lobby';
      } else if (user.seat === null) {
        locationKey = `table-${user.table}-observers`;
      } else {
        locationKey = `table-${user.table}-players`;
      }
      
      if (!summary[locationKey]) {
        summary[locationKey] = [];
      }
      summary[locationKey].push(`${user.nickname}${user.seat !== null ? ` (seat ${user.seat})` : ''}`);
    }

    return summary;
  }

  /**
   * Initialize location manager by loading existing players from database
   */
  async initialize(): Promise<void> {
    try {
      const players = await prisma.player.findMany({
        select: {
          id: true,
          nickname: true,
          table: true,
          seat: true,
          updatedAt: true
        }
      });

      for (const player of players) {
        this.userLocations.set(player.id, {
          playerId: player.id,
          nickname: player.nickname,
          table: player.table,
          seat: player.seat,
          updatedAt: player.updatedAt
        });
      }

      console.log(`LocationManager: Initialized with ${players.length} users`);
      console.log('LocationManager: Current locations:', this.getLocationSummary());
    } catch (error) {
      console.error('LocationManager: Failed to initialize:', error);
    }
  }

  /**
   * Legacy method for backward compatibility - converts old location string to table/seat
   * @deprecated Use table/seat methods instead
   */
  parseLocation(location: string): { type: 'lobby' | 'table-observer' | 'table-player'; tableId?: number; seatNumber?: number } {
    if (location === 'lobby') {
      return { type: 'lobby' };
    }

    const tableMatch = location.match(/^table-(\d+)$/);
    if (tableMatch) {
      return { 
        type: 'table-observer', 
        tableId: parseInt(tableMatch[1], 10) 
      };
    }

    const seatMatch = location.match(/^table-(\d+)-seat-(\d+)$/);
    if (seatMatch) {
      return { 
        type: 'table-player', 
        tableId: parseInt(seatMatch[1], 10),
        seatNumber: parseInt(seatMatch[2], 10)
      };
    }

    throw new Error(`Invalid location format: ${location}`);
  }
}

// Export singleton instance
export const locationManager = LocationManager.getInstance(); 