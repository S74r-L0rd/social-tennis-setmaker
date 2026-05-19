const prisma = require("../lib/prisma");

async function createPlayer(data, userId) {
  return prisma.player.create({
    data: {
      ...data,
      createdById: userId,
    },
  });
}

async function getAllPlayers(userId) {
  return prisma.player.findMany({
    where: { createdById: userId },
    orderBy: {
      name: "asc",
    },
  });
}

async function getPlayerById(id, userId) {
  return prisma.player.findFirst({
    where: { id, createdById: userId },
  });
}

async function getPlayerScheduleUsage(id) {
  const [matchAssignments, sitOuts] = await Promise.all([
    prisma.matchAssignment.count({
      where: { playerId: id },
    }),
    prisma.roundSitOut.count({
      where: {
        sessionPlayer: {
          playerId: id,
        },
      },
    }),
  ]);

  return { matchAssignments, sitOuts };
}

async function updatePlayer(id, data) {
  return prisma.player.update({
    where: { id },
    data,
  });
}

async function deletePlayer(id) {
  return prisma.player.delete({
    where: { id },
  });
}

module.exports = {
  createPlayer,
  getAllPlayers,
  getPlayerById,
  getPlayerScheduleUsage,
  updatePlayer,
  deletePlayer,
};
