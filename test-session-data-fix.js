const io = require('socket.io-client');

console.log('🧪 Testing Session Data Fix After updateUserLocation Handler Update');
console.log('===================================================================');

// Connect to backend
const socket = io('http://localhost:3001');

socket.on('connect', () => {
    console.log(`✅ Connected with socket ID: ${socket.id}`);
    
    // Step 1: Send updateUserLocation (like the frontend does)
    console.log('\n📝 Step 1: Sending updateUserLocation...');
    socket.emit('updateUserLocation', { 
        tableId: 3, 
        nickname: 'SessionTestUser' 
    });
});

socket.on('location:updated', (data) => {
    console.log('✅ Received location:updated event:', data);
    
    // Step 2: Try to take a seat after location update (this should now work!)
    console.log('\n📝 Step 2: Attempting to take seat...');
    setTimeout(() => {
        socket.emit('takeSeat', { 
            seatNumber: 4, 
            buyIn: 200 
        });
    }, 1000);
});

socket.on('seatTaken', (data) => {
    console.log('🎉 SUCCESS! Received seatTaken event:', data);
    console.log('✅ Session data bug is FIXED!');
    process.exit(0);
});

socket.on('seatError', (error) => {
    console.log('❌ FAILED! Received seatError:', error);
    console.log('💥 Session data bug still exists');
    process.exit(1);
});

socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server');
});

// Set timeout to exit if no response
setTimeout(() => {
    console.log('⏰ Test timed out - exiting');
    process.exit(1);
}, 15000); 