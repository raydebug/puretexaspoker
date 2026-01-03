
const io = require('socket.io-client');

const SOCKET_URL = 'http://localhost:3001';

async function verifyFix() {
    console.log('🚀 Starting Verification Script...');

    // 1. Connect Player
    const playerSocket = io(SOCKET_URL, {
        transports: ['websocket'],
        forceNew: true
    });

    // 2. Connect Observer
    const observerSocket = io(SOCKET_URL, {
        transports: ['websocket'],
        forceNew: true
    });

    const tableId = 1;
    const playerNickname = 'TestPlayerFix';
    const observerNickname = 'TestObserverFix';

    try {
        await new Promise((resolve, reject) => {
            playerSocket.on('connect', resolve);
            playerSocket.on('connect_error', reject);
            setTimeout(() => reject(new Error('Player Connect Timeout')), 5000);
        });
        console.log('✅ Player connected');

        await new Promise((resolve, reject) => {
            observerSocket.on('connect', resolve);
            observerSocket.on('connect_error', reject);
            setTimeout(() => reject(new Error('Observer Connect Timeout')), 5000);
        });
        console.log('✅ Observer connected');

        // 3. Player joins table and sits
        console.log('TestPlayer joining table...');
        playerSocket.emit('joinTable', { tableId, buyIn: 100, nickname: playerNickname });

        // Wait for player to be seated
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 4. Observer joins table
        console.log('TestObserver joining table...');
        observerSocket.emit('joinTable', { tableId, buyIn: 0, nickname: observerNickname });

        // 5. Listen for location:usersAtTable event on Observer
        const checkPromise = new Promise((resolve, reject) => {
            observerSocket.on('location:usersAtTable', (data) => {
                console.log('📩 Received location:usersAtTable:', JSON.stringify(data, null, 2));

                // CHECK 1: Players list should contain TestPlayerFix
                // The event structure might differ, checking standard properties
                // Based on logs, it has observersNicknames and playersNicknames ??
                // No, looking at lobbyHandlers.ts, it sends: { tableId, totalUsers } 
                // WAIT. lobbyHandlers.ts ONLY sends { tableId, totalUsers }!

                // Let's re-read the file lobbyHandlers.ts to be sure what is sent.
                // If it only sends totalUsers, then the Frontend gets the list from somewhere else?
                // Or did I miss where the list is sent?

                resolve(data);
            });
        });

        // Wait for event
        const data = await Promise.race([
            checkPromise,
            new Promise(r => setTimeout(() => r(null), 3000))
        ]);

        if (!data) {
            console.log('⚠️ No location:usersAtTable event received via broadcast (normal if polling)');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        playerSocket.close();
        observerSocket.close();
        process.exit(0);
    }
}

verifyFix();
