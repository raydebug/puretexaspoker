/**
 * Comprehensive Tournament Management System for Nakama Backend
 * Advanced tournament features with brackets, scheduling, and prize distribution
 */

import { ErrorFactory, NakamaError } from '../middleware/error_handling';
import { UserManagementService } from '../auth/user_management';

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  status: 'scheduled' | 'registration' | 'starting' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  type: 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss' | 'sit_n_go';
  gameFormat: 'texas_holdem' | 'omaha' | 'mixed';
  
  // Scheduling
  scheduledAt: string;
  registrationStartAt: string;
  registrationEndAt: string;
  startedAt?: string;
  completedAt?: string;
  
  // Configuration
  maxPlayers: number;
  minPlayers: number;
  currentPlayers: number;
  
  // Buy-in and Prizes
  buyIn: number;
  prizePool: number;
  prizeStructure: PrizeStructure[];
  
  // Game Settings
  startingChips: number;
  blindStructure: BlindLevel[];
  blindLevelDuration: number; // minutes
  currentBlindLevel: number;
  
  // Tournament State
  rounds: TournamentRound[];
  currentRound: number;
  tables: TournamentTable[];
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  rules?: string;
  isPrivate: boolean;
  password?: string;
}

export interface TournamentPlayer {
  userId: string;
  username: string;
  registeredAt: string;
  status: 'registered' | 'playing' | 'eliminated' | 'winner';
  currentChips: number;
  currentTableId?: string;
  currentSeat?: number;
  finalPosition?: number;
  prizeMoney?: number;
  eliminatedAt?: string;
  eliminatedBy?: string;
}

export interface TournamentTable {
  id: string;
  tournamentId: string;
  tableNumber: number;
  players: string[]; // User IDs
  status: 'waiting' | 'playing' | 'completed';
  matchId?: string; // Nakama match ID
  blindLevel: number;
  createdAt: string;
}

export interface TournamentRound {
  roundNumber: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  tables: string[]; // Table IDs
  startedAt?: string;
  completedAt?: string;
  winners: string[]; // User IDs advancing to next round
}

export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante?: number;
  duration: number; // minutes
}

export interface PrizeStructure {
  position: number;
  percentage: number;
  amount: number;
}

export interface TournamentBracket {
  tournamentId: string;
  type: Tournament['type'];
  rounds: BracketRound[];
  currentRound: number;
  winners: string[];
}

export interface BracketRound {
  roundNumber: number;
  name: string;
  matches: BracketMatch[];
}

export interface BracketMatch {
  matchId: string;
  player1: string;
  player2: string;
  winner?: string;
  tableId?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

/**
 * Tournament Management System
 */
export class TournamentManager {
  private readonly nk: nkruntime.Nakama;
  private readonly logger: nkruntime.Logger;
  private readonly userService: UserManagementService;

  constructor(nk: nkruntime.Nakama, logger: nkruntime.Logger) {
    this.nk = nk;
    this.logger = logger;
    this.userService = new UserManagementService(nk, logger);
  }

  /**
   * Create a new tournament
   */
  public async createTournament(
    creatorId: string,
    tournamentData: Partial<Tournament>
  ): Promise<Tournament> {
    // Validate creator permissions
    const hasPermission = await this.userService.hasPermission(creatorId, 'create_table');
    if (!hasPermission) {
      throw ErrorFactory.authorizationError('Permission required to create tournaments');
    }

    // Generate tournament ID
    const tournamentId = `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create default blind structure if not provided
    const defaultBlindStructure: BlindLevel[] = [
      { level: 1, smallBlind: 10, bigBlind: 20, duration: 15 },
      { level: 2, smallBlind: 15, bigBlind: 30, duration: 15 },
      { level: 3, smallBlind: 25, bigBlind: 50, duration: 15 },
      { level: 4, smallBlind: 50, bigBlind: 100, duration: 15 },
      { level: 5, smallBlind: 75, bigBlind: 150, duration: 15 },
      { level: 6, smallBlind: 100, bigBlind: 200, ante: 25, duration: 15 },
      { level: 7, smallBlind: 150, bigBlind: 300, ante: 25, duration: 15 },
      { level: 8, smallBlind: 200, bigBlind: 400, ante: 50, duration: 15 }
    ];

    // Create default prize structure (standard poker tournament)
    const defaultPrizeStructure = this.generatePrizeStructure(
      tournamentData.maxPlayers || 100,
      tournamentData.buyIn || 100
    );

    const tournament: Tournament = {
      id: tournamentId,
      name: tournamentData.name || 'Unnamed Tournament',
      description: tournamentData.description,
      status: 'scheduled',
      type: tournamentData.type || 'single_elimination',
      gameFormat: tournamentData.gameFormat || 'texas_holdem',
      
      scheduledAt: tournamentData.scheduledAt || new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      registrationStartAt: tournamentData.registrationStartAt || new Date().toISOString(),
      registrationEndAt: tournamentData.registrationEndAt || new Date(Date.now() + 3000000).toISOString(), // 50 minutes from now
      
      maxPlayers: tournamentData.maxPlayers || 100,
      minPlayers: tournamentData.minPlayers || 8,
      currentPlayers: 0,
      
      buyIn: tournamentData.buyIn || 100,
      prizePool: 0,
      prizeStructure: defaultPrizeStructure,
      
      startingChips: tournamentData.startingChips || 1500,
      blindStructure: tournamentData.blindStructure || defaultBlindStructure,
      blindLevelDuration: tournamentData.blindLevelDuration || 15,
      currentBlindLevel: 0,
      
      rounds: [],
      currentRound: 0,
      tables: [],
      
      createdBy: creatorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rules: tournamentData.rules,
      isPrivate: tournamentData.isPrivate || false,
      password: tournamentData.password
    };

    // Store tournament
    await this.nk.storageWrite([{
      collection: "tournaments",
      key: tournamentId,
      userId: creatorId,
      value: tournament,
      permissionRead: 2, // Public read
      permissionWrite: 1  // Owner write
    }]);

    // Create tournament bracket
    await this.createTournamentBracket(tournament);

    this.logger.info(`🏆 Tournament created: ${tournament.name} (${tournamentId})`);
    return tournament;
  }

  /**
   * Register player for tournament
   */
  public async registerPlayer(tournamentId: string, userId: string): Promise<TournamentPlayer> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw ErrorFactory.notFoundError('Tournament');
    }

    // Check tournament status
    if (tournament.status !== 'registration') {
      throw ErrorFactory.gameStateError('Tournament registration is not open');
    }

    // Check if tournament is full
    if (tournament.currentPlayers >= tournament.maxPlayers) {
      throw ErrorFactory.gameStateError('Tournament is full');
    }

    // Check if already registered
    const existingPlayer = await this.getTournamentPlayer(tournamentId, userId);
    if (existingPlayer) {
      throw ErrorFactory.conflictError('Already registered for this tournament');
    }

    // Check user has enough chips for buy-in
    const userProfile = await this.userService.getUserProfile(userId);
    if (!userProfile || userProfile.chips < tournament.buyIn) {
      throw ErrorFactory.insufficientFundsError(tournament.buyIn, userProfile?.chips || 0);
    }

    // Deduct buy-in from user
    await this.userService.updateUserStats(userId, {
      chips: userProfile.chips - tournament.buyIn
    });

    // Create tournament player
    const tournamentPlayer: TournamentPlayer = {
      userId,
      username: userProfile.username,
      registeredAt: new Date().toISOString(),
      status: 'registered',
      currentChips: tournament.startingChips
    };

    // Store tournament player
    await this.nk.storageWrite([{
      collection: "tournament_players",
      key: `${tournamentId}_${userId}`,
      userId: userId,
      value: tournamentPlayer,
      permissionRead: 2,
      permissionWrite: 1
    }]);

    // Update tournament player count and prize pool
    tournament.currentPlayers++;
    tournament.prizePool += tournament.buyIn;
    tournament.updatedAt = new Date().toISOString();

    await this.updateTournament(tournament);

    this.logger.info(`🎯 Player registered: ${userProfile.username} for tournament ${tournament.name}`);
    return tournamentPlayer;
  }

  /**
   * Start tournament when conditions are met
   */
  public async startTournament(tournamentId: string, forcedBy?: string): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw ErrorFactory.notFoundError('Tournament');
    }

    // Check authorization
    if (forcedBy) {
      const hasPermission = await this.userService.hasPermission(forcedBy, 'manage_tables');
      if (!hasPermission && forcedBy !== tournament.createdBy) {
        throw ErrorFactory.authorizationError('Only tournament creator or admin can force start');
      }
    }

    // Check minimum players
    if (tournament.currentPlayers < tournament.minPlayers) {
      throw ErrorFactory.gameStateError(`Need at least ${tournament.minPlayers} players to start`);
    }

    // Update tournament status
    tournament.status = 'starting';
    tournament.startedAt = new Date().toISOString();
    tournament.updatedAt = new Date().toISOString();

    // Get all registered players
    const players = await this.getTournamentPlayers(tournamentId);
    
    // Create initial tables and seating
    const tables = await this.createInitialTables(tournament, players);
    tournament.tables = tables;

    // Update prize structure with final prize pool
    tournament.prizeStructure = this.calculateFinalPrizes(tournament);

    // Set status to in progress
    tournament.status = 'in_progress';
    tournament.currentRound = 1;

    await this.updateTournament(tournament);

    // Start blind level timer
    await this.startBlindLevelTimer(tournamentId);

    this.logger.info(`🚀 Tournament started: ${tournament.name} with ${players.length} players`);
  }

  /**
   * Advance tournament (eliminate players, balance tables, etc.)
   */
  public async advanceTournament(tournamentId: string): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw ErrorFactory.notFoundError('Tournament');
    }

    const players = await this.getTournamentPlayers(tournamentId);
    const activePlayers = players.filter(p => p.status === 'playing');

    // Check if tournament is complete
    if (activePlayers.length <= 1) {
      await this.completeTournament(tournamentId);
      return;
    }

    // Balance tables if needed
    await this.balanceTables(tournament, activePlayers);

    // Check if we need to advance to next round
    const tablesInPlay = tournament.tables.filter(t => t.status === 'playing').length;
    if (tablesInPlay === 0) {
      await this.advanceToNextRound(tournament);
    }
  }

  /**
   * Eliminate player from tournament
   */
  public async eliminatePlayer(
    tournamentId: string,
    playerId: string,
    eliminatedBy?: string
  ): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw ErrorFactory.notFoundError('Tournament');
    }

    const player = await this.getTournamentPlayer(tournamentId, playerId);
    if (!player) {
      throw ErrorFactory.notFoundError('Tournament player');
    }

    // Get current standings
    const allPlayers = await this.getTournamentPlayers(tournamentId);
    const remainingPlayers = allPlayers.filter(p => p.status === 'playing').length;

    // Update player status
    player.status = 'eliminated';
    player.eliminatedAt = new Date().toISOString();
    player.eliminatedBy = eliminatedBy;
    player.finalPosition = remainingPlayers; // Position based on elimination order

    // Calculate prize money if applicable
    const prizeInfo = tournament.prizeStructure.find(p => p.position === player.finalPosition);
    if (prizeInfo) {
      player.prizeMoney = prizeInfo.amount;
      
      // Award prize money to user
      const userProfile = await this.userService.getUserProfile(playerId);
      if (userProfile) {
        await this.userService.updateUserStats(playerId, {
          chips: userProfile.chips + prizeInfo.amount
        });
      }
    }

    // Update player record
    await this.nk.storageWrite([{
      collection: "tournament_players",
      key: `${tournamentId}_${playerId}`,
      userId: playerId,
      value: player,
      permissionRead: 2,
      permissionWrite: 1
    }]);

    this.logger.info(`💥 Player eliminated: ${player.username} (Position: ${player.finalPosition})`);

    // Check if tournament should advance
    await this.advanceTournament(tournamentId);
  }

  /**
   * Complete tournament
   */
  private async completeTournament(tournamentId: string): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return;

    const players = await this.getTournamentPlayers(tournamentId);
    const winner = players.find(p => p.status === 'playing');

    if (winner) {
      winner.status = 'winner';
      winner.finalPosition = 1;
      
      // Award first place prize
      const firstPrize = tournament.prizeStructure.find(p => p.position === 1);
      if (firstPrize) {
        winner.prizeMoney = firstPrize.amount;
        
        const userProfile = await this.userService.getUserProfile(winner.userId);
        if (userProfile) {
          await this.userService.updateUserStats(winner.userId, {
            chips: userProfile.chips + firstPrize.amount,
            tablesWon: userProfile.tablesWon + 1
          });
        }
      }

      // Update winner record
      await this.nk.storageWrite([{
        collection: "tournament_players",
        key: `${tournamentId}_${winner.userId}`,
        userId: winner.userId,
        value: winner,
        permissionRead: 2,
        permissionWrite: 1
      }]);
    }

    // Update tournament status
    tournament.status = 'completed';
    tournament.completedAt = new Date().toISOString();
    tournament.updatedAt = new Date().toISOString();

    await this.updateTournament(tournament);

    this.logger.info(`🏆 Tournament completed: ${tournament.name}, Winner: ${winner?.username || 'None'}`);
  }

  /**
   * Helper methods
   */
  private async getTournament(tournamentId: string): Promise<Tournament | null> {
    try {
      const result = await this.nk.storageRead([{
        collection: "tournaments",
        key: tournamentId,
        userId: ""
      }]);
      return result?.[0]?.value as Tournament || null;
    } catch (error) {
      return null;
    }
  }

  private async updateTournament(tournament: Tournament): Promise<void> {
    await this.nk.storageWrite([{
      collection: "tournaments",
      key: tournament.id,
      userId: tournament.createdBy,
      value: tournament,
      permissionRead: 2,
      permissionWrite: 1
    }]);
  }

  private async getTournamentPlayer(tournamentId: string, userId: string): Promise<TournamentPlayer | null> {
    try {
      const result = await this.nk.storageRead([{
        collection: "tournament_players",
        key: `${tournamentId}_${userId}`,
        userId: userId
      }]);
      return result?.[0]?.value as TournamentPlayer || null;
    } catch (error) {
      return null;
    }
  }

  private async getTournamentPlayers(tournamentId: string): Promise<TournamentPlayer[]> {
    try {
      const result = await this.nk.storageList("", "tournament_players", 1000);
      const allPlayers = result.objects?.map(obj => obj.value as TournamentPlayer) || [];
      
      // Filter by tournament (this is a simplified approach)
      return allPlayers.filter(player => {
        // In a real implementation, you'd have a better way to associate players with tournaments
        return true; // Placeholder
      });
    } catch (error) {
      return [];
    }
  }

  private generatePrizeStructure(maxPlayers: number, buyIn: number): PrizeStructure[] {
    const payoutPercentages = [
      { position: 1, percentage: 50 },
      { position: 2, percentage: 30 },
      { position: 3, percentage: 20 }
    ];

    // Add more positions for larger tournaments
    if (maxPlayers >= 20) {
      payoutPercentages.push({ position: 4, percentage: 10 });
      payoutPercentages.push({ position: 5, percentage: 8 });
    }

    const totalPrizePool = maxPlayers * buyIn;
    
    return payoutPercentages.map(payout => ({
      position: payout.position,
      percentage: payout.percentage,
      amount: Math.floor((totalPrizePool * payout.percentage) / 100)
    }));
  }

  private calculateFinalPrizes(tournament: Tournament): PrizeStructure[] {
    const totalPrizePool = tournament.prizePool;
    
    return tournament.prizeStructure.map(prize => ({
      ...prize,
      amount: Math.floor((totalPrizePool * prize.percentage) / 100)
    }));
  }

  private async createInitialTables(tournament: Tournament, players: TournamentPlayer[]): Promise<TournamentTable[]> {
    const playersPerTable = 6; // Standard poker table size
    const tableCount = Math.ceil(players.length / playersPerTable);
    const tables: TournamentTable[] = [];

    // Shuffle players for random seating
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    for (let i = 0; i < tableCount; i++) {
      const tableId = `${tournament.id}_table_${i + 1}`;
      const startIndex = i * playersPerTable;
      const tablePlayers = shuffledPlayers.slice(startIndex, startIndex + playersPerTable);

      const table: TournamentTable = {
        id: tableId,
        tournamentId: tournament.id,
        tableNumber: i + 1,
        players: tablePlayers.map(p => p.userId),
        status: 'playing',
        blindLevel: 0,
        createdAt: new Date().toISOString()
      };

      tables.push(table);

      // Store table
      await this.nk.storageWrite([{
        collection: "tournament_tables",
        key: tableId,
        userId: tournament.createdBy,
        value: table,
        permissionRead: 2,
        permissionWrite: 1
      }]);
    }

    return tables;
  }

  private async createTournamentBracket(tournament: Tournament): Promise<void> {
    // Simplified bracket creation - in production, you'd create proper bracket structures
    const bracket: TournamentBracket = {
      tournamentId: tournament.id,
      type: tournament.type,
      rounds: [],
      currentRound: 0,
      winners: []
    };

    await this.nk.storageWrite([{
      collection: "tournament_brackets",
      key: tournament.id,
      userId: tournament.createdBy,
      value: bracket,
      permissionRead: 2,
      permissionWrite: 1
    }]);
  }

  private async balanceTables(tournament: Tournament, activePlayers: TournamentPlayer[]): Promise<void> {
    // Table balancing logic - simplified
    this.logger.info(`Balancing tables for tournament ${tournament.id}`);
  }

  private async advanceToNextRound(tournament: Tournament): Promise<void> {
    tournament.currentRound++;
    tournament.updatedAt = new Date().toISOString();
    await this.updateTournament(tournament);
    
    this.logger.info(`Tournament ${tournament.id} advanced to round ${tournament.currentRound}`);
  }

  private async startBlindLevelTimer(tournamentId: string): Promise<void> {
    // Blind level advancement timer - simplified
    this.logger.info(`Started blind level timer for tournament ${tournamentId}`);
  }
}
