const prisma = require("../lib/prisma");

async function addPlayerToSession(data) {
  return prisma.sessionPlayer.create({
    data,
    include: {
      player: true,
      session: true,
    },
  });
}

async function getSessionPlayers(sessionId) {
  return prisma.sessionPlayer.findMany({
    where: { sessionId },
    include: {
      player: true,
    },
    orderBy: {
      id: "asc",
    },
  });
}

async function getSessionPlayerById(id) {
  return prisma.sessionPlayer.findUnique({
    where: { id },
    include: {
      player: true,
      session: true,
      sitOuts: true,
    },
  });
}

async function updateSessionPlayer(id, data) {
  return prisma.sessionPlayer.update({
    where: { id },
    data,
    include: {
      player: true,
      session: true,
    },
  });
}

async function removeSessionPlayer(id) {
  return prisma.sessionPlayer.delete({
    where: { id },
  });
}

module.exports = {
  addPlayerToSession,
  getSessionPlayers,
  getSessionPlayerById,
  updateSessionPlayer,
  removeSessionPlayer,
};