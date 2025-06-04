// First, try to create a player in the database if they don't exist
console.log(`DEBUG: Backend creating/updating player in database...`);
let player;
try {
  player = await prisma.player.upsert({
    where: { id: socket.id },
    update: { 
      nickname: nicknameToUse,
      chips: buyIn 
    },
    create: {
      id: socket.id,
      nickname: nicknameToUse,
      chips: buyIn
    }
  });
} catch (dbError: any) {
  // Handle unique constraint errors for nickname
  if (dbError.code === 'P2002' && dbError.meta?.target?.includes('nickname')) {
    console.log(`DEBUG: Backend nickname conflict for "${nicknameToUse}", using socket-based nickname`);
    const fallbackNickname = `Player${socket.id.slice(0, 6)}`;
    try {
      player = await prisma.player.upsert({
        where: { id: socket.id },
        update: { 
          nickname: fallbackNickname,
          chips: buyIn 
        },
        create: {
          id: socket.id,
          nickname: fallbackNickname,
          chips: buyIn
        }
      });
    } catch (fallbackError) {
      console.error(`DEBUG: Backend database error even with fallback nickname:`, fallbackError);
      socket.emit('tableError', 'Database error: Failed to create player');
      return;
    }
  } else {
    console.error(`DEBUG: Backend database error creating player:`, dbError);
    socket.emit('tableError', 'Database error: Failed to create player');
    return;
  }
}
console.log(`DEBUG: Backend player upserted:`, player); 