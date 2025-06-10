import { prisma } from '../db';

/**
 * Location Manager - Tracks user locations throughout the application
 * 
 * Location formats:
 * - "lobby" - user is browsing tables in the lobby
 * - "table-{tableId}" - user is observing table {tableId}
 * - "table-{tableId}-seat-{seatNumber}" - user is sitting at seat {seatNumber} on table {tableId}
 */

export interface UserLocation {
  playerId: string;
  nickname: string;
  location: string;
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
  async updateUserLocation(playerId: string, nickname: string, location: string): Promise<void> {
    console.log(`LocationManager: Updating ${nickname} (${playerId}) location to: ${location}`);
    
    const userLocation: UserLocation = {
      playerId,
      nickname,
      location,
      updatedAt: new Date()
    };

    // Update in-memory cache
    this.userLocations.set(playerId, userLocation);

    // Update database
    try {
      await prisma.player.update({
        where: { id: playerId },
        data: { location }
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
   * Get user's current location
   */
  getUserLocation(playerId: string): UserLocation | null {
    return this.userLocations.get(playerId) || null;
  }

  /**
   * Get all users at a specific location
   */
  getUsersAtLocation(location: string): UserLocation[] {
    return Array.from(this.userLocations.values())
      .filter(user => user.location === location);
  }

  /**
   * Get all users observing a specific table (location: "table-{tableId}")
   */
  getObserversAtTable(tableId: number): UserLocation[] {
    const tableLocation = `table-${tableId}`;
    return this.getUsersAtLocation(tableLocation);
  }

  /**
   * Get all users seated at a specific table (location: "table-{tableId}-seat-{seatNumber}")
   */
  getPlayersAtTable(tableId: number): UserLocation[] {
    const tablePrefix = `table-${tableId}-seat-`;
    return Array.from(this.userLocations.values())
      .filter(user => user.location.startsWith(tablePrefix));
  }

  /**
   * Get all users in the lobby (location: "lobby")
   */
  getUsersInLobby(): UserLocation[] {
    return this.getUsersAtLocation('lobby');
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
   * Parse location string to extract components
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

  /**
   * Create location string for table observer
   */
  static createTableObserverLocation(tableId: number): string {
    return `table-${tableId}`;
  }

  /**
   * Create location string for table player
   */
  static createTablePlayerLocation(tableId: number, seatNumber: number): string {
    return `table-${tableId}-seat-${seatNumber}`;
  }

  /**
   * Get summary of all locations for debugging
   */
  getLocationSummary(): { [location: string]: string[] } {
    const summary: { [location: string]: string[] } = {};
    
    for (const user of this.userLocations.values()) {
      if (!summary[user.location]) {
        summary[user.location] = [];
      }
      summary[user.location].push(user.nickname);
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
          location: true,
          updatedAt: true
        }
      });

      for (const player of players) {
        this.userLocations.set(player.id, {
          playerId: player.id,
          nickname: player.nickname,
          location: player.location,
          updatedAt: player.updatedAt
        });
      }

      console.log(`LocationManager: Initialized with ${players.length} users`);
      console.log('LocationManager: Current locations:', this.getLocationSummary());
    } catch (error) {
      console.error('LocationManager: Failed to initialize:', error);
    }
  }
}

// Export singleton instance
export const locationManager = LocationManager.getInstance(); 