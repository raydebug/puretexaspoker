const io = require('socket.io-client');

async function testWebSocketConnection() {
  console.log('🔌 Testing WebSocket connection to backend...');
  
  // First, get the available tables
  console.log('📋 Getting available tables...');
  const tablesResponse = await fetch('http://localhost:3001/api/tables');
  const tables = await tablesResponse.json();
  console.log('📋 Available tables:', tables.map(t => ({ id: t.id, name: t.name })));
  
  if (tables.length === 0) {
    console.error('❌ No tables available');
    return;
  }
  
  const tableId = tables[0].id; // Use the first table
  console.log(`🎯 Using table ID: ${tableId}`);
  
  const socket = io('http://localhost:3001', {
    transports: ['websocket', 'polling'],
    timeout: 5000
  });
  
  socket.on('connect', () => {
    console.log('✅ WebSocket connected successfully!');
    console.log('🔌 Socket ID:', socket.id);
    console.log('🔌 Connected:', socket.connected);
    
    // Test authentication
    console.log('🔐 Testing authentication...');
    socket.emit('authenticate', { nickname: 'TestPlayer' });
  });
  
  socket.on('authenticated', (data) => {
    console.log('✅ Authentication successful:', data);
    
    // Test table joining
    console.log('🏃 Testing table join...');
    socket.emit('joinTable', { tableId, buyIn: 100 });
  });
  
  socket.on('tableJoined', (data) => {
    console.log('✅ Table joined successfully:', data);
    
    // Test seat taking
    console.log('💺 Testing seat taking...');
    socket.emit('takeSeat', { seatNumber: 1, buyIn: 100 });
  });
  
  socket.on('seatTaken', (data) => {
    console.log('✅ Seat taken successfully:', data);
    
    // Disconnect after successful test
    setTimeout(() => {
      socket.disconnect();
      console.log('🔌 WebSocket test completed successfully');
    }, 1000);
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ WebSocket connection error:', error);
  });
  
  socket.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket disconnected:', reason);
  });
  
  // Timeout after 10 seconds
  setTimeout(() => {
    if (socket.connected) {
      socket.disconnect();
    }
    console.log('⏰ WebSocket test timed out');
  }, 10000);
}

testWebSocketConnection(); 