const prisma = require("../lib/prisma");

const sessionInclude = {
  courts: true,
  sessionPlayers: {
    include: {
      player: true,
    },
  },
  rounds: {
    orderBy: {
      roundNumber: "asc",
    },
    include: {
      matches: {
        orderBy: {
          matchOrder: "asc",
        },
        include: {
          assignments: {
            orderBy: [
              { teamNumber: "asc" },
              { positionInTeam: "asc" },
            ],
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
  },
};

async function createSession(data) {
  return prisma.session.create({
    data,
    include: sessionInclude,
  });
}

async function getAllSessions() {
  return prisma.session.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: sessionInclude,
  });
}

async function getSessionById(id) {
  return prisma.session.findUnique({
    where: { id },
    include: sessionInclude,
  });
}

async function updateSession(id, data) {
  return prisma.session.update({
    where: { id },
    data,
    include: sessionInclude,
  });
}

async function deleteSession(id) {
  return prisma.session.delete({
    where: { id },
  });
}

module.exports = {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession,
};
