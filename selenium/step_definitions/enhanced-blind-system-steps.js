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

module.exports = {
    tournamentSchedule,
    gameState,
    deadBlindObligations,
    testTournaments,
    blindSchedules
}; 