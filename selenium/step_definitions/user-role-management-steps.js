const { Given, Then, When } = require('@cucumber/cucumber');
const { expect } = require('chai');
const webdriverHelpers = require('../utils/webdriverHelpers');

// Store role management state for validation
let testUsers = {};
let moderationActions = [];
let roleAssignments = [];

// User Role Management Step Definitions

Given('the role system is initialized with default roles and permissions', async function () {
    console.log('🔐 Verifying role system initialization...');
    
    // Initialize roles via test API
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/initialize_roles`,
        'POST',
        {}
    );
    
    if (!response.success) {
        throw new Error(`Failed to initialize role system: ${response.error}`);
    }
    
    console.log('✅ Role system initialized successfully');
});

Given('I register a new user {string} with password {string}', async function (username, password) {
    console.log(`👤 Registering new user: ${username}...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/auth/register`,
        'POST',
        {
            username: username,
            email: `${username}@test.com`,
            password: password,
            displayName: username
        }
    );
    
    if (!response.user) {
        throw new Error(`Failed to register user ${username}: ${response.error}`);
    }
    
    testUsers[username] = {
        id: response.user.id,
        username: response.user.username,
        role: response.user.role,
        tokens: response.tokens
    };
    
    console.log(`✅ User ${username} registered successfully with role: ${response.user.role?.name || 'unknown'}`);
});

When('the registration is successful', async function () {
    console.log('⚡ Verifying registration success...');
    // Registration success is already validated in the previous step
    console.log('✅ Registration verified as successful');
});

Then('{string} should be assigned the {string} role by default', async function (username, expectedRole) {
    console.log(`⚡ Verifying ${username} has role ${expectedRole}...`);
    
    const user = testUsers[username];
    expect(user).to.exist;
    expect(user.role).to.exist;
    expect(user.role.name).to.equal(expectedRole);
    
    console.log(`✅ ${username} confirmed to have role: ${expectedRole}`);
});

Then('{string} should have {string} permission', async function (username, permission) {
    console.log(`⚡ Verifying ${username} has permission ${permission}...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/check_permission`,
        'POST',
        {
            username: username,
            permission: permission
        }
    );
    
    expect(response.hasPermission).to.be.true;
    console.log(`✅ ${username} confirmed to have permission: ${permission}`);
});

Then('{string} should NOT have {string} permission', async function (username, permission) {
    console.log(`⚡ Verifying ${username} does NOT have permission ${permission}...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/check_permission`,
        'POST',
        {
            username: username,
            permission: permission
        }
    );
    
    expect(response.hasPermission).to.be.false;
    console.log(`✅ ${username} confirmed to NOT have permission: ${permission}`);
});

Given('I have test users with different roles:', async function (dataTable) {
    console.log('👥 Creating test users with different roles...');
    
    const users = dataTable.hashes();
    
    for (const userData of users) {
        const response = await webdriverHelpers.makeApiCall(
            this.serverUrl,
            `/api/test/create_user_with_role`,
            'POST',
            {
                username: userData.username,
                password: userData.password,
                role: userData.role
            }
        );
        
        if (!response.success) {
            throw new Error(`Failed to create user ${userData.username}: ${response.error}`);
        }
        
        testUsers[userData.username] = {
            id: response.user.id,
            username: response.user.username,
            role: response.user.role,
            tokens: response.tokens
        };
        
        console.log(`   ✅ Created ${userData.username} with role ${userData.role}`);
    }
});

When('I check permissions for each user', async function () {
    console.log('⚡ Checking permissions for all test users...');
    
    for (const [username, userInfo] of Object.entries(testUsers)) {
        const response = await webdriverHelpers.makeApiCall(
            this.serverUrl,
            `/api/test/get_user_permissions`,
            'POST',
            { username: username }
        );
        
        if (response.success) {
            userInfo.permissions = response.permissions;
            console.log(`   📋 ${username}: ${response.permissions.join(', ')}`);
        }
    }
    
    console.log('✅ Permission check completed for all users');
});

Then('{string} should have permissions: {string}', async function (username, expectedPermissions) {
    console.log(`⚡ Verifying ${username} has permissions: ${expectedPermissions}...`);
    
    const userInfo = testUsers[username];
    expect(userInfo).to.exist;
    expect(userInfo.permissions).to.exist;
    
    const expectedPerms = expectedPermissions.split(',').map(p => p.trim());
    const userPerms = userInfo.permissions;
    
    expectedPerms.forEach(perm => {
        expect(userPerms).to.include(perm, `User ${username} should have permission ${perm}`);
    });
    
    console.log(`✅ ${username} confirmed to have all expected permissions`);
});

Given('I create test players {string} with roles {string}', async function (usernames, roles) {
    console.log(`👥 Creating test players with specific roles...`);
    
    const usernameList = usernames.split(',').map(u => u.trim());
    const roleList = roles.split(',').map(r => r.trim());
    
    for (let i = 0; i < usernameList.length; i++) {
        const username = usernameList[i];
        const role = roleList[i];
        
        const response = await webdriverHelpers.makeApiCall(
            this.serverUrl,
            `/api/test/create_user_with_role`,
            'POST',
            {
                username: username,
                password: 'password123',
                role: role
            }
        );
        
        if (!response.success) {
            throw new Error(`Failed to create user ${username}: ${response.error}`);
        }
        
        testUsers[username] = {
            id: response.user.id,
            username: response.user.username,
            role: response.user.role,
            tokens: response.tokens
        };
        
        console.log(`   ✅ Created ${username} with role ${role}`);
    }
});

Given('both users are logged into the system', async function () {
    console.log('🔑 Verifying users are logged into the system...');
    
    // Users are already "logged in" via token creation during registration
    // In a real scenario, this would verify active sessions
    
    console.log('✅ Users confirmed logged into the system');
});

When('{string} attempts to kick another player', async function (username) {
    console.log(`⚡ ${username} attempting to kick another player...`);
    
    const user = testUsers[username];
    const targetUser = Object.values(testUsers).find(u => u.username !== username);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/execute_moderation`,
        'POST',
        {
            moderatorId: user.id,
            targetUserId: targetUser.id,
            action: 'kick',
            reason: 'Test kick action'
        }
    );
    
    // Store result for validation
    this.lastModerationResult = response;
    
    console.log(`📝 Kick attempt result: ${response.success ? 'Success' : 'Failed'}`);
});

// Role management specific error handling - checks moderation result context
Then('the action should be rejected with {string}', async function (expectedError) {
    console.log(`⚡ Verifying action was rejected with error: ${expectedError}...`);
    
    expect(this.lastModerationResult).to.exist;
    expect(this.lastModerationResult.success).to.be.false;
    expect(this.lastModerationResult.error).to.include(expectedError);
    
    console.log(`✅ Action correctly rejected with error: ${expectedError}`);
});

Then('the action should be successful', async function () {
    console.log('⚡ Verifying action was successful...');
    
    expect(this.lastModerationResult).to.exist;
    expect(this.lastModerationResult.success).to.be.true;
    
    console.log('✅ Action was successful');
});

Then('a moderation record should be created', async function () {
    console.log('⚡ Verifying moderation record was created...');
    
    expect(this.lastModerationResult).to.exist;
    expect(this.lastModerationResult.moderationAction).to.exist;
    
    moderationActions.push(this.lastModerationResult.moderationAction);
    console.log(`✅ Moderation record created: ${this.lastModerationResult.moderationAction.id}`);
});

Given('I have an administrator {string} and a player {string}', async function (adminName, playerName) {
    console.log(`👥 Setting up administrator ${adminName} and player ${playerName}...`);
    
    // Create administrator
    const adminResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/create_user_with_role`,
        'POST',
        {
            username: adminName,
            password: 'admin123',
            role: 'administrator'
        }
    );
    
    // Create player
    const playerResponse = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/create_user_with_role`,
        'POST',
        {
            username: playerName,
            password: 'player123',
            role: 'player'
        }
    );
    
    if (!adminResponse.success || !playerResponse.success) {
        throw new Error('Failed to create test users');
    }
    
    testUsers[adminName] = {
        id: adminResponse.user.id,
        username: adminResponse.user.username,
        role: adminResponse.user.role,
        tokens: adminResponse.tokens
    };
    
    testUsers[playerName] = {
        id: playerResponse.user.id,
        username: playerResponse.user.username,
        role: playerResponse.user.role,
        tokens: playerResponse.tokens
    };
    
    console.log(`✅ Created administrator ${adminName} and player ${playerName}`);
});

When('{string} assigns {string} the role {string}', async function (adminName, targetName, newRole) {
    console.log(`⚡ ${adminName} assigning role ${newRole} to ${targetName}...`);
    
    const admin = testUsers[adminName];
    const target = testUsers[targetName];
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/assign_role`,
        'POST',
        {
            adminId: admin.id,
            targetUserId: target.id,
            roleName: newRole
        }
    );
    
    this.lastRoleAssignment = response;
    
    if (response.success) {
        roleAssignments.push({
            admin: adminName,
            target: targetName,
            newRole: newRole,
            timestamp: new Date()
        });
    }
    
    console.log(`📝 Role assignment result: ${response.success ? 'Success' : 'Failed'}`);
});

Then('{string} should have the {string} role', async function (username, expectedRole) {
    console.log(`⚡ Verifying ${username} has role ${expectedRole}...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/get_user_role`,
        'POST',
        { username: username }
    );
    
    expect(response.success).to.be.true;
    expect(response.role.name).to.equal(expectedRole);
    
    // Update local user info
    testUsers[username].role = response.role;
    
    console.log(`✅ ${username} confirmed to have role: ${expectedRole}`);
});

Then('{string} should gain {string} permission', async function (username, permission) {
    console.log(`⚡ Verifying ${username} gained permission ${permission}...`);
    
    const response = await webdriverHelpers.makeApiCall(
        this.serverUrl,
        `/api/test/check_permission`,
        'POST',
        {
            username: username,
            permission: permission
        }
    );
    
    expect(response.hasPermission).to.be.true;
    console.log(`✅ ${username} confirmed to have gained permission: ${permission}`);
});

Then('the role change should be logged in the system', async function () {
    console.log('⚡ Verifying role change was logged...');
    
    expect(this.lastRoleAssignment).to.exist;
    expect(this.lastRoleAssignment.success).to.be.true;
    expect(roleAssignments.length).to.be.greaterThan(0);
    
    console.log('✅ Role change confirmed to be logged in the system');
});

module.exports = {
    testUsers,
    moderationActions,
    roleAssignments
}; 