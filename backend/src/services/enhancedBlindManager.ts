import { BlindSchedule, BlindLevel, DeadBlindInfo, Player, GameState } from '../types/shared';

export class EnhancedBlindManager {
  private gameState: GameState;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  // ENHANCED BLIND SYSTEM: Initialize blind schedule for tournaments
  public initializeBlindSchedule(schedule: BlindSchedule): void {
    console.log(`🕒 BLIND SYSTEM: Initializing ${schedule.type} blind schedule: ${schedule.name}`);
    
    this.gameState.blindSchedule = schedule;
    this.gameState.currentBlindLevel = schedule.startingLevel;
    this.gameState.blindLevelStartTime = Date.now();
    this.gameState.handNumber = 0;
    this.gameState.deadBlinds = [];
    
    // Set initial blind amounts from schedule
    const initialLevel = schedule.levels.find(level => level.level === schedule.startingLevel);
    if (initialLevel) {
      this.gameState.smallBlind = initialLevel.smallBlind;
      this.gameState.bigBlind = initialLevel.bigBlind;
      this.gameState.ante = initialLevel.ante || 0;
      console.log(`💰 BLIND SYSTEM: Initial blinds - SB: ${initialLevel.smallBlind}, BB: ${initialLevel.bigBlind}${initialLevel.ante ? `, Ante: ${initialLevel.ante}` : ''}`);
    }
  }

  // ENHANCED BLIND SYSTEM: Check if blinds should increase (tournament logic)
  public checkBlindLevelIncrease(): boolean {
    if (!this.gameState.blindSchedule || this.gameState.blindSchedule.type === 'cash') {
      return false; // Cash games don't have blind increases
    }

    const currentTime = Date.now();
    const levelStartTime = this.gameState.blindLevelStartTime || currentTime;
    const currentLevel = this.getCurrentBlindLevel();
    
    if (!currentLevel) {
      return false;
    }

    const levelDuration = currentLevel.duration * 60 * 1000; // Convert minutes to milliseconds
    const timeElapsed = currentTime - levelStartTime;

    if (timeElapsed >= levelDuration) {
      return this.increaseBlindLevel();
    }

    return false;
  }

  // ENHANCED BLIND SYSTEM: Increase to next blind level
  private increaseBlindLevel(): boolean {
    if (!this.gameState.blindSchedule || !this.gameState.currentBlindLevel) {
      return false;
    }

    const nextLevelNumber = this.gameState.currentBlindLevel + 1;
    const nextLevel = this.gameState.blindSchedule.levels.find(level => level.level === nextLevelNumber);

    if (!nextLevel) {
      console.log(`⚠️ BLIND SYSTEM: No next blind level found after level ${this.gameState.currentBlindLevel}`);
      return false;
    }

    // Check if there's a break scheduled
    if (this.gameState.blindSchedule.isBreakAfterLevel?.includes(this.gameState.currentBlindLevel)) {
      this.startBreak();
      return false;
    }

    console.log(`⬆️ BLIND SYSTEM: Increasing blinds from level ${this.gameState.currentBlindLevel} to ${nextLevelNumber}`);
    
    this.gameState.currentBlindLevel = nextLevelNumber;
    this.gameState.blindLevelStartTime = Date.now();
    this.gameState.smallBlind = nextLevel.smallBlind;
    this.gameState.bigBlind = nextLevel.bigBlind;
    this.gameState.ante = nextLevel.ante || 0;

    console.log(`💰 BLIND SYSTEM: New blinds - SB: ${nextLevel.smallBlind}, BB: ${nextLevel.bigBlind}${nextLevel.ante ? `, Ante: ${nextLevel.ante}` : ''}`);
    return true;
  }

  // ENHANCED BLIND SYSTEM: Start tournament break
  private startBreak(): void {
    if (!this.gameState.blindSchedule?.breakDuration) {
      return;
    }

    console.log(`☕ BLIND SYSTEM: Starting ${this.gameState.blindSchedule.breakDuration} minute break`);
    
    this.gameState.isOnBreak = true;
    this.gameState.breakEndTime = Date.now() + (this.gameState.blindSchedule.breakDuration * 60 * 1000);
  }

  // ENHANCED BLIND SYSTEM: Check if break is over
  public checkBreakEnd(): boolean {
    if (!this.gameState.isOnBreak || !this.gameState.breakEndTime) {
      return false;
    }

    if (Date.now() >= this.gameState.breakEndTime) {
      console.log(`🎮 BLIND SYSTEM: Break ended, resuming tournament`);
      
      this.gameState.isOnBreak = false;
      this.gameState.breakEndTime = undefined;
      
      // Increase blind level after break
      return this.increaseBlindLevel();
    }

    return false;
  }

  // ENHANCED BLIND SYSTEM: Handle dead blind posting for seat changes
  public handleSeatChange(playerId: string, oldSeat: number, newSeat: number): void {
    console.log(`🔄 BLIND SYSTEM: Player ${playerId} changed from seat ${oldSeat} to seat ${newSeat}`);
    
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) {
      return;
    }

    // Check if player is moving past the blinds (clockwise)
    const dealerPosition = this.gameState.dealerPosition;
    const smallBlindSeat = this.getBlindSeat('small');
    const bigBlindSeat = this.getBlindSeat('big');

    if (this.isMovingPastBlinds(oldSeat, newSeat, dealerPosition, smallBlindSeat, bigBlindSeat)) {
      this.addDeadBlind(playerId, 'both', 'seat_change');
      console.log(`💀 BLIND SYSTEM: Player ${player.name} must post dead blinds for seat change`);
    }
  }

  // ENHANCED BLIND SYSTEM: Handle late entry blind posting
  public handleLateEntry(playerId: string): void {
    console.log(`🚪 BLIND SYSTEM: Handling late entry for player ${playerId}`);
    
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) {
      return;
    }

    // Check if late entry deadline has passed
    if (this.gameState.lateEntryDeadline && Date.now() > this.gameState.lateEntryDeadline) {
      throw new Error('Late entry deadline has passed');
    }

    // Set player's joined hand number
    player.joinedHandNumber = this.gameState.handNumber || 0;
    player.handsPlayed = 0;
    player.missedBlinds = 0;

    // Determine blind posting requirements for late entry
    const dealerPosition = this.gameState.dealerPosition;
    const playerSeat = player.seatNumber;

    if (this.isInBlindPositions(playerSeat, dealerPosition)) {
      // Player is entering in blind position - must post appropriate blind
      if (playerSeat === this.getBlindSeat('small')) {
        this.addDeadBlind(playerId, 'small', 'late_entry');
        console.log(`💀 BLIND SYSTEM: Late entry player ${player.name} must post small blind`);
      } else if (playerSeat === this.getBlindSeat('big')) {
        this.addDeadBlind(playerId, 'big', 'late_entry');
        console.log(`💀 BLIND SYSTEM: Late entry player ${player.name} must post big blind`);
      }
    } else {
      // Player entering after blinds - must post big blind dead blind
      this.addDeadBlind(playerId, 'big', 'late_entry');
      console.log(`💀 BLIND SYSTEM: Late entry player ${player.name} must post dead big blind`);
    }
  }

  // ENHANCED BLIND SYSTEM: Post dead blinds for a player
  public postDeadBlinds(playerId: string): boolean {
    const deadBlinds = this.gameState.deadBlinds?.filter(db => db.playerId === playerId) || [];
    
    if (deadBlinds.length === 0) {
      return false;
    }

    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) {
      return false;
    }

    let totalDeadBlindAmount = 0;

    deadBlinds.forEach(deadBlind => {
      let amount = 0;
      
      switch (deadBlind.blindType) {
        case 'small':
          amount = this.gameState.smallBlind;
          break;
        case 'big':
          amount = this.gameState.bigBlind;
          break;
        case 'both':
          amount = this.gameState.smallBlind + this.gameState.bigBlind;
          break;
      }

      if (player.chips >= amount) {
        player.chips -= amount;
        player.currentBet += amount;
        this.gameState.pot += amount;
        totalDeadBlindAmount += amount;
        
        console.log(`💰 BLIND SYSTEM: Player ${player.name} posted ${deadBlind.blindType} dead blind: ${amount}`);
      } else {
        // All-in dead blind scenario
        const allInAmount = player.chips;
        player.chips = 0;
        player.currentBet += allInAmount;
        this.gameState.pot += allInAmount;
        totalDeadBlindAmount += allInAmount;
        
        console.log(`🎰 BLIND SYSTEM: Player ${player.name} posted all-in dead blind: ${allInAmount}`);
      }
    });

    // Mark player as having posted dead blind and remove from dead blind list
    player.hasPostedDeadBlind = true;
    this.gameState.deadBlinds = this.gameState.deadBlinds?.filter(db => db.playerId !== playerId) || [];

    console.log(`✅ BLIND SYSTEM: Player ${player.name} posted total dead blinds: ${totalDeadBlindAmount}`);
    return true;
  }

  // ENHANCED BLIND SYSTEM: Post antes for all players
  public postAntes(): void {
    if (!this.gameState.ante || this.gameState.ante <= 0) {
      return;
    }

    console.log(`🎯 BLIND SYSTEM: Posting antes (${this.gameState.ante} per player)`);
    
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    let totalAntes = 0;

    activePlayers.forEach(player => {
      const anteAmount = Math.min(this.gameState.ante!, player.chips);
      player.chips -= anteAmount;
      this.gameState.pot += anteAmount;
      totalAntes += anteAmount;
      
      if (anteAmount < this.gameState.ante!) {
        console.log(`🎰 BLIND SYSTEM: Player ${player.name} posted partial ante (all-in): ${anteAmount}`);
      }
    });

    console.log(`💰 BLIND SYSTEM: Total antes posted: ${totalAntes}`);
  }

  // ENHANCED BLIND SYSTEM: Update hand number and player stats
  public incrementHandNumber(): void {
    this.gameState.handNumber = (this.gameState.handNumber || 0) + 1;
    
    // Update player hand statistics
    this.gameState.players.forEach(player => {
      if (player.isActive) {
        player.handsPlayed = (player.handsPlayed || 0) + 1;
      }
    });

    console.log(`📊 BLIND SYSTEM: Hand ${this.gameState.handNumber} starting`);
  }

  // ENHANCED BLIND SYSTEM: Get current blind level information
  public getCurrentBlindLevel(): BlindLevel | undefined {
    if (!this.gameState.blindSchedule || !this.gameState.currentBlindLevel) {
      return undefined;
    }

    return this.gameState.blindSchedule.levels.find(level => level.level === this.gameState.currentBlindLevel);
  }

  // ENHANCED BLIND SYSTEM: Get time remaining in current blind level
  public getTimeRemainingInLevel(): number {
    if (!this.gameState.blindSchedule || this.gameState.blindSchedule.type === 'cash') {
      return 0;
    }

    const currentLevel = this.getCurrentBlindLevel();
    if (!currentLevel) {
      return 0;
    }

    const currentTime = Date.now();
    const levelStartTime = this.gameState.blindLevelStartTime || currentTime;
    const levelDuration = currentLevel.duration * 60 * 1000;
    const timeElapsed = currentTime - levelStartTime;

    return Math.max(0, levelDuration - timeElapsed);
  }

  // ENHANCED BLIND SYSTEM: Helper methods

  private addDeadBlind(playerId: string, blindType: 'small' | 'big' | 'both', reason: 'seat_change' | 'missed_blind' | 'late_entry'): void {
    const deadBlind: DeadBlindInfo = {
      playerId,
      blindType,
      amount: blindType === 'small' ? this.gameState.smallBlind : 
              blindType === 'big' ? this.gameState.bigBlind : 
              this.gameState.smallBlind + this.gameState.bigBlind,
      handNumber: this.gameState.handNumber || 0,
      reason
    };

    this.gameState.deadBlinds = this.gameState.deadBlinds || [];
    this.gameState.deadBlinds.push(deadBlind);
  }

  private getBlindSeat(blindType: 'small' | 'big'): number {
    const activePlayers = this.gameState.players.filter(p => p.isActive);
    const position = blindType === 'small' ? this.gameState.smallBlindPosition : this.gameState.bigBlindPosition;
    return activePlayers[position]?.seatNumber || 0;
  }

  private isMovingPastBlinds(oldSeat: number, newSeat: number, dealerSeat: number, smallBlindSeat: number, bigBlindSeat: number): boolean {
    // Check if player is moving clockwise past the blind positions
    // This is a simplified version - full implementation would consider table wraparound
    return newSeat > oldSeat && oldSeat < smallBlindSeat && newSeat > bigBlindSeat;
  }

  private isInBlindPositions(playerSeat: number, dealerPosition: number): boolean {
    const smallBlindSeat = this.getBlindSeat('small');
    const bigBlindSeat = this.getBlindSeat('big');
    return playerSeat === smallBlindSeat || playerSeat === bigBlindSeat;
  }

  // ENHANCED BLIND SYSTEM: Get blind schedule summary
  public getBlindScheduleSummary(): any {
    if (!this.gameState.blindSchedule) {
      return null;
    }

    const currentLevel = this.getCurrentBlindLevel();
    const timeRemaining = this.getTimeRemainingInLevel();

    return {
      scheduleType: this.gameState.blindSchedule.type,
      scheduleName: this.gameState.blindSchedule.name,
      currentLevel: this.gameState.currentBlindLevel,
      smallBlind: this.gameState.smallBlind,
      bigBlind: this.gameState.bigBlind,
      ante: this.gameState.ante,
      timeRemainingMs: timeRemaining,
      timeRemainingMinutes: Math.ceil(timeRemaining / 60000),
      handNumber: this.gameState.handNumber,
      isOnBreak: this.gameState.isOnBreak,
      deadBlindsCount: this.gameState.deadBlinds?.length || 0,
      nextLevel: this.gameState.blindSchedule.levels.find(level => level.level === (this.gameState.currentBlindLevel || 0) + 1)
    };
  }
} 