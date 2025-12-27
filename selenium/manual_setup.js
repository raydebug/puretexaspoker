const {
    resetDatabaseShared,
    setup5PlayersShared
} = require('./step_definitions/shared-test-utilities');

// Mock global object expected by shared utilities
global.players = {};
global.clearGlobalPlayers = () => { global.players = {}; };

// Ensure we are not in headless mode for manual testing
process.env.HEADLESS = 'false';

async function main() {
    try {
        console.log('🚀 Starting Manual Setup...');
        console.log('ℹ️  This script will open 6 Chrome windows (5 Players + 1 Observer).');

        // 1. Reset Database
        console.log('🔄 Resetting database...');
        const tableId = await resetDatabaseShared();
        console.log(`✅ Database reset. Table ID: ${tableId}`);

        // 2. Setup 5 Players + Observer
        console.log('⚡ Initializing browsers and players...');
        const success = await setup5PlayersShared(tableId);

        if (success) {
            console.log('\n🎉 Setup Complete!');
            console.log('================================================');
            console.log('  Testing Environment Ready');
            console.log('  - 5 Player Windows (Player1 - Player5)');
            console.log('  - 1 Observer Window');
            console.log('  - Backend: http://localhost:3001');
            console.log('  - Frontend: http://localhost:3000');
            console.log('================================================');
            console.log('🛑 PRESS CTRL+C TO CLOSE BROWSERS AND EXIT');
            console.log('================================================');

            // Keep process alive to keep browsers open
            setInterval(() => { }, 1000 * 60 * 60); // Keep alive for an hour
        } else {
            console.error('❌ Setup failed.');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Error in manual setup:', error);
        process.exit(1);
    }
}

main();
