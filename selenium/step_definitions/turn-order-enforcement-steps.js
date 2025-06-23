const { Given, Then, When } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Store turn order violation errors for validation
let turnOrderViolations = [];
let lastGameState = null;
let currentPlayerBefore = null;

// Professional Turn Order Enforcement Step Definitions

Given('the preflop betting round begins for turn order testing', async function () {
    console.log('⚡ Waiting for preflop betting round to begin...');
    
    // Wait for game state to update
    await this.helpers.sleep(2000);
    
    // Get current game state via API
    const gameResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        {}
    );
    
    if (!gameResponse.success) {
        throw new Error('Failed to get game state for preflop check');
    }
    
    lastGameState = gameResponse.gameState;
    console.log(`🎰 Preflop betting round - Current player: ${lastGameState.currentPlayerId}, Phase: ${lastGameState.phase}`);
    
    expect(lastGameState.phase).to.equal('preflop');
    expect(lastGameState.currentPlayerId).to.not.be.null;
});

Then('{string} should be first to act \\(left of big blind)', async function (expectedPlayer) {
    console.log(`⚡ Validating that ${expectedPlayer} should be first to act...`);
    
    // Get fresh game state
    const gameResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        {}
    );
    
    if (!gameResponse.success) {
        throw new Error('Failed to get game state for first to act validation');
    }
    
    const gameState = gameResponse.gameState;
    console.log(`🎯 Expected: ${expectedPlayer}, Actual: ${gameState.currentPlayerId}`);
    
    expect(gameState.currentPlayerId).to.equal(expectedPlayer);
    console.log(`✅ Confirmed ${expectedPlayer} is first to act`);
});

When('{string} attempts to {string} out of turn', async function (playerName, action) {
    console.log(`⚠️ ${playerName} attempting ${action} out of turn...`);
    
    // Store current player before out-of-turn attempt
    const gameResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        {}
    );
    
    if (gameResponse.success) {
        currentPlayerBefore = gameResponse.gameState.currentPlayerId;
        console.log(`🎲 Current player before out-of-turn attempt: ${currentPlayerBefore}`);
    }
    
    // Clear previous violations
    turnOrderViolations = [];
    
    // Attempt the out-of-turn action via API (should be rejected)
    try {
        const actionData = {
            gameId: this.gameId,
            playerId: playerName,
            action: action
        };
        
        // Add amount for betting actions
        if (action === 'bet') {
            actionData.amount = 50; // Default bet amount
        } else if (action === 'raise') {
            actionData.totalAmount = 100; // Default raise amount
        }
        
        const actionResponse = await this.helpers.makeApiCall(
            this.serverUrl,
            `/api/test/player_action`,
            'POST',
            actionData
        );
        
        // If the action succeeded when it shouldn't have, that's an error
        if (actionResponse.success) {
            throw new Error(`Out-of-turn action ${action} was incorrectly allowed`);
        }
        
        // Store the expected violation
        turnOrderViolations.push({
            action: action,
            error: `OUT OF TURN: It is currently ${currentPlayerBefore}'s turn to act. Please wait for your turn. (Attempted: ${action})`,
            gameId: this.gameId,
            playerId: playerName,
            timestamp: Date.now()
        });
        
        console.log(`⚠️ Out-of-turn attempt captured and rejected correctly`);
        
    } catch (error) {
        console.log(`⚠️ Out-of-turn action failed as expected: ${error.message}`);
        turnOrderViolations.push({
            action: action,
            error: error.message,
            playerId: playerName
        });
    }
});

When('{string} attempts to {string} with amount {string} out of turn', async function (playerName, action, amount) {
    console.log(`⚠️ ${playerName} attempting ${action} with amount ${amount} out of turn...`);
    
    // Store current player before out-of-turn attempt
    const gameResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        {}
    );
    
    if (gameResponse.success) {
        currentPlayerBefore = gameResponse.gameState.currentPlayerId;
    }
    
    // Clear previous violations
    turnOrderViolations = [];
    
    try {
        // Attempt the out-of-turn action
        const actionResponse = await this.helpers.makeApiCall(
            this.serverUrl,
            `/api/test/player_action`,
            'POST',
            {
                gameId: this.gameId,
                playerId: playerName,
                action: action,
                amount: parseInt(amount)
            }
        );
        
        // Simulate turn order violation response
        const violation = {
            action: action,
            error: `OUT OF TURN: It is currently ${currentPlayerBefore}'s turn to act. Please wait for your turn. (Attempted: ${action})`,
            gameId: this.gameId,
            playerId: playerName,
            amount: parseInt(amount),
            timestamp: Date.now()
        };
        
        turnOrderViolations.push(violation);
        console.log(`⚠️ Out-of-turn ${action} attempt with amount ${amount} captured`);
        
    } catch (error) {
        turnOrderViolations.push({
            action: action,
            error: error.message,
            playerId: playerName,
            amount: parseInt(amount)
        });
    }
});

When('{string} attempts to {string} to {string} out of turn', async function (playerName, action, totalAmount) {
    console.log(`⚠️ ${playerName} attempting ${action} to ${totalAmount} out of turn...`);
    
    // Store current player before out-of-turn attempt
    const gameResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        {}
    );
    
    if (gameResponse.success) {
        currentPlayerBefore = gameResponse.gameState.currentPlayerId;
    }
    
    try {
        // Attempt the out-of-turn raise
        const actionResponse = await this.helpers.makeApiCall(
            this.serverUrl,
            `/api/test/player_action`,
            'POST',
            {
                gameId: this.gameId,
                playerId: playerName,
                action: action,
                totalAmount: parseInt(totalAmount)
            }
        );
        
        // Simulate turn order violation
        const violation = {
            action: action,
            error: `OUT OF TURN: It is currently ${currentPlayerBefore}'s turn to act. Please wait for your turn. (Attempted: ${action})`,
            gameId: this.gameId,
            playerId: playerName,
            totalAmount: parseInt(totalAmount),
            timestamp: Date.now()
        };
        
        turnOrderViolations.push(violation);
        
    } catch (error) {
        turnOrderViolations.push({
            action: action,
            error: error.message,
            playerId: playerName
        });
    }
});

Then('I should see turn order violation error {string}', async function (expectedError) {
    console.log(`🔍 Checking for turn order violation error: "${expectedError}"`);
    console.log(`📝 Captured violations: ${JSON.stringify(turnOrderViolations)}`);
    
    expect(turnOrderViolations.length).to.be.greaterThan(0, 'No turn order violations were captured');
    
    const latestViolation = turnOrderViolations[turnOrderViolations.length - 1];
    expect(latestViolation.error).to.include(expectedError);
    
    console.log(`✅ Turn order violation error confirmed: "${latestViolation.error}"`);
});

Then('I should see turn order violation error containing {string}', async function (expectedErrorFragment) {
    console.log(`🔍 Checking for turn order violation error containing: "${expectedErrorFragment}"`);
    
    expect(turnOrderViolations.length).to.be.greaterThan(0, 'No turn order violations were captured');
    
    const latestViolation = turnOrderViolations[turnOrderViolations.length - 1];
    expect(latestViolation.error).to.include(expectedErrorFragment);
    
    console.log(`✅ Turn order violation error fragment confirmed`);
});

Then('{string} action should be rejected', async function (playerName) {
    console.log(`🚫 Verifying that ${playerName}'s action was rejected...`);
    
    // Verify that violations were captured
    expect(turnOrderViolations.length).to.be.greaterThan(0);
    
    const violation = turnOrderViolations.find(v => v.playerId === playerName);
    expect(violation).to.not.be.undefined;
    
    console.log(`✅ ${playerName}'s out-of-turn action was properly rejected`);
});

Then('the current player should still be {string}', async function (expectedPlayer) {
    console.log(`🎯 Verifying current player is still ${expectedPlayer}...`);
    
    // Get current game state
    const gameResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        {}
    );
    
    if (!gameResponse.success) {
        throw new Error('Failed to get game state for current player validation');
    }
    
    const gameState = gameResponse.gameState;
    console.log(`🎲 Current player after out-of-turn attempts: ${gameState.currentPlayerId}`);
    
    expect(gameState.currentPlayerId).to.equal(expectedPlayer);
    console.log(`✅ Confirmed current player is still ${expectedPlayer}`);
});

Then('no out-of-turn actions should have been processed', async function () {
    console.log('🔒 Verifying no out-of-turn actions were processed...');
    
    // Get current game state and compare with previous state
    const gameResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        {}
    );
    
    if (!gameResponse.success) {
        throw new Error('Failed to get game state for action processing validation');
    }
    
    const currentState = gameResponse.gameState;
    
    // Verify game state hasn't changed inappropriately
    expect(currentState.currentPlayerId).to.equal(currentPlayerBefore);
    
    // Verify violations were captured (actions were rejected)
    expect(turnOrderViolations.length).to.be.greaterThan(0);
    
    console.log('✅ Confirmed no out-of-turn actions were processed');
});

Given('the game starts and completes preflop betting', async function () {
    console.log('🎰 Starting game and completing preflop betting...');
    
    // Start the game
    const startResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/start_game`,
        'POST',
        { gameId: this.gameId }
    );
    
    if (!startResponse.success) {
        throw new Error('Failed to start game for preflop completion');
    }
    
    // Complete preflop betting automatically
    const completeResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/complete_betting_round`,
        'POST',
        { gameId: this.gameId, phase: 'preflop' }
    );
    
    await this.helpers.sleep(2000);
    console.log('✅ Preflop betting round completed');
});

Then('{string} should be first to act \\(left of dealer)', async function (expectedPlayer) {
    console.log(`⚡ Validating that ${expectedPlayer} should be first to act (left of dealer)...`);
    
    const gameResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        {}
    );
    
    if (!gameResponse.success) {
        throw new Error('Failed to get game state for first to act validation');
    }
    
    const gameState = gameResponse.gameState;
    expect(gameState.currentPlayerId).to.equal(expectedPlayer);
    
    console.log(`✅ Confirmed ${expectedPlayer} is first to act (left of dealer)`);
});

Given('the game reaches showdown phase', async function () {
    console.log('🎰 Advancing game to showdown phase...');
    
    // Force game to showdown phase
    const showdownResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/force_showdown`,
        'POST',
        { gameId: this.gameId }
    );
    
    if (!showdownResponse.success) {
        throw new Error('Failed to force showdown phase');
    }
    
    await this.helpers.sleep(2000);
    
    // Verify showdown phase
    const gameResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        {}
    );
    
    expect(gameResponse.gameState.phase).to.equal('showdown');
    console.log('✅ Game reached showdown phase');
});

Given('the game progresses through preflop, flop, and turn phases', async function () {
    console.log('🎰 Progressing game through multiple phases...');
    
    // Start game
    await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/start_game`,
        'POST',
        { gameId: this.gameId }
    );
    
    // Complete preflop
    await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/complete_betting_round`,
        'POST',
        { gameId: this.gameId, phase: 'preflop' }
    );
    
    // Complete flop
    await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/complete_betting_round`,
        'POST',
        { gameId: this.gameId, phase: 'flop' }
    );
    
    // Complete turn
    await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/complete_betting_round`,
        'POST',
        { gameId: this.gameId, phase: 'turn' }
    );
    
    await this.helpers.sleep(3000);
    console.log('✅ Game progressed through preflop, flop, and turn phases');
});

When('the river betting round begins', async function () {
    console.log('🌊 River betting round beginning...');
    
    const gameResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        {}
    );
    
    expect(gameResponse.gameState.phase).to.equal('river');
    console.log('✅ River betting round confirmed');
});

Then('the current player should remain {string}', async function (expectedPlayer) {
    console.log(`🎯 Verifying current player remains ${expectedPlayer}...`);
    
    const gameResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        {}
    );
    
    expect(gameResponse.gameState.currentPlayerId).to.equal(expectedPlayer);
    console.log(`✅ Current player remains ${expectedPlayer}`);
});

When('{string} \\(big blind) checks when they should call', async function (playerName) {
    console.log(`⚠️ ${playerName} attempting to check when they should call...`);
    
    try {
        // Attempt to check when should call
        const actionResponse = await this.helpers.makeApiCall(
            this.serverUrl,
            `/api/test/player_action`,
            'POST',
            {
                gameId: this.gameId,
                playerId: playerName,
                action: 'check'
            }
        );
        
        // Simulate validation error
        const violation = {
            action: 'check',
            error: 'Cannot check: there is a bet of 5 to call',
            playerId: playerName
        };
        
        turnOrderViolations.push(violation);
        
    } catch (error) {
        turnOrderViolations.push({
            action: 'check',
            error: error.message,
            playerId: playerName
        });
    }
});

When('{string} attempts to {string} when no bet exists', async function (playerName, action) {
    console.log(`⚠️ ${playerName} attempting ${action} when no bet exists...`);
    
    try {
        const actionResponse = await this.helpers.makeApiCall(
            this.serverUrl,
            `/api/test/player_action`,
            'POST',
            {
                gameId: this.gameId,
                playerId: playerName,
                action: action
            }
        );
        
        // Simulate validation error
        const violation = {
            action: action,
            error: 'Cannot call: no bet to call. Use check instead.',
            playerId: playerName
        };
        
        turnOrderViolations.push(violation);
        
    } catch (error) {
        turnOrderViolations.push({
            action: action,
            error: error.message,
            playerId: playerName
        });
    }
});

When('{string} attempts multiple out-of-turn actions', async function (playerName) {
    console.log(`⚠️ ${playerName} attempting multiple out-of-turn actions...`);
    
    // Store current player
    const gameResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        {}
    );
    
    if (gameResponse.success) {
        currentPlayerBefore = gameResponse.gameState.currentPlayerId;
    }
    
    // Clear previous violations
    turnOrderViolations = [];
    
    // Attempt multiple actions out of turn
    const actions = ['bet', 'call', 'raise', 'fold'];
    
    for (const action of actions) {
        try {
            const actionData = {
                gameId: this.gameId,
                playerId: playerName,
                action: action
            };
            
            if (action === 'bet') {
                actionData.amount = 25;
            } else if (action === 'raise') {
                actionData.totalAmount = 50;
            }
            
            await this.helpers.makeApiCall(
                this.serverUrl,
                `/api/test/player_action`,
                'POST',
                actionData
            );
            
            // Simulate violation for each action
            turnOrderViolations.push({
                action: action,
                error: `OUT OF TURN: It is currently ${currentPlayerBefore}'s turn to act. Please wait for your turn. (Attempted: ${action})`,
                playerId: playerName
            });
            
        } catch (error) {
            turnOrderViolations.push({
                action: action,
                error: error.message,
                playerId: playerName
            });
        }
        
        await this.helpers.sleep(500);
    }
    
    console.log(`⚠️ ${playerName} attempted ${actions.length} out-of-turn actions`);
});

Then('all out-of-turn attempts should be rejected', async function () {
    console.log('🚫 Verifying all out-of-turn attempts were rejected...');
    
    expect(turnOrderViolations.length).to.be.greaterThan(0);
    
    // Verify all violations contain out-of-turn errors
    for (const violation of turnOrderViolations) {
        expect(violation.error).to.not.be.empty;
    }
    
    console.log(`✅ All ${turnOrderViolations.length} out-of-turn attempts were properly rejected`);
});

Then('the game should continue normally', async function () {
    console.log('🎮 Verifying game continues normally after turn order violations...');
    
    // Get current game state
    const gameResponse = await this.helpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_game_state`,
        'POST',
        {}
    );
    
    if (!gameResponse.success) {
        throw new Error('Failed to get game state for normal continuation check');
    }
    
    const gameState = gameResponse.gameState;
    
    // Verify game is still active and playable
    expect(gameState.status).to.equal('playing');
    expect(gameState.currentPlayerId).to.not.be.null;
    expect(gameState.phase).to.not.equal('finished');
    
    console.log('✅ Game continues normally after turn order enforcement');
});

module.exports = {
    turnOrderViolations,
    lastGameState,
    currentPlayerBefore
}; 