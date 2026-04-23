const prisma = require("../lib/prisma");

async function createRoundSitOut(data) {
  return prisma.roundSitOut.create({
    data,
    include: {
      round: true,
      sessionPlayer: {
        include: {
          player: true,
        },
      },
    },
  });
}

async function getSitOutsByRoundId(roundId) {
  return prisma.roundSitOut.findMany({
    where: { roundId },
    include: {
      sessionPlayer: {
        include: {
          player: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });
}

module.exports = {
  createRoundSitOut,
  getSitOutsByRoundId,
};