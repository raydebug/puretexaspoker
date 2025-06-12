const io = require('socket.io-client');

console.log('🔍 Manual Session Data Debug Test - Different User');
console.log('=================================================');

// Connect to backend
const socket = io('http://localhost:3001');

socket.on('connect', () => {
    console.log(`✅ Connected with socket ID: ${socket.id}`);
    
    // Step 1: Join table as observer
    console.log('\n📝 Step 1: Joining table as observer...');
    socket.emit('joinTable', { 
        tableId: 2, 
        buyIn: 150, 
        nickname: 'SecondTestUser' 
    });
});

socket.on('tableJoined', (data) => {
    console.log('✅ Received tableJoined event:', data);
    
    // Step 2: Try to take a seat
    console.log('\n📝 Step 2: Attempting to take seat...');
    setTimeout(() => {
        socket.emit('takeSeat', { 
            seatNumber: 5, 
            buyIn: 150 
        });
    }, 2000); // Wait 2 seconds
});

socket.on('seatTaken', (data) => {
    console.log('✅ SUCCESS: Received seatTaken event:', data);
    console.log('🎉 Session data bug is FIXED!');
    process.exit(0);
});

socket.on('seatError', (error) => {
    console.log('❌ FAILURE: Received seatError event:', error);
    if (error.includes('Invalid session data')) {
        console.log('🐛 Session data bug is STILL PRESENT');
    }
    process.exit(1);
});

socket.on('tableError', (error) => {
    console.log('❌ Table error:', error);
    process.exit(1);
});

socket.on('gameJoined', (data) => {
    console.log('📋 Received gameJoined event:', {
        gameId: data.gameId,
        playerId: data.playerId
    });
});

socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
});

// Timeout after 10 seconds
setTimeout(() => {
    console.log('⏰ Test timeout - no response received');
    process.exit(1);
}, 10000); 