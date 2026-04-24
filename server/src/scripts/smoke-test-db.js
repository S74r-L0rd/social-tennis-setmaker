const prisma = require("../lib/prisma");

async function main() {
  const sessionCount = await prisma.session.count();
  const playerCount = await prisma.player.count();
  const roundCount = await prisma.round.count();
  const matchCount = await prisma.match.count();

  console.log("Database connection successful.");
  console.log("Session count:", sessionCount);
  console.log("Player count:", playerCount);
  console.log("Round count:", roundCount);
  console.log("Match count:", matchCount);
}

main()
  .catch((error) => {
    console.error("Smoke test failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });