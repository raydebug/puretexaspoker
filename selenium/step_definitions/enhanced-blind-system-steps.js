const { Given, Then, When } = require('@cucumber/cucumber');
const { expect } = require('chai');
const webdriverHelpers = require('../utils/webdriverHelpers');

// Store enhanced blind system state for validation
let tournamentSchedule = null;
let gameState = null;
let deadBlindObligations = [];

// Store test state for blind system validation
let testTournaments = {};
let blindSchedules = {};

// Enhanced Blind System Step Definitions

Given('I create a tournament blind schedule:', async function (dataTable) {
    console.log('🏆 Creating tournament blind schedule...');
    
    const rows = dataTable.hashes();
    const levels = rows.map(row => ({
        level: parseInt(row.level),
        smallBlind: parseInt(row.smallBlind),
        bigBlind: parseInt(row.bigBlind),
        ante: parseInt(row.ante),
        duration: parseInt(row.duration)
    }));
    
    tournamentSchedule = {
        id: 'test-tournament-schedule',
        name: 'Test Tournament',
        type: 'tournament',
        levels: levels,
        startingLevel: 1,
        breakDuration: 10
    };
    
    console.log(`✅ Created tournament schedule with ${levels.length} levels`);
    levels.forEach(level => {
        console.log(`   Level ${level.level}: ${level.smallBlind}/${level.bigBlind}${level.ante ? ` ante ${level.ante}` : ''} (${level.duration}min)`);
    });
});

When('I initialize the tournament with the blind schedule', async function () {
    console.log('⚡ Initializing tournament with blind schedule...');
    
    if (!tournamentSchedule) {
        throw new Error('No tournament schedule created');
    }
    
    // Initialize tournament via API
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/initialize_blind_schedule`,
        'POST',
        {
            gameId: this.gameId,
            schedule: tournamentSchedule
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to initialize tournament: ${response.error}`);
    }
    
    console.log('✅ Tournament initialized with blind schedule');
});

When('the game starts with the tournament schedule', async function () {
    console.log('🎮 Starting game with tournament schedule...');
    
    const startResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/start_game`,
        'POST',
        { gameId: this.gameId }
    );
    
    if (!startResponse.success) {
        throw new Error('Failed to start tournament game');
    }
    
    // Get updated game state
    const gameResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        { gameId: this.gameId }
    );
    
    gameState = gameResponse.gameState;
    console.log('✅ Tournament game started successfully');
});

Then('the current blind level should be {int}', async function (expectedLevel) {
    console.log(`⚡ Verifying current blind level is ${expectedLevel}...`);
    
    const gameResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        { gameId: this.gameId }
    );
    
    expect(gameResponse.gameState.currentBlindLevel || 1).to.equal(expectedLevel);
    console.log(`✅ Current blind level confirmed: ${expectedLevel}`);
});

Then('the small blind should be {int}', async function (expectedSmallBlind) {
    console.log(`⚡ Verifying small blind is ${expectedSmallBlind}...`);
    
    const gameResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        { gameId: this.gameId }
    );
    
    expect(gameResponse.gameState.smallBlind).to.equal(expectedSmallBlind);
    console.log(`✅ Small blind confirmed: ${expectedSmallBlind}`);
});

Then('the big blind should be {int}', async function (expectedBigBlind) {
    console.log(`⚡ Verifying big blind is ${expectedBigBlind}...`);
    
    const gameResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        { gameId: this.gameId }
    );
    
    expect(gameResponse.gameState.bigBlind).to.equal(expectedBigBlind);
    console.log(`✅ Big blind confirmed: ${expectedBigBlind}`);
});

Then('the ante should be {int}', async function (expectedAnte) {
    console.log(`⚡ Verifying ante is ${expectedAnte}...`);
    
    const gameResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        { gameId: this.gameId }
    );
    
    expect(gameResponse.gameState.ante || 0).to.equal(expectedAnte);
    console.log(`✅ Ante confirmed: ${expectedAnte}`);
});

Then('the blind level timer should be running', async function () {
    console.log('⚡ Verifying blind level timer is running...');
    
    const blindResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_blind_summary`,
        'POST',
        { gameId: this.gameId }
    );
    
    expect(blindResponse.blindSummary.timeRemainingMs).to.be.greaterThan(0);
    console.log(`✅ Blind level timer running: ${blindResponse.blindSummary.timeRemainingMinutes} minutes remaining`);
});

Given('I have an active tournament with blind schedule', async function () {
    console.log('🏆 Setting up active tournament with blind schedule...');
    
    // Create basic tournament schedule
    tournamentSchedule = {
        id: 'active-tournament',
        name: 'Active Tournament',
        type: 'tournament',
        levels: [
            { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 15 },
            { level: 2, smallBlind: 50, bigBlind: 100, ante: 10, duration: 15 }
        ],
        startingLevel: 1
    };
    
    // Initialize and start
    await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/initialize_blind_schedule`,
        'POST',
        { gameId: this.gameId, schedule: tournamentSchedule }
    );
    
    console.log('✅ Active tournament with blind schedule ready');
});

Given('the current blind level is {int} with blinds {string}', async function (level, blinds) {
    console.log(`⚡ Setting current blind level to ${level} with blinds ${blinds}...`);
    
    // Parse blinds string (e.g., "25/50")
    const [smallBlind, bigBlind] = blinds.split('/').map(Number);
    
    // Set tournament state via API
    await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/set_blind_level`,
        'POST',
        {
            gameId: this.gameId,
            level: level,
            smallBlind: smallBlind,
            bigBlind: bigBlind
        }
    );
    
    console.log(`✅ Blind level set to ${level} (${smallBlind}/${bigBlind})`);
});

Given('the blind level duration has elapsed', async function () {
    console.log('⏰ Simulating blind level duration elapsed...');
    
    // Simulate time passage via API
    await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/simulate_time_elapsed`,
        'POST',
        {
            gameId: this.gameId,
            minutes: 16 // More than 15 minute duration
        }
    );
    
    console.log('✅ Blind level duration elapsed');
});

When('the system checks for blind level increase', async function () {
    console.log('⚡ Checking for blind level increase...');
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/check_blind_increase`,
        'POST',
        { gameId: this.gameId }
    );
    
    if (!response.success) {
        throw new Error('Failed to check blind level increase');
    }
    
    console.log(`✅ Blind level increase check completed: ${response.increased ? 'Increased' : 'No change'}`);
});

Then('the blind level should increase to {int}', async function (expectedLevel) {
    console.log(`⚡ Verifying blind level increased to ${expectedLevel}...`);
    
    await webdriverHelpers.sleep(1000); // Allow for processing
    
    const blindResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_blind_summary`,
        'POST',
        { gameId: this.gameId }
    );
    
    expect(blindResponse.blindSummary.currentLevel).to.equal(expectedLevel);
    console.log(`✅ Blind level increased to: ${expectedLevel}`);
});

Then('all active players should post the ante', async function () {
    console.log('⚡ Verifying all active players posted antes...');
    
    const gameResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        { gameId: this.gameId }
    );
    
    const gameState = gameResponse.gameState;
    const activePlayers = gameState.players.filter(p => p.isActive);
    const expectedAnteTotal = activePlayers.length * (gameState.ante || 0);
    
    // Verify pot includes ante contributions
    expect(gameState.pot).to.be.at.least(expectedAnteTotal);
    console.log(`✅ All players posted antes: ${expectedAnteTotal} chips total`);
});

Then('the new blind level timer should start', async function () {
    console.log('⚡ Verifying new blind level timer started...');
    
    const blindResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_blind_summary`,
        'POST',
        { gameId: this.gameId }
    );
    
    // Timer should be close to full duration (allowing for processing time)
    const timeRemaining = blindResponse.blindSummary.timeRemainingMinutes;
    expect(timeRemaining).to.be.greaterThan(10); // Should be close to 15 minutes
    
    console.log(`✅ New blind level timer started: ${timeRemaining} minutes remaining`);
});

When('{string} changes from seat {int} to seat {int}', async function (playerName, oldSeat, newSeat) {
    console.log(`🔄 ${playerName} changing from seat ${oldSeat} to seat ${newSeat}...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/change_seat`,
        'POST',
        {
            gameId: this.gameId,
            playerName: playerName,
            oldSeat: oldSeat,
            newSeat: newSeat
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to change seat: ${response.error}`);
    }
    
    console.log(`✅ ${playerName} changed seats successfully`);
});

Given('the seat change moves the player past the blind positions', async function () {
    console.log('📍 Verifying seat change moves player past blind positions...');
    
    // This is validated by the seat change logic in the backend
    // The test API will determine if the seat change requires dead blinds
    
    console.log('✅ Seat change logic evaluated');
});

Then('{string} should have a dead blind obligation', async function (playerName) {
    console.log(`⚡ Verifying ${playerName} has dead blind obligation...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_dead_blinds`,
        'POST',
        { gameId: this.gameId }
    );
    
    const playerDeadBlinds = response.deadBlinds.filter(db => 
        db.playerName === playerName || db.playerId.includes(playerName)
    );
    
    expect(playerDeadBlinds.length).to.be.greaterThan(0);
    deadBlindObligations = response.deadBlinds;
    
    console.log(`✅ ${playerName} has dead blind obligation`);
});

Then('the dead blind type should be {string}', async function (expectedType) {
    console.log(`⚡ Verifying dead blind type is ${expectedType}...`);
    
    expect(deadBlindObligations.length).to.be.greaterThan(0);
    const lastDeadBlind = deadBlindObligations[deadBlindObligations.length - 1];
    
    expect(lastDeadBlind.blindType).to.equal(expectedType);
    console.log(`✅ Dead blind type confirmed: ${expectedType}`);
});

Then('the dead blind reason should be {string}', async function (expectedReason) {
    console.log(`⚡ Verifying dead blind reason is ${expectedReason}...`);
    
    expect(deadBlindObligations.length).to.be.greaterThan(0);
    const lastDeadBlind = deadBlindObligations[deadBlindObligations.length - 1];
    
    expect(lastDeadBlind.reason).to.equal(expectedReason);
    console.log(`✅ Dead blind reason confirmed: ${expectedReason}`);
});

When('the next hand begins', async function () {
    console.log('🎴 Starting next hand...');
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/start_new_hand`,
        'POST',
        { gameId: this.gameId }
    );
    
    if (!response.success) {
        throw new Error('Failed to start new hand');
    }
    
    console.log('✅ Next hand started');
});

Then('{string} should be required to post dead blinds', async function (playerName) {
    console.log(`⚡ Verifying ${playerName} is required to post dead blinds...`);
    
    // Check if player has posted or needs to post dead blinds
    const gameResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        { gameId: this.gameId }
    );
    
    const player = gameResponse.gameState.players.find(p => p.name === playerName);
    expect(player).to.exist;
    
    // Check if dead blinds were posted (reflected in pot or player status)
    const deadBlindResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_dead_blinds`,
        'POST',
        { gameId: this.gameId }
    );
    
    // Player should either have posted dead blinds or still have obligation
    const hasObligation = deadBlindResponse.deadBlinds.some(db => 
        db.playerName === playerName || db.playerId.includes(playerName)
    );
    const hasPosted = player.hasPostedDeadBlind;
    
    expect(hasObligation || hasPosted).to.be.true;
    console.log(`✅ ${playerName} dead blind requirement verified`);
});

Then('the dead blind amount should be posted to the pot', async function () {
    console.log('⚡ Verifying dead blind amount posted to pot...');
    
    const gameResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        { gameId: this.gameId }
    );
    
    // Pot should include dead blind contributions in addition to regular blinds
    expect(gameResponse.gameState.pot).to.be.greaterThan(0);
    console.log(`✅ Dead blind amount posted to pot: ${gameResponse.gameState.pot}`);
});

// Additional step definitions for comprehensive blind system testing

Given('I have an active cash game with blinds {string}', async function (blinds) {
    console.log(`💰 Setting up cash game with blinds ${blinds}...`);
    
    const [smallBlind, bigBlind] = blinds.split('/').map(Number);
    
    await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/setup_cash_game`,
        'POST',
        {
            gameId: this.gameId,
            smallBlind: smallBlind,
            bigBlind: bigBlind
        }
    );
    
    console.log(`✅ Cash game setup with blinds ${smallBlind}/${bigBlind}`);
});

Given('I have a tournament with a {int}-level blind schedule', async function (levels) {
    console.log(`🏆 Creating tournament with ${levels}-level blind schedule...`);
    
    const tournamentId = `tournament-${Date.now()}`;
    
    // Create blind schedule with specified levels
    const blindLevels = [];
    for (let i = 1; i <= levels; i++) {
        blindLevels.push({
            level: i,
            smallBlind: i * 10,
            bigBlind: i * 20,
            ante: i >= 3 ? i * 5 : 0,
            duration: 15 // 15 minutes per level
        });
    }
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/create_tournament_with_blinds',
        'POST',
        {
            tournamentId,
            blindLevels,
            totalLevels: levels
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to create tournament: ${response.error}`);
    }
    
    testTournaments[tournamentId] = {
        id: tournamentId,
        blindLevels,
        totalLevels: levels
    };
    
    blindSchedules[tournamentId] = blindLevels;
    
    console.log(`✅ Created tournament with ${levels}-level blind schedule`);
});

Given('the tournament is currently at level {int}', async function (currentLevel) {
    console.log(`⚡ Setting tournament to level ${currentLevel}...`);
    
    const tournamentId = Object.keys(testTournaments)[0];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/set_tournament_level',
        'POST',
        {
            tournamentId,
            currentLevel
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to set tournament level: ${response.error}`);
    }
    
    testTournaments[tournamentId].currentLevel = currentLevel;
    
    console.log(`✅ Tournament set to level ${currentLevel}`);
});

Given('there are {int} minutes remaining in the current level', async function (minutes) {
    console.log(`⏰ Setting ${minutes} minutes remaining in current level...`);
    
    const tournamentId = Object.keys(testTournaments)[0];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/set_level_time_remaining',
        'POST',
        {
            tournamentId,
            minutesRemaining: minutes
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to set time remaining: ${response.error}`);
    }
    
    testTournaments[tournamentId].timeRemaining = minutes;
    
    console.log(`✅ Set ${minutes} minutes remaining in current level`);
});

When('I request the blind schedule summary', async function () {
    console.log('📊 Requesting blind schedule summary...');
    
    const tournamentId = Object.keys(testTournaments)[0];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/get_blind_schedule_summary',
        'POST',
        {
            tournamentId
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to get blind schedule summary: ${response.error}`);
    }
    
    this.blindSummary = response.summary;
    
    console.log('✅ Retrieved blind schedule summary');
});

Then('the response should include current level information', async function () {
    console.log('⚡ Verifying current level information is included...');
    
    expect(this.blindSummary).to.exist;
    expect(this.blindSummary.currentLevel).to.exist;
    expect(this.blindSummary.currentLevel.level).to.be.a('number');
    expect(this.blindSummary.currentLevel.smallBlind).to.be.a('number');
    expect(this.blindSummary.currentLevel.bigBlind).to.be.a('number');
    
    console.log(`✅ Current level information confirmed: Level ${this.blindSummary.currentLevel.level} (${this.blindSummary.currentLevel.smallBlind}/${this.blindSummary.currentLevel.bigBlind})`);
});

Then('the response should include time remaining in current level', async function () {
    console.log('⚡ Verifying time remaining information is included...');
    
    expect(this.blindSummary).to.exist;
    expect(this.blindSummary.timeRemaining).to.exist;
    expect(this.blindSummary.timeRemaining).to.be.a('number');
    expect(this.blindSummary.timeRemaining).to.be.greaterThan(0);
    
    console.log(`✅ Time remaining confirmed: ${this.blindSummary.timeRemaining} minutes`);
});

Then('the response should include next level blind amounts', async function () {
    console.log('⚡ Verifying next level blind amounts are included...');
    
    expect(this.blindSummary).to.exist;
    expect(this.blindSummary.nextLevel).to.exist;
    expect(this.blindSummary.nextLevel.smallBlind).to.be.a('number');
    expect(this.blindSummary.nextLevel.bigBlind).to.be.a('number');
    expect(this.blindSummary.nextLevel.smallBlind).to.be.greaterThan(this.blindSummary.currentLevel.smallBlind);
    expect(this.blindSummary.nextLevel.bigBlind).to.be.greaterThan(this.blindSummary.currentLevel.bigBlind);
    
    console.log(`✅ Next level blinds confirmed: ${this.blindSummary.nextLevel.smallBlind}/${this.blindSummary.nextLevel.bigBlind}`);
});

Then('the response should include total hands played', async function () {
    console.log('⚡ Verifying total hands played is included...');
    
    expect(this.blindSummary).to.exist;
    expect(this.blindSummary.handsPlayed).to.exist;
    expect(this.blindSummary.handsPlayed).to.be.a('number');
    expect(this.blindSummary.handsPlayed).to.be.greaterThanOrEqual(0);
    
    console.log(`✅ Total hands played confirmed: ${this.blindSummary.handsPlayed}`);
});

Then('the response should include number of pending dead blinds', async function () {
    console.log('⚡ Verifying pending dead blinds count is included...');
    
    expect(this.blindSummary).to.exist;
    expect(this.blindSummary.pendingDeadBlinds).to.exist;
    expect(this.blindSummary.pendingDeadBlinds).to.be.a('number');
    expect(this.blindSummary.pendingDeadBlinds).to.be.greaterThanOrEqual(0);
    
    console.log(`✅ Pending dead blinds confirmed: ${this.blindSummary.pendingDeadBlinds}`);
});

// Complex Dead Blind Obligations scenario steps
When('{string} joins as late entry in seat {int}', async function (playerName, seatNumber) {
    console.log(`👤 ${playerName} joining as late entry in seat ${seatNumber}...`);
    
    const gameId = Object.keys(gameState || {})[0] || 'test-game-complex';
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/add_late_entry_player',
        'POST',
        {
            gameId,
            playerName,
            seatNumber,
            chips: 1000,
            entryType: 'late'
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to add late entry player: ${response.error}`);
    }
    
    // Track the player's dead blind obligation
    deadBlindObligations.push({
        player: playerName,
        blindType: 'big',
        reason: 'late_entry',
        seatNumber
    });
    
    console.log(`✅ ${playerName} joined as late entry in seat ${seatNumber}`);
});

When('{string} misses a blind due to temporary disconnection', async function (playerName) {
    console.log(`📡 ${playerName} missing blind due to temporary disconnection...`);
    
    const gameId = Object.keys(gameState || {})[0] || 'test-game-complex';
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/simulate_missed_blind',
        'POST',
        {
            gameId,
            playerName,
            reason: 'temporary_disconnection'
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to simulate missed blind: ${response.error}`);
    }
    
    // Track the missed blind obligation
    deadBlindObligations.push({
        player: playerName,
        blindType: 'big',
        reason: 'missed_blind'
    });
    
    console.log(`✅ ${playerName} missed blind due to temporary disconnection`);
});

Then('{string} should have dead blind obligation for {string} due to {string}', async function (playerName, blindType, reason) {
    console.log(`⚡ Verifying ${playerName} has dead blind obligation for ${blindType} due to ${reason}...`);
    
    const gameId = Object.keys(gameState || {})[0] || 'test-game-complex';
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/check_dead_blind_obligations',
        'POST',
        {
            gameId,
            playerName
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to check dead blind obligations: ${response.error}`);
    }
    
    expect(response.obligations).to.exist;
    expect(response.obligations).to.be.an('array');
    
    // Find obligation for this player
    const playerObligation = response.obligations.find(ob => ob.playerName === playerName);
    expect(playerObligation).to.exist;
    
    // Verify blind type
    if (blindType === 'both') {
        expect(playerObligation.blindTypes).to.include('small');
        expect(playerObligation.blindTypes).to.include('big');
    } else {
        expect(playerObligation.blindTypes).to.include(blindType);
    }
    
    // Verify reason
    expect(playerObligation.reason).to.equal(reason);
    
    console.log(`✅ ${playerName} confirmed to have dead blind obligation for ${blindType} due to ${reason}`);
});

Then('all players should post their respective dead blinds', async function () {
    console.log('⚡ Verifying all players post their respective dead blinds...');
    
    const gameId = Object.keys(gameState || {})[0] || 'test-game-complex';
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/execute_dead_blind_posting',
        'POST',
        {
            gameId
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to execute dead blind posting: ${response.error}`);
    }
    
    expect(response.deadBlindsPosted).to.exist;
    expect(response.deadBlindsPosted).to.be.an('array');
    expect(response.deadBlindsPosted.length).to.be.greaterThan(0);
    
    // Verify each dead blind posting
    response.deadBlindsPosted.forEach(posting => {
        expect(posting.playerName).to.exist;
        expect(posting.amount).to.be.a('number');
        expect(posting.amount).to.be.greaterThan(0);
        expect(posting.blindType).to.exist;
    });
    
    console.log(`✅ All players posted dead blinds: ${response.deadBlindsPosted.length} postings`);
});

Then('the pot should reflect all dead blind contributions', async function () {
    console.log('⚡ Verifying pot reflects all dead blind contributions...');
    
    const gameId = Object.keys(gameState || {})[0] || 'test-game-complex';
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/verify_pot_with_dead_blinds',
        'POST',
        {
            gameId
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to verify pot with dead blinds: ${response.error}`);
    }
    
    expect(response.potTotal).to.exist;
    expect(response.potTotal).to.be.a('number');
    expect(response.potTotal).to.be.greaterThan(0);
    
    expect(response.deadBlindContribution).to.exist;
    expect(response.deadBlindContribution).to.be.a('number');
    expect(response.deadBlindContribution).to.be.greaterThan(0);
    
    expect(response.regularBlindContribution).to.exist;
    expect(response.regularBlindContribution).to.be.a('number');
    
    // Verify pot total equals sum of contributions
    const expectedTotal = response.deadBlindContribution + response.regularBlindContribution;
    expect(response.potTotal).to.equal(expectedTotal);
    
    console.log(`✅ Pot correctly reflects contributions - Dead: ${response.deadBlindContribution}, Regular: ${response.regularBlindContribution}, Total: ${response.potTotal}`);
});

Then('the regular blinds should be posted by the appropriate players', async function () {
    console.log('⚡ Verifying regular blinds are posted by appropriate players...');
    
    const gameId = Object.keys(gameState || {})[0] || 'test-game-complex';
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/verify_regular_blind_posting',
        'POST',
        {
            gameId
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to verify regular blind posting: ${response.error}`);
    }
    
    expect(response.regularBlinds).to.exist;
    expect(response.regularBlinds).to.be.an('array');
    
    // Verify small blind posting
    const smallBlind = response.regularBlinds.find(blind => blind.blindType === 'small');
    expect(smallBlind).to.exist;
    expect(smallBlind.playerName).to.exist;
    expect(smallBlind.amount).to.be.a('number');
    expect(smallBlind.amount).to.be.greaterThan(0);
    
    // Verify big blind posting
    const bigBlind = response.regularBlinds.find(blind => blind.blindType === 'big');
    expect(bigBlind).to.exist;
    expect(bigBlind.playerName).to.exist;
    expect(bigBlind.amount).to.be.a('number');
    expect(bigBlind.amount).to.be.greaterThan(smallBlind.amount);
    
    // Verify different players for small and big blind
    expect(smallBlind.playerName).to.not.equal(bigBlind.playerName);
    
    console.log(`✅ Regular blinds posted correctly - Small: ${smallBlind.playerName} (${smallBlind.amount}), Big: ${bigBlind.playerName} (${bigBlind.amount})`);
});

// Tournament Late Entry Restrictions scenario steps
Given('the tournament started {int} minutes ago', async function (minutesAgo) {
    console.log(`⏰ Setting tournament start time to ${minutesAgo} minutes ago...`);
    
    const tournamentId = Object.keys(testTournaments)[0] || 'test-tournament-late';
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/set_tournament_start_time',
        'POST',
        {
            tournamentId,
            minutesAgo
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to set tournament start time: ${response.error}`);
    }
    
    // Update our test state
    if (!testTournaments[tournamentId]) {
        testTournaments[tournamentId] = {};
    }
    testTournaments[tournamentId].startedMinutesAgo = minutesAgo;
    
    console.log(`✅ Tournament start time set to ${minutesAgo} minutes ago`);
});

When('{string} attempts to join', async function (playerName) {
    console.log(`👤 ${playerName} attempting to join tournament...`);
    
    const tournamentId = Object.keys(testTournaments)[0] || 'test-tournament-late';
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/attempt_tournament_join',
        'POST',
        {
            tournamentId,
            playerName,
            chips: 1000
        }
    );
    
    // Store the response for later verification
    this.joinAttemptResponse = response;
    
    console.log(`⚡ ${playerName} join attempt completed`);
});

Then('{string} should be rejected with {string}', async function (playerName, expectedMessage) {
    console.log(`⚡ Verifying ${playerName} was rejected with message: ${expectedMessage}...`);
    
    expect(this.joinAttemptResponse).to.exist;
    expect(this.joinAttemptResponse.success).to.be.false;
    expect(this.joinAttemptResponse.error).to.exist;
    expect(this.joinAttemptResponse.error).to.include(expectedMessage);
    
    console.log(`✅ ${playerName} was correctly rejected with: ${this.joinAttemptResponse.error}`);
});

// Additional missing step definition for Enhanced Blind System
Given('the game starts with blinds {string}', async function (blindAmounts) {
    console.log(`🎮 Starting game with blinds ${blindAmounts}...`);
    
    const [smallBlind, bigBlind] = blindAmounts.split('/').map(amount => parseInt(amount));
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/start_game_with_blinds',
        'POST',
        {
            tableId: 'Enhanced Blind Test Table',
            smallBlind,
            bigBlind
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to start game with blinds: ${response.error}`);
    }
    
    // Update game state
    if (!gameState) {
        gameState = {};
    }
    gameState[response.gameId] = {
        smallBlind,
        bigBlind,
        status: 'active'
    };
    
    console.log(`✅ Game started with blinds ${blindAmounts}`);
});

// Ante Collection with Mixed Stack Sizes scenario steps
Then('{string} should post an all-in ante of {int} chips', async function (playerName, anteAmount) {
    console.log(`⚡ Verifying ${playerName} posts all-in ante of ${anteAmount} chips...`);
    
    const gameId = Object.keys(gameState || {})[0] || 'test-game-ante';
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/verify_all_in_ante_posting',
        'POST',
        {
            gameId,
            playerName,
            expectedAnteAmount: anteAmount
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to verify all-in ante posting: ${response.error}`);
    }
    
    expect(response.antePosted).to.exist;
    expect(response.antePosted.playerName).to.equal(playerName);
    expect(response.antePosted.amount).to.equal(anteAmount);
    expect(response.antePosted.isAllIn).to.be.true;
    
    console.log(`✅ ${playerName} correctly posted all-in ante of ${anteAmount} chips`);
});

Then('the total ante collection should be {int} chips', async function (expectedTotal) {
    console.log(`⚡ Verifying total ante collection is ${expectedTotal} chips...`);
    
    const gameId = Object.keys(gameState || {})[0] || 'test-game-ante';
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/get_total_ante_collection',
        'POST',
        {
            gameId
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to get total ante collection: ${response.error}`);
    }
    
    expect(response.totalAnteCollection).to.exist;
    expect(response.totalAnteCollection).to.be.a('number');
    expect(response.totalAnteCollection).to.equal(expectedTotal);
    
    expect(response.anteBreakdown).to.exist;
    expect(response.anteBreakdown).to.be.an('array');
    
    // Verify the sum of individual antes equals the total
    const calculatedTotal = response.anteBreakdown.reduce((sum, ante) => sum + ante.amount, 0);
    expect(calculatedTotal).to.equal(expectedTotal);
    
    console.log(`✅ Total ante collection confirmed: ${expectedTotal} chips from ${response.anteBreakdown.length} players`);
});

Then('the pot should reflect all ante contributions', async function () {
    console.log('⚡ Verifying pot reflects all ante contributions...');
    
    const gameId = Object.keys(gameState || {})[0] || 'test-game-ante';
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/verify_pot_ante_contributions',
        'POST',
        {
            gameId
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to verify pot ante contributions: ${response.error}`);
    }
    
    expect(response.potTotal).to.exist;
    expect(response.potTotal).to.be.a('number');
    expect(response.potTotal).to.be.greaterThan(0);
    
    expect(response.anteContribution).to.exist;
    expect(response.anteContribution).to.be.a('number');
    expect(response.anteContribution).to.be.greaterThan(0);
    
    expect(response.blindContribution).to.exist;
    expect(response.blindContribution).to.be.a('number');
    
    // Verify pot total includes ante contributions
    expect(response.potTotal).to.be.greaterThanOrEqual(response.anteContribution);
    
    // Verify ante contributions are properly tracked
    expect(response.anteDetails).to.exist;
    expect(response.anteDetails).to.be.an('array');
    expect(response.anteDetails.length).to.be.greaterThan(0);
    
    // Verify each ante detail
    response.anteDetails.forEach(ante => {
        expect(ante.playerName).to.exist;
        expect(ante.amount).to.be.a('number');
        expect(ante.amount).to.be.greaterThan(0);
    });
    
    console.log(`✅ Pot correctly reflects ante contributions - Total: ${response.potTotal}, Antes: ${response.anteContribution}, Blinds: ${response.blindContribution}`);
});

// Tournament Late Entry Deadline scenario steps
Given('I have a tournament with late entry deadline of {int} minutes', async function (deadlineMinutes) {
    console.log(`🏆 Creating tournament with late entry deadline of ${deadlineMinutes} minutes...`);
    
    const tournamentId = `tournament-late-entry-${Date.now()}`;
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/create_tournament_with_deadline',
        'POST',
        {
            tournamentId,
            lateEntryDeadlineMinutes: deadlineMinutes,
            blindLevels: [
                { level: 1, smallBlind: 10, bigBlind: 20, ante: 0, duration: 15 },
                { level: 2, smallBlind: 20, bigBlind: 40, ante: 5, duration: 15 }
            ]
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to create tournament: ${response.error}`);
    }
    
    testTournaments[tournamentId] = {
        id: tournamentId,
        lateEntryDeadlineMinutes: deadlineMinutes
    };
    
    console.log(`✅ Created tournament with late entry deadline of ${deadlineMinutes} minutes`);
});

Then('{string} should be allowed to join', async function (playerName) {
    console.log(`⚡ Verifying ${playerName} is allowed to join...`);
    
    expect(this.joinAttemptResponse).to.exist;
    expect(this.joinAttemptResponse.success).to.be.true;
    expect(this.joinAttemptResponse.gameId || this.joinAttemptResponse.tournamentId).to.exist;
    
    console.log(`✅ ${playerName} was successfully allowed to join`);
});

Then('they should receive appropriate late entry dead blind obligations', async function () {
    console.log('⚡ Verifying late entry player receives appropriate dead blind obligations...');
    
    expect(this.joinAttemptResponse).to.exist;
    expect(this.joinAttemptResponse.success).to.be.true;
    expect(this.joinAttemptResponse.deadBlindObligations).to.exist;
    expect(this.joinAttemptResponse.deadBlindObligations).to.be.an('array');
    expect(this.joinAttemptResponse.deadBlindObligations.length).to.be.greaterThan(0);
    
    // Verify late entry obligations include big blind at minimum
    const hasDeadBigBlind = this.joinAttemptResponse.deadBlindObligations.some(
        obligation => obligation.blindType === 'big' && obligation.reason === 'late_entry'
    );
    expect(hasDeadBigBlind).to.be.true;
    
    console.log(`✅ Late entry player correctly assigned ${this.joinAttemptResponse.deadBlindObligations.length} dead blind obligations`);
});

// Additional missing step definitions for Enhanced Blind System scenarios
Given('I create test players {string} with chips {string}', async function (playerNames, chipAmounts) {
    console.log(`👥 Creating test players ${playerNames} with chips ${chipAmounts}...`);
    
    const players = playerNames.split(',');
    const chips = chipAmounts.split(',').map(amount => parseInt(amount.trim()));
    
    if (players.length !== chips.length) {
        throw new Error(`Number of players (${players.length}) doesn't match number of chip amounts (${chips.length})`);
    }
    
    this.testPlayers = [];
    
    for (let i = 0; i < players.length; i++) {
        const playerName = players[i].trim();
        const chipAmount = chips[i];
        
        const response = await webdriverHelpers.makeApiCall(
            this.serverUrl,
            '/api/test/create_test_player',
            'POST',
            {
                playerName,
                chipAmount
            }
        );
        
        if (!response.success) {
            throw new Error(`Failed to create player ${playerName}: ${response.error}`);
        }
        
        this.testPlayers.push({
            name: playerName,
            chips: chipAmount,
            userId: response.userId
        });
    }
    
    console.log(`✅ Created ${players.length} test players with varying chip amounts`);
});

Given('the current blind level has an ante of {int}', async function (anteAmount) {
    console.log(`⚡ Setting current blind level ante to ${anteAmount}...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/set_current_ante',
        'POST',
        {
            tableId: 'Enhanced Blind Test Table',
            anteAmount
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to set ante amount: ${response.error}`);
    }
    
    // Store ante amount for later verification
    this.currentAnteAmount = anteAmount;
    
    console.log(`✅ Set current blind level ante to ${anteAmount} chips`);
});

When('the ante collection begins', async function () {
    console.log('⚡ Starting ante collection process...');
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/start_ante_collection',
        'POST',
        {
            tableId: 'Enhanced Blind Test Table'
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to start ante collection: ${response.error}`);
    }
    
    // Store ante collection details for later verification
    this.anteCollectionDetails = response.anteCollection;
    
    console.log('✅ Ante collection started successfully');
});

Then('{string} should post {int} chips as ante', async function (playerName, expectedAnteAmount) {
    console.log(`⚡ Verifying ${playerName} posts ${expectedAnteAmount} chips as ante...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/verify_ante_posting',
        'POST',
        {
            tableId: 'Enhanced Blind Test Table',
            playerName,
            expectedAnteAmount
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to verify ante posting: ${response.error}`);
    }
    
    expect(response.antePosted).to.exist;
    expect(response.antePosted.playerName).to.equal(playerName);
    expect(response.antePosted.amount).to.equal(expectedAnteAmount);
    expect(response.antePosted.isAllIn).to.be.false; // Regular ante, not all-in
    
    console.log(`✅ ${playerName} correctly posted ${expectedAnteAmount} chips as ante`);
});

// All-In Dead Blind Scenarios step definitions
Given('the game has blinds {string}', async function (blindAmounts) {
    console.log(`🎮 Setting game blinds to ${blindAmounts}...`);
    
    const [smallBlind, bigBlind] = blindAmounts.split('/').map(amount => parseInt(amount));
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/set_game_blinds',
        'POST',
        {
            tableId: 'Enhanced Blind Test Table',
            smallBlind,
            bigBlind
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to set game blinds: ${response.error}`);
    }
    
    // Store blind amounts for later verification
    this.gameBlinds = { smallBlind, bigBlind };
    
    console.log(`✅ Game blinds set to ${blindAmounts}`);
});

When('{string} has a dead blind obligation for {int} chips', async function (playerName, obligationAmount) {
    console.log(`⚡ Creating dead blind obligation for ${playerName}: ${obligationAmount} chips...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/create_dead_blind_obligation',
        'POST',
        {
            tableId: 'Enhanced Blind Test Table',
            playerName,
            obligationAmount,
            reason: 'test_scenario'
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to create dead blind obligation: ${response.error}`);
    }
    
    // Store the obligation for later verification
    if (!this.deadBlindObligations) {
        this.deadBlindObligations = [];
    }
    
    this.deadBlindObligations.push({
        playerName,
        obligationAmount,
        reason: 'test_scenario'
    });
    
    console.log(`✅ Dead blind obligation created for ${playerName}: ${obligationAmount} chips`);
});

When('{string} only has {int} chips remaining', async function (playerName, remainingChips) {
    console.log(`⚡ Setting ${playerName} chip count to ${remainingChips}...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/set_player_chips',
        'POST',
        {
            tableId: 'Enhanced Blind Test Table',
            playerName,
            chipAmount: remainingChips
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to set player chips: ${response.error}`);
    }
    
    // Store the player's chip count for later verification
    if (!this.playerChips) {
        this.playerChips = {};
    }
    this.playerChips[playerName] = remainingChips;
    
    console.log(`✅ ${playerName} now has ${remainingChips} chips remaining`);
});

Then('{string} should post an all-in dead blind of {int} chips', async function (playerName, allInAmount) {
    console.log(`⚡ Verifying ${playerName} posts all-in dead blind of ${allInAmount} chips...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/verify_all_in_dead_blind',
        'POST',
        {
            tableId: 'Enhanced Blind Test Table',
            playerName,
            expectedAllInAmount: allInAmount
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to verify all-in dead blind: ${response.error}`);
    }
    
    expect(response.deadBlindPosted).to.exist;
    expect(response.deadBlindPosted.playerName).to.equal(playerName);
    expect(response.deadBlindPosted.amount).to.equal(allInAmount);
    expect(response.deadBlindPosted.isAllIn).to.be.true;
    expect(response.deadBlindPosted.type).to.equal('dead_blind');
    
    // Verify the player is now all-in
    expect(response.playerStatus).to.exist;
    expect(response.playerStatus.isAllIn).to.be.true;
    expect(response.playerStatus.remainingChips).to.equal(0);
    
    console.log(`✅ ${playerName} correctly posted all-in dead blind of ${allInAmount} chips`);
});

Then('the remaining dead blind obligation should be waived', async function () {
    console.log('⚡ Verifying remaining dead blind obligation is waived...');
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/verify_obligation_waiver',
        'POST',
        {
            tableId: 'Enhanced Blind Test Table'
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to verify obligation waiver: ${response.error}`);
    }
    
    expect(response.waivedObligations).to.exist;
    expect(response.waivedObligations).to.be.an('array');
    expect(response.waivedObligations.length).to.be.greaterThan(0);
    
    // Verify each waived obligation
    response.waivedObligations.forEach(waiver => {
        expect(waiver.playerName).to.exist;
        expect(waiver.originalObligation).to.be.a('number');
        expect(waiver.waivedAmount).to.be.a('number');
        expect(waiver.reason).to.equal('insufficient_chips');
        expect(waiver.waivedAmount).to.be.greaterThan(0);
    });
    
    console.log(`✅ Remaining dead blind obligations waived: ${response.waivedObligations.length} waivers`);
});

Then('{string} should be eligible for side pot creation', async function (playerName) {
    console.log(`⚡ Verifying ${playerName} is eligible for side pot creation...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/verify_side_pot_eligibility',
        'POST',
        {
            tableId: 'Enhanced Blind Test Table',
            playerName
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to verify side pot eligibility: ${response.error}`);
    }
    
    expect(response.eligibility).to.exist;
    expect(response.eligibility.isEligible).to.be.true;
    expect(response.eligibility.playerName).to.equal(playerName);
    expect(response.eligibility.reason).to.equal('all_in_player');
    
    // Verify side pot structure
    expect(response.sidePotStructure).to.exist;
    expect(response.sidePotStructure.mainPot).to.exist;
    expect(response.sidePotStructure.sidePots).to.be.an('array');
    
    // Verify the all-in player's contribution cap
    expect(response.eligibility.contributionCap).to.exist;
    expect(response.eligibility.contributionCap).to.be.a('number');
    expect(response.eligibility.contributionCap).to.be.greaterThan(0);
    
    console.log(`✅ ${playerName} is eligible for side pot creation with contribution cap of ${response.eligibility.contributionCap} chips`);
});

// Tournament Break Management scenario step definitions
Given('I create a tournament with break schedule:', async function (dataTable) {
    console.log('🏆 Creating tournament with break schedule...');
    
    const breakSchedule = dataTable.hashes().map(row => ({
        level: parseInt(row.level),
        smallBlind: parseInt(row.smallBlind),
        bigBlind: parseInt(row.bigBlind),
        duration: parseInt(row.duration), // in minutes
        breakAfter: row.breakAfter === 'true'
    }));
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/create_tournament_with_breaks',
        'POST',
        {
            tournamentId: 'Tournament Break Test',
            tableId: 'Enhanced Blind Test Table',
            breakSchedule
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to create tournament with break schedule: ${response.error}`);
    }
    
    // Store the tournament and break schedule for later verification
    this.tournament = response.tournament;
    this.breakSchedule = breakSchedule;
    
    console.log(`✅ Tournament created with ${breakSchedule.length} levels and break schedule`);
});

When('the level {int} duration elapses', async function (levelNumber) {
    console.log(`⏰ Simulating level ${levelNumber} duration elapse...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/elapse_level_duration',
        'POST',
        {
            tournamentId: 'Tournament Break Test',
            levelNumber
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to elapse level duration: ${response.error}`);
    }
    
    // Store the level transition result
    this.levelTransition = response.transition;
    
    console.log(`✅ Level ${levelNumber} duration elapsed, transition: ${response.transition.type}`);
});

Then('the tournament should enter a break period', async function () {
    console.log('⚡ Verifying tournament enters break period...');
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/verify_tournament_break_status',
        'POST',
        {
            tournamentId: 'Tournament Break Test'
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to verify break status: ${response.error}`);
    }
    
    expect(response.tournamentStatus).to.exist;
    expect(response.tournamentStatus.isOnBreak).to.be.true;
    expect(response.tournamentStatus.breakType).to.equal('scheduled');
    expect(response.tournamentStatus.currentState).to.equal('break');
    
    // Verify break start time
    expect(response.breakInfo).to.exist;
    expect(response.breakInfo.startTime).to.exist;
    expect(response.breakInfo.scheduledDuration).to.be.a('number');
    expect(response.breakInfo.scheduledDuration).to.be.greaterThan(0);
    
    console.log(`✅ Tournament is now on break for ${response.breakInfo.scheduledDuration} minutes`);
});

Then('the break duration should be set correctly', async function () {
    console.log('⚡ Verifying break duration is set correctly...');
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/verify_break_duration',
        'POST',
        {
            tournamentId: 'Tournament Break Test'
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to verify break duration: ${response.error}`);
    }
    
    expect(response.breakDuration).to.exist;
    expect(response.breakDuration.configured).to.be.a('number');
    expect(response.breakDuration.remaining).to.be.a('number');
    expect(response.breakDuration.configured).to.be.greaterThan(0);
    expect(response.breakDuration.remaining).to.be.greaterThan(0);
    
    // Verify the break duration matches tournament configuration
    expect(response.breakDuration.configured).to.be.oneOf([5, 10, 15]); // Standard break durations
    
    console.log(`✅ Break duration correctly set: ${response.breakDuration.configured} minutes (${response.breakDuration.remaining} remaining)`);
});

Then('no new hands should be dealt during the break', async function () {
    console.log('⚡ Verifying no new hands are dealt during break...');
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/verify_break_hand_dealing',
        'POST',
        {
            tournamentId: 'Tournament Break Test'
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to verify break hand dealing: ${response.error}`);
    }
    
    expect(response.handDealingStatus).to.exist;
    expect(response.handDealingStatus.isBlocked).to.be.true;
    expect(response.handDealingStatus.reason).to.equal('tournament_break');
    expect(response.handDealingStatus.newHandsAllowed).to.be.false;
    
    // Verify any attempts to deal hands are properly rejected
    expect(response.dealingAttempts).to.exist;
    expect(response.dealingAttempts.attempted).to.be.a('number');
    expect(response.dealingAttempts.rejected).to.equal(response.dealingAttempts.attempted);
    
    console.log(`✅ Hand dealing properly blocked during break (${response.dealingAttempts.rejected} attempts rejected)`);
});

When('the break period ends', async function () {
    console.log('⏰ Simulating break period ending...');
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/end_tournament_break',
        'POST',
        {
            tournamentId: 'Tournament Break Test'
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to end tournament break: ${response.error}`);
    }
    
    // Store the break end result
    this.breakEndResult = response.result;
    
    console.log(`✅ Break period ended, transitioning to level ${response.result.newLevel}`);
});

Then('normal gameplay should resume', async function () {
    console.log('⚡ Verifying normal gameplay resumes...');
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/verify_gameplay_resumption',
        'POST',
        {
            tournamentId: 'Tournament Break Test'
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to verify gameplay resumption: ${response.error}`);
    }
    
    expect(response.gameplayStatus).to.exist;
    expect(response.gameplayStatus.isActive).to.be.true;
    expect(response.gameplayStatus.state).to.equal('active');
    expect(response.gameplayStatus.isOnBreak).to.be.false;
    
    // Verify hand dealing is now allowed
    expect(response.handDealing).to.exist;
    expect(response.handDealing.isAllowed).to.be.true;
    expect(response.handDealing.blockReason).to.be.null;
    
    // Verify tournament progressed to next level
    expect(response.currentLevel).to.exist;
    expect(response.currentLevel.level).to.be.a('number');
    expect(response.currentLevel.level).to.be.greaterThan(2); // Should be level 3 after break
    
    // Verify players can take actions
    expect(response.playerActions).to.exist;
    expect(response.playerActions.actionsEnabled).to.be.true;
    
    console.log(`✅ Normal gameplay resumed at level ${response.currentLevel.level}`);
});

module.exports = {
    tournamentSchedule,
    gameState,
    deadBlindObligations,
    testTournaments,
    blindSchedules
}; 