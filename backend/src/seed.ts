import { prisma } from './db';

async function main() {
  console.log('Seeding database...');

  // Create default tables
  const tables = [
    {
      name: "Texas Hold'em #1",
      maxPlayers: 6,
      smallBlind: 5,
      bigBlind: 10,
      minBuyIn: 100,
      maxBuyIn: 1000
    },
    {
      name: "Texas Hold'em #2", 
      maxPlayers: 4,
      smallBlind: 10,
      bigBlind: 20,
      minBuyIn: 200,
      maxBuyIn: 2000
    },
    {
      name: "High Stakes",
      maxPlayers: 6,
      smallBlind: 25,
      bigBlind: 50,
      minBuyIn: 500,
      maxBuyIn: 5000
    }
  ];

  for (const table of tables) {
    // Check if table already exists
    const existing = await prisma.table.findFirst({
      where: { name: table.name }
    });

    if (!existing) {
      await prisma.table.create({
        data: table
      });
      console.log(`Created table: ${table.name}`);
    } else {
      console.log(`Table already exists: ${table.name}`);
    }
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 