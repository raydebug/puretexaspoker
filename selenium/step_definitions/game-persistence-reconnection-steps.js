const { Given, Then, When } = require('@cucumber/cucumber');
const { expect } = require('chai');
const webdriverHelpers = require('../utils/webdriverHelpers');

// Store test state for persistence validation
let testGames = {};
let testSessions = {};
let connectionTokens = {};
let actionHistory = [];

// Game Persistence and Reconnection Step Definitions

Given('the game persistence system is initialized', async function () {
    console.log('💾 Initializing game persistence system...');
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/initialize_persistence',
        'POST',
        {}
    );
    
    if (!response.success) {
        throw new Error(`Failed to initialize persistence system: ${response.error}`);
    }
    
    console.log('✅ Game persistence system initialized successfully');
});

Given('I have an active poker game {string} with {int} players', async function (gameId, playerCount) {
    console.log(`🎮 Creating active poker game ${gameId} with ${playerCount} players...`);
    
    const players = [];
    for (let i = 1; i <= playerCount; i++) {
        const playerName = `TestPlayer${i}`;
        players.push({
            id: `test-player-${i}`,
            nickname: playerName,
            chips: 1000,
            seatNumber: i,
            isActive: true
        });
    }
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/create_persistent_game',
        'POST',
        {
            gameId,
            players,
            tableId: 'test-table-1',
            enableAutoSave: true
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to create persistent game: ${response.error}`);
    }
    
    testGames[gameId] = {
        id: gameId,
        players,
        tableId: 'test-table-1',
        createdAt: new Date()
    };
    
    console.log(`✅ Created active poker game ${gameId} with ${playerCount} players`);
});

When('the game progresses through multiple betting actions:', async function (dataTable) {
    console.log('⚡ Processing multiple betting actions...');
    
    const actions = dataTable.hashes();
    
    for (const actionData of actions) {
        const response = await webdriverHelpers.makeApiCall(
            this.serverUrl,
            '/api/test/execute_player_action',
            'POST',
            {
                gameId: testGames[Object.keys(testGames)[0]].id,
                playerId: actionData.player,
                action: actionData.action,
                amount: actionData.amount ? parseInt(actionData.amount) : undefined
            }
        );
        
        if (!response.success) {
            throw new Error(`Failed to execute ${actionData.action} by ${actionData.player}: ${response.error}`);
        }
        
        actionHistory.push({
            player: actionData.player,
            action: actionData.action,
            amount: actionData.amount,
            timestamp: new Date()
        });
        
        console.log(`   ✅ ${actionData.player} performed ${actionData.action}${actionData.amount ? ` (${actionData.amount})` : ''}`);
    }
});

Then('the game state should be automatically saved to database', async function () {
    console.log('⚡ Verifying game state was automatically saved...');
    
    const gameId = Object.keys(testGames)[0];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/check_game_persistence',
        'POST',
        { gameId }
    );
    
    expect(response.success).to.be.true;
    expect(response.gameSession).to.exist;
    expect(response.gameSession.gameState).to.exist;
    
    console.log('✅ Game state confirmed to be automatically saved');
});

Then('the saved game state should include all player actions', async function () {
    console.log('⚡ Verifying saved game state includes player actions...');
    
    const gameId = Object.keys(testGames)[0];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/get_saved_game_state',
        'POST',
        { gameId }
    );
    
    expect(response.success).to.be.true;
    expect(response.gameState.players).to.exist;
    expect(response.gameState.players.length).to.be.greaterThan(0);
    
    const hasPlayerBets = response.gameState.players.some(player => player.currentBet > 0);
    expect(hasPlayerBets).to.be.true;
    
    console.log('✅ Saved game state confirmed to include player actions');
});

Then('the saved game state should include current pot amount', async function () {
    console.log('⚡ Verifying saved game state includes pot amount...');
    
    const gameId = Object.keys(testGames)[0];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/get_saved_game_state',
        'POST',
        { gameId }
    );
    
    expect(response.success).to.be.true;
    expect(response.gameState.pot).to.exist;
    expect(response.gameState.pot).to.be.greaterThan(0);
    
    console.log(`✅ Saved game state includes pot amount: ${response.gameState.pot}`);
});

Then('the saved game state should include current phase {string}', async function (expectedPhase) {
    console.log(`⚡ Verifying saved game state includes phase ${expectedPhase}...`);
    
    const gameId = Object.keys(testGames)[0];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/get_saved_game_state',
        'POST',
        { gameId }
    );
    
    expect(response.success).to.be.true;
    expect(response.gameState.phase).to.equal(expectedPhase);
    
    console.log(`✅ Saved game state confirmed to include phase: ${expectedPhase}`);
});

Then('the auto-save timestamp should be within the last {int} seconds', async function (seconds) {
    console.log(`⚡ Verifying auto-save timestamp is within last ${seconds} seconds...`);
    
    const gameId = Object.keys(testGames)[0];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/check_game_persistence',
        'POST',
        { gameId }
    );
    
    expect(response.success).to.be.true;
    expect(response.gameSession.lastActionTime).to.exist;
    
    const lastSaveTime = new Date(response.gameSession.lastActionTime);
    const timeDiff = (new Date() - lastSaveTime) / 1000;
    
    expect(timeDiff).to.be.lessThan(seconds);
    
    console.log(`✅ Auto-save timestamp confirmed within ${seconds} seconds (${timeDiff.toFixed(2)}s ago)`);
});

Given('I have a registered user {string}', async function (username) {
    console.log(`👤 Creating registered user ${username}...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/create_user',
        'POST',
        {
            username,
            email: `${username}@test.com`,
            password: 'testpass123'
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to create user: ${response.error}`);
    }
    
    testSessions[username] = {
        userId: response.user.id,
        username: response.user.username
    };
    
    console.log(`✅ Created registered user: ${username}`);
});

When('{string} joins game {string} as {string}', async function (username, gameId, playerName) {
    console.log(`⚡ ${username} joining game ${gameId} as ${playerName}...`);
    
    const userInfo = testSessions[username];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/join_game_with_session',
        'POST',
        {
            userId: userInfo.userId,
            gameId,
            playerName,
            createSession: true
        }
    );
    
    if (!response.success) {
        throw new Error(`Failed to join game: ${response.error}`);
    }
    
    testSessions[username].gameId = gameId;
    testSessions[username].playerId = response.playerId;
    testSessions[username].sessionToken = response.sessionToken;
    
    console.log(`✅ ${username} joined game ${gameId} as ${playerName}`);
});

Then('a player session should be created in database', async function () {
    console.log('⚡ Verifying player session was created in database...');
    
    const username = Object.keys(testSessions)[0];
    const sessionInfo = testSessions[username];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/check_player_session',
        'POST',
        {
            userId: sessionInfo.userId,
            gameId: sessionInfo.gameId
        }
    );
    
    expect(response.success).to.be.true;
    expect(response.session).to.exist;
    expect(response.session.userId).to.equal(sessionInfo.userId);
    expect(response.session.gameId).to.equal(sessionInfo.gameId);
    
    console.log('✅ Player session confirmed to be created in database');
});

Then('the session should include user ID, game ID, and player ID', async function () {
    console.log('⚡ Verifying session includes all required IDs...');
    
    const username = Object.keys(testSessions)[0];
    const sessionInfo = testSessions[username];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/check_player_session',
        'POST',
        {
            userId: sessionInfo.userId,
            gameId: sessionInfo.gameId
        }
    );
    
    expect(response.success).to.be.true;
    expect(response.session.userId).to.exist;
    expect(response.session.gameId).to.exist;
    expect(response.session.playerId).to.exist;
    
    console.log('✅ Session confirmed to include all required IDs');
});

Then('the session should have a unique reconnect token', async function () {
    console.log('⚡ Verifying session has unique reconnect token...');
    
    const username = Object.keys(testSessions)[0];
    const sessionInfo = testSessions[username];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/check_player_session',
        'POST',
        {
            userId: sessionInfo.userId,
            gameId: sessionInfo.gameId
        }
    );
    
    expect(response.success).to.be.true;
    expect(response.session.reconnectToken).to.exist;
    expect(response.session.reconnectToken).to.be.a('string');
    expect(response.session.reconnectToken.length).to.be.greaterThan(20);
    
    connectionTokens[username] = response.session.reconnectToken;
    
    console.log('✅ Session confirmed to have unique reconnect token');
});

Then('the session status should be {string}', async function (expectedStatus) {
    console.log(`⚡ Verifying session status is ${expectedStatus}...`);
    
    const username = Object.keys(testSessions)[0];
    const sessionInfo = testSessions[username];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/check_player_session',
        'POST',
        {
            userId: sessionInfo.userId,
            gameId: sessionInfo.gameId
        }
    );
    
    expect(response.success).to.be.true;
    
    if (expectedStatus === 'connected') {
        expect(response.session.isConnected).to.be.true;
    } else if (expectedStatus === 'disconnected') {
        expect(response.session.isConnected).to.be.false;
    }
    
    console.log(`✅ Session status confirmed to be: ${expectedStatus}`);
});

Then('the session should be marked as active', async function () {
    console.log('⚡ Verifying session is marked as active...');
    
    const username = Object.keys(testSessions)[0];
    const sessionInfo = testSessions[username];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/check_player_session',
        'POST',
        {
            userId: sessionInfo.userId,
            gameId: sessionInfo.gameId
        }
    );
    
    expect(response.success).to.be.true;
    expect(response.session.isActive).to.be.true;
    
    console.log('✅ Session confirmed to be marked as active');
});

Then('a connection log entry should be recorded', async function () {
    console.log('⚡ Verifying connection log entry was recorded...');
    
    const username = Object.keys(testSessions)[0];
    const sessionInfo = testSessions[username];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/check_connection_log',
        'POST',
        {
            userId: sessionInfo.userId,
            gameId: sessionInfo.gameId,
            action: 'connect'
        }
    );
    
    expect(response.success).to.be.true;
    expect(response.logEntries).to.exist;
    expect(response.logEntries.length).to.be.greaterThan(0);
    
    console.log('✅ Connection log entry confirmed to be recorded');
});

Then('the current player turn should be preserved', async function () {
    console.log('⚡ Verifying current player turn is preserved...');
    
    const gameId = Object.keys(testGames)[0];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/get_saved_game_state',
        'POST',
        { gameId }
    );
    
    expect(response.success).to.be.true;
    expect(response.gameState.currentPlayer).to.exist;
    expect(response.gameState.turnOrder).to.exist;
    expect(response.gameState.turnIndex).to.exist;
    
    // Verify that the current player matches the turn order at the current index
    const currentPlayerFromTurn = response.gameState.turnOrder[response.gameState.turnIndex];
    expect(response.gameState.currentPlayer).to.equal(currentPlayerFromTurn);
    
    console.log(`✅ Current player turn preserved: ${response.gameState.currentPlayer} (turn index: ${response.gameState.turnIndex})`);
});

Then('the pot amount should be exactly {int} chips', async function (expectedPotAmount) {
    console.log(`⚡ Verifying pot amount is exactly ${expectedPotAmount} chips...`);
    
    const gameId = Object.keys(testGames)[0];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        '/api/test/get_saved_game_state',
        'POST',
        { gameId }
    );
    
    expect(response.success).to.be.true;
    expect(response.gameState.pot).to.exist;
    expect(response.gameState.pot).to.equal(expectedPotAmount);
    
    console.log(`✅ Pot amount confirmed to be exactly ${expectedPotAmount} chips`);
});

module.exports = {
    testGames,
    testSessions,
    connectionTokens,
    actionHistory
}; 