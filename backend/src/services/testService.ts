import { prisma } from '../db';

export const clearDatabase = async () => {
  // Delete all records in reverse order of dependencies
  await prisma.message.deleteMany();
  await prisma.gameAction.deleteMany();
  await prisma.game.deleteMany();
  await prisma.playerTable.deleteMany();
  await prisma.table.deleteMany();
  await prisma.player.deleteMany();
}; 