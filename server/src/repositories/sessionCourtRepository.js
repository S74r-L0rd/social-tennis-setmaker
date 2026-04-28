const prisma = require("../lib/prisma");

async function addCourt(data) {
  return prisma.sessionCourt.create({
    data,
  });
}

async function getCourtsBySessionId(sessionId) {
  return prisma.sessionCourt.findMany({
    where: { sessionId },
    orderBy: [{ priorityOrder: "asc" }, { courtNumber: "asc" }],
  });
}

async function getCourtById(id) {
  return prisma.sessionCourt.findUnique({
    where: { id },
  });
}

async function updateCourt(id, data) {
  return prisma.sessionCourt.update({
    where: { id },
    data,
  });
}

async function deleteCourt(id) {
  return prisma.sessionCourt.delete({
    where: { id },
  });
}

// Replaces all courts for a session in one transaction.
// Used for initial setup or full reconfiguration.
async function bulkSetCourts(sessionId, courts) {
  return prisma.$transaction(async (tx) => {
    await tx.sessionCourt.deleteMany({ where: { sessionId } });

    const created = await Promise.all(
      courts.map((court) =>
        tx.sessionCourt.create({
          data: {
            sessionId,
            courtNumber: court.courtNumber,
            courtName: court.courtName ?? null,
            isAvailable: court.isAvailable ?? true,
            priorityOrder: court.priorityOrder ?? null,
          },
        })
      )
    );

    return created;
  });
}

module.exports = {
  addCourt,
  getCourtsBySessionId,
  getCourtById,
  updateCourt,
  deleteCourt,
  bulkSetCourts,
};
