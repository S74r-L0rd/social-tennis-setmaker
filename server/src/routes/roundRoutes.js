const express = require("express");
const prisma = require("../lib/prisma");
const { generateRound } = require("../algorithm/scheduler");
const { getRoundsBySessionId, getRoundById, updateRound } = require("../repositories/roundRepository");
const { getSessionById } = require("../repositories/sessionRepository");
const { getSessionPlayers } = require("../repositories/sessionPlayerRepository");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function isValidId(value) {
  return Number.isInteger(value) && value > 0;
}

function makePairKey(a, b) {
  return [a, b].sort((x, y) => x - y).join("-");
}

function roundInclude() {
  return {
    matches: {
      orderBy: { matchOrder: "asc" },
      include: {
        assignments: {
          orderBy: [{ teamNumber: "asc" }, { positionInTeam: "asc" }],
          include: { player: true },
        },
      },
    },
    sitOuts: {
      include: {
        sessionPlayer: { include: { player: true } },
      },
    },
  };
}

function findPlayerPosition(round, playerId) {
  for (const match of round.matches ?? []) {
    for (const assignment of match.assignments ?? []) {
      if (assignment.playerId === playerId) {
        return { type: "match", match, assignment };
      }
    }
  }

  for (const sitOut of round.sitOuts ?? []) {
    if (sitOut.sessionPlayer?.playerId === playerId) {
      return { type: "sitout", sitOut, sessionPlayer: sitOut.sessionPlayer };
    }
  }

  return null;
}

// POST /api/rounds/generate
// Generates a round from DB state and saves the result back to DB
router.post("/generate", requireAuth, async (req, res) => {
  try {
    const sessionId = Number(req.body.sessionId);

    if (!isValidId(sessionId)) {
      return res.status(400).json({ success: false, error: "Invalid sessionId." });
    }

    // 1. Verify session exists and is ACTIVE
    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found." });
    }

    if (session.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        error: `Cannot generate a round for a session with status '${session.status}'. Activate the session first.`,
      });
    }

    // 2. Fetch active players for this session
    const sessionPlayers = await getSessionPlayers(sessionId);
    const activePlayers = sessionPlayers.filter(
      (sp) => sp.status === "ACTIVE" && sp.leftAt === null
    );

    if (activePlayers.length < 4) {
      return res.status(400).json({
        success: false,
        error: `Not enough active players. Need at least 4, have ${activePlayers.length}.`,
      });
    }

    // Map playerId -> sessionPlayer.id so we can update stats after generation
    const sessionPlayerMap = new Map(activePlayers.map((sp) => [sp.playerId, sp.id]));

    const players = activePlayers.map((sp) => ({
      id: sp.playerId,
      rating: sp.player.rating,
      sitOutCount: sp.sitOutCount,
    }));

    // 3. Fetch available courts (ordered by priority)
    const sessionCourts = await prisma.sessionCourt.findMany({
      where: { sessionId, isAvailable: true },
      orderBy: [{ priorityOrder: "asc" }, { courtNumber: "asc" }],
    });

    let courts;
    if (sessionCourts.length > 0) {
      courts = sessionCourts.map((c) => c.courtName || `Court ${c.courtNumber}`);
    } else if (session.courtCount && session.courtCount > 0) {
      courts = Array.from({ length: session.courtCount }, (_, i) => `Court ${i + 1}`);
    } else {
      return res.status(400).json({
        success: false,
        error: "No courts configured for this session.",
      });
    }

    // 4. Rebuild match history from all previous rounds in DB
    const previousRounds = await getRoundsBySessionId(sessionId);
    const history = { partner: {}, opponent: {} };

    for (const round of previousRounds) {
      for (const match of round.matches) {
        const team1 = match.assignments.filter((a) => a.teamNumber === 1);
        const team2 = match.assignments.filter((a) => a.teamNumber === 2);

        if (team1.length === 2) {
          const key = makePairKey(team1[0].playerId, team1[1].playerId);
          history.partner[key] = (history.partner[key] || 0) + 1;
        }
        if (team2.length === 2) {
          const key = makePairKey(team2[0].playerId, team2[1].playerId);
          history.partner[key] = (history.partner[key] || 0) + 1;
        }

        for (const p1 of team1) {
          for (const p2 of team2) {
            const key = makePairKey(p1.playerId, p2.playerId);
            history.opponent[key] = (history.opponent[key] || 0) + 1;
          }
        }
      }
    }

    // 5. Determine the next round number
    const nextRoundNumber = previousRounds.length + 1;

    // 6. Run the scheduling algorithm
    const result = generateRound(players, courts, history);

    // 7. Save round, matches, assignments, sit-outs and update player stats — all in one transaction
    const savedRound = await prisma.$transaction(async (tx) => {
      const round = await tx.round.create({
        data: { sessionId, roundNumber: nextRoundNumber },
      });

      const playersWhoPlayed = new Set();

      for (let i = 0; i < result.matches.length; i++) {
        const matchResult = result.matches[i];

        const match = await tx.match.create({
          data: {
            roundId: round.id,
            courtNumber: sessionCourts[i]?.courtNumber ?? i + 1,
            courtName: matchResult.court,
            matchOrder: i + 1,
          },
        });

        const [team1, team2] = matchResult.teams;

        for (let pos = 0; pos < team1.length; pos++) {
          await tx.matchAssignment.create({
            data: {
              matchId: match.id,
              playerId: team1[pos].id,
              teamNumber: 1,
              positionInTeam: pos + 1,
            },
          });
          playersWhoPlayed.add(team1[pos].id);
        }

        for (let pos = 0; pos < team2.length; pos++) {
          await tx.matchAssignment.create({
            data: {
              matchId: match.id,
              playerId: team2[pos].id,
              teamNumber: 2,
              positionInTeam: pos + 1,
            },
          });
          playersWhoPlayed.add(team2[pos].id);
        }
      }

      // Save sit-outs and increment their sitOutCount
      for (const sitOutPlayer of result.sitOuts) {
        const sessionPlayerId = sessionPlayerMap.get(sitOutPlayer.id);
        await tx.roundSitOut.create({
          data: { roundId: round.id, sessionPlayerId },
        });
        await tx.sessionPlayer.update({
          where: { id: sessionPlayerId },
          data: { sitOutCount: { increment: 1 } },
        });
      }

      // Increment roundsPlayed for everyone who played
      for (const playerId of playersWhoPlayed) {
        const sessionPlayerId = sessionPlayerMap.get(playerId);
        await tx.sessionPlayer.update({
          where: { id: sessionPlayerId },
          data: { roundsPlayed: { increment: 1 } },
        });
      }

      // Return the full round with all nested data
      return tx.round.findUnique({
        where: { id: round.id },
        include: {
          matches: {
            orderBy: { matchOrder: "asc" },
            include: {
              assignments: {
                orderBy: [{ teamNumber: "asc" }, { positionInTeam: "asc" }],
                include: { player: true },
              },
            },
          },
          sitOuts: {
            include: {
              sessionPlayer: { include: { player: true } },
            },
          },
        },
      });
    });

    res.status(201).json({ success: true, data: savedRound });
  } catch (error) {
    console.error("Generate round error:", error);
    res.status(500).json({ success: false, error: "Failed to generate round." });
  }
});

// PATCH /api/rounds/:id/swap
// Persists a manual drag/drop swap for an unconfirmed round.
router.patch("/:id/swap", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const playerIdA = Number(req.body.playerIdA);
    const playerIdB = Number(req.body.playerIdB);

    if (!isValidId(id) || !isValidId(playerIdA) || !isValidId(playerIdB)) {
      return res.status(400).json({ success: false, error: "Invalid round or player id." });
    }

    if (playerIdA === playerIdB) {
      return res.status(400).json({ success: false, error: "Select two different players to swap." });
    }

    const existing = await getRoundById(id);

    if (!existing) {
      return res.status(404).json({ success: false, error: "Round not found." });
    }

    if (existing.isConfirmed) {
      return res.status(400).json({
        success: false,
        error: "Confirmed rounds cannot be edited.",
      });
    }

    const positionA = findPlayerPosition(existing, playerIdA);
    const positionB = findPlayerPosition(existing, playerIdB);

    if (!positionA || !positionB) {
      return res.status(400).json({
        success: false,
        error: "Both players must be assigned to this round before they can be swapped.",
      });
    }

    const savedRound = await prisma.$transaction(async (tx) => {
      if (positionA.type === "match" && positionB.type === "match") {
        await tx.matchAssignment.deleteMany({
          where: { id: { in: [positionA.assignment.id, positionB.assignment.id] } },
        });

        await tx.matchAssignment.createMany({
          data: [
            {
              matchId: positionA.assignment.matchId,
              playerId: playerIdB,
              teamNumber: positionA.assignment.teamNumber,
              positionInTeam: positionA.assignment.positionInTeam,
            },
            {
              matchId: positionB.assignment.matchId,
              playerId: playerIdA,
              teamNumber: positionB.assignment.teamNumber,
              positionInTeam: positionB.assignment.positionInTeam,
            },
          ],
        });
      } else if (positionA.type === "sitout" && positionB.type === "sitout") {
        await tx.roundSitOut.deleteMany({
          where: { id: { in: [positionA.sitOut.id, positionB.sitOut.id] } },
        });

        await tx.roundSitOut.createMany({
          data: [
            { roundId: id, sessionPlayerId: positionB.sessionPlayer.id },
            { roundId: id, sessionPlayerId: positionA.sessionPlayer.id },
          ],
        });
      } else {
        const matchPosition = positionA.type === "match" ? positionA : positionB;
        const sitOutPosition = positionA.type === "sitout" ? positionA : positionB;
        const matchedPlayerId = matchPosition.assignment.playerId;
        const sitOutPlayerId = sitOutPosition.sessionPlayer.playerId;

        await tx.matchAssignment.delete({
          where: { id: matchPosition.assignment.id },
        });
        await tx.roundSitOut.delete({
          where: { id: sitOutPosition.sitOut.id },
        });

        await tx.matchAssignment.create({
          data: {
            matchId: matchPosition.assignment.matchId,
            playerId: sitOutPlayerId,
            teamNumber: matchPosition.assignment.teamNumber,
            positionInTeam: matchPosition.assignment.positionInTeam,
          },
        });

        const matchedSessionPlayer = await tx.sessionPlayer.findUnique({
          where: {
            sessionId_playerId: {
              sessionId: existing.sessionId,
              playerId: matchedPlayerId,
            },
          },
        });

        await tx.roundSitOut.create({
          data: {
            roundId: id,
            sessionPlayerId: matchedSessionPlayer.id,
          },
        });

        await tx.sessionPlayer.update({
          where: { id: matchedSessionPlayer.id },
          data: {
            roundsPlayed: { decrement: 1 },
            sitOutCount: { increment: 1 },
          },
        });

        await tx.sessionPlayer.update({
          where: { id: sitOutPosition.sessionPlayer.id },
          data: {
            roundsPlayed: { increment: 1 },
            sitOutCount: { decrement: 1 },
          },
        });
      }

      return tx.round.findUnique({
        where: { id },
        include: roundInclude(),
      });
    });

    res.status(200).json({ success: true, data: savedRound });
  } catch (error) {
    console.error("Swap round players error:", error);
    res.status(500).json({ success: false, error: "Failed to swap players." });
  }
});

// GET /api/rounds/session/:sessionId
router.get("/session/:sessionId", async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);

    if (!isValidId(sessionId)) {
      return res.status(400).json({ success: false, error: "Invalid sessionId." });
    }

    const rounds = await getRoundsBySessionId(sessionId);
    res.status(200).json({ success: true, data: rounds });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch rounds." });
  }
});

// DELETE /api/rounds/session/:sessionId
// Clears all persisted rounds for a session and resets session-player round stats.
router.delete("/session/:sessionId", requireAuth, async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);

    if (!isValidId(sessionId)) {
      return res.status(400).json({ success: false, error: "Invalid sessionId." });
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const deletedRounds = await tx.round.deleteMany({
        where: { sessionId },
      });

      await tx.sessionPlayer.updateMany({
        where: { sessionId },
        data: {
          roundsPlayed: 0,
          sitOutCount: 0,
        },
      });

      return { deletedRounds: deletedRounds.count };
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Clear schedule error:", error);
    res.status(500).json({ success: false, error: "Failed to clear schedule." });
  }
});

// GET /api/rounds/:id
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, error: "Invalid round id." });
    }

    const round = await getRoundById(id);

    if (!round) {
      return res.status(404).json({ success: false, error: "Round not found." });
    }

    res.status(200).json({ success: true, data: round });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch round." });
  }
});

// POST /api/rounds/:id/confirm
router.post("/:id/confirm", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, error: "Invalid round id." });
    }

    const existing = await getRoundById(id);

    if (!existing) {
      return res.status(404).json({ success: false, error: "Round not found." });
    }

    if (existing.isConfirmed) {
      return res.status(400).json({ success: false, error: "Round is already confirmed." });
    }

    const round = await updateRound(id, { isConfirmed: true });
    res.status(200).json({ success: true, data: round });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to confirm round." });
  }
});

module.exports = router;
