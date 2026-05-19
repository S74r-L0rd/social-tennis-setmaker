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

async function createSession(data, userId) {
  return prisma.session.create({
    data: {
      ...data,
      createdById: userId,
    },
    include: sessionInclude,
  });
}

async function getAllSessions(userId) {
  return prisma.session.findMany({
    where: { createdById: userId },
    orderBy: {
      createdAt: "desc",
    },
    include: sessionInclude,
  });
}

async function getSessionById(id, userId) {
  return prisma.session.findUnique({
    where: { id },
    include: sessionInclude,
  }).then((session) => {
    if (!session || session.createdById !== userId) return null;
    return session;
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
