#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function checkPlayers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('👥 Checking existing players...');
    
    const players = await prisma.player.findMany();
    console.log(`📊 Found ${players.length} players:`);
    
    players.forEach((player, index) => {
      console.log(`   ${index + 1}. ID: "${player.id}", Nickname: "${player.nickname}"`);
    });
    
    // Also check tables
    const tables = await prisma.table.findMany();
    console.log(`🎰 Found ${tables.length} tables:`);
    tables.forEach((table, index) => {
      console.log(`   ${index + 1}. ID: ${table.id}, Name: "${table.name}"`);
    });
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPlayers();