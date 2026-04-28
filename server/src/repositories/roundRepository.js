const prisma = require("../lib/prisma");

async function createRound(data) {
  return prisma.round.create({
    data,
    include: {
      matches: true,
      sitOuts: true,
      session: true,
    },
  });
}

async function getRoundsBySessionId(sessionId) {
  return prisma.round.findMany({
    where: { sessionId },
    orderBy: {
      roundNumber: "asc",
    },
    include: {
      matches: {
        include: {
          assignments: {
            include: {
              player: true,
            },
          },
        },
      },
      sitOuts: {
        include: {
          sessionPlayer: {
            include: {
              player: true,
            },
          },
        },
      },
    },
  });
}

async function getRoundById(id) {
  return prisma.round.findUnique({
    where: { id },
    include: {
      matches: {
        include: {
          assignments: {
            include: {
              player: true,
            },
          },
        },
      },
      sitOuts: {
        include: {
          sessionPlayer: {
            include: {
              player: true,
            },
          },
        },
      },
      session: true,
    },
  });
}

async function updateRound(id, data) {
  return prisma.round.update({
    where: { id },
    data,
    include: {
      matches: true,
      sitOuts: true,
      session: true,
    },
  });
}

module.exports = {
  createRound,
  getRoundsBySessionId,
  getRoundById,
  updateRound,
};