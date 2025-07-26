#!/usr/bin/env node

const io = require('socket.io-client');

async function testWebSocketConnection() {
  console.log('🧪 Testing direct WebSocket connection...');
  
  const socket = io('http://localhost:3001', {
    transports: ['websocket', 'polling']
  });
  
  socket.on('connect', () => {
    console.log('✅ Socket connected successfully!');
    console.log('   Socket ID:', socket.id);
    
    // Test sending a gameState event
    console.log('📡 Emitting test gameState event...');
    socket.emit('gameState', { test: 'data' });
    
    setTimeout(() => {
      socket.disconnect();
      console.log('🔌 Disconnected');
    }, 3000);
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });
  
  socket.on('gameState', (data) => {
    console.log('🎮 Received gameState event:', data);
  });
  
  // Wait for connection
  await new Promise(resolve => {
    socket.on('connect', resolve);
    setTimeout(() => {
      console.log('⏰ Connection timeout');
      resolve();
    }, 10000);
  });
}

testWebSocketConnection().catch(console.error);