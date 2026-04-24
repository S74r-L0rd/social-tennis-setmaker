const prisma = require("../lib/prisma");

async function createMatch(data) {
  return prisma.match.create({
    data,
    include: {
      assignments: {
        include: {
          player: true,
        },
      },
      round: true,
    },
  });
}

async function getMatchesByRoundId(roundId) {
  return prisma.match.findMany({
    where: { roundId },
    orderBy: {
      matchOrder: "asc",
    },
    include: {
      assignments: {
        include: {
          player: true,
        },
        orderBy: [
          { teamNumber: "asc" },
          { positionInTeam: "asc" },
        ],
      },
    },
  });
}

async function getMatchById(id) {
  return prisma.match.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          player: true,
        },
        orderBy: [
          { teamNumber: "asc" },
          { positionInTeam: "asc" },
        ],
      },
      round: true,
    },
  });
}

async function createMatchAssignment(data) {
  return prisma.matchAssignment.create({
    data,
    include: {
      player: true,
      match: true,
    },
  });
}

async function getAssignmentsByMatchId(matchId) {
  return prisma.matchAssignment.findMany({
    where: { matchId },
    include: {
      player: true,
    },
    orderBy: [
      { teamNumber: "asc" },
      { positionInTeam: "asc" },
    ],
  });
}

module.exports = {
  createMatch,
  getMatchesByRoundId,
  getMatchById,
  createMatchAssignment,
  getAssignmentsByMatchId,
};