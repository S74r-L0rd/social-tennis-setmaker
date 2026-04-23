const prisma = require("../lib/prisma");

async function createSession(data) {
  return prisma.session.create({
    data,
    include: {
      courts: true,
      sessionPlayers: {
        include: {
          player: true,
        },
      },
      rounds: true,
    },
  });
}

async function getAllSessions() {
  return prisma.session.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      courts: true,
      sessionPlayers: {
        include: {
          player: true,
        },
      },
      rounds: true,
    },
  });
}

async function getSessionById(id) {
  return prisma.session.findUnique({
    where: { id },
    include: {
      courts: true,
      sessionPlayers: {
        include: {
          player: true,
        },
      },
      rounds: {
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
        orderBy: {
          roundNumber: "asc",
        },
      },
    },
  });
}

async function updateSession(id, data) {
  return prisma.session.update({
    where: { id },
    data,
    include: {
      courts: true,
      sessionPlayers: {
        include: {
          player: true,
        },
      },
      rounds: true,
    },
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