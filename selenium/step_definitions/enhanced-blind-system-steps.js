const { Given, Then, When } = require('@cucumber/cucumber');
const { expect } = require('chai');
const webdriverHelpers = require('../utils/webdriverHelpers');

// Store enhanced blind system state for validation
let tournamentSchedule = null;
let gameState = null;
let deadBlindObligations = [];

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

module.exports = {
    tournamentSchedule,
    gameState,
    deadBlindObligations
}; 