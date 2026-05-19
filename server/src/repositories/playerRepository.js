const prisma = require("../lib/prisma");

async function createPlayer(data) {
  return prisma.player.create({
    data,
  });
}

async function getAllPlayers() {
  return prisma.player.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

async function getPlayerById(id) {
  return prisma.player.findUnique({
    where: { id },
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
