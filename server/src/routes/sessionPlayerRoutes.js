const express = require("express");
const {
  addPlayerToSession,
  getSessionPlayers,
  getSessionPlayerById,
  updateSessionPlayer,
  removeSessionPlayer,
} = require("../repositories/sessionPlayerRepository");

const router = express.Router();

function isValidId(value) {
  return Number.isInteger(value) && value > 0;
}

router.post("/", async (req, res) => {
  try {
    const { sessionId, playerId, plannedRounds, roundsPlayed, sitOutCount, status } =
      req.body;

    if (!isValidId(sessionId) || !isValidId(playerId)) {
      return res.status(400).json({
        success: false,
        error: "Valid sessionId and playerId are required.",
      });
    }

    if (
      plannedRounds !== undefined &&
      (!Number.isInteger(plannedRounds) || plannedRounds < 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "plannedRounds must be a non-negative integer.",
      });
    }

    if (
      roundsPlayed !== undefined &&
      (!Number.isInteger(roundsPlayed) || roundsPlayed < 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "roundsPlayed must be a non-negative integer.",
      });
    }

    if (
      sitOutCount !== undefined &&
      (!Number.isInteger(sitOutCount) || sitOutCount < 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "sitOutCount must be a non-negative integer.",
      });
    }

    if (
      status !== undefined &&
      !["ACTIVE", "RESTING", "INACTIVE"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid player status.",
      });
    }

    const sessionPlayer = await addPlayerToSession(req.body);

    res.status(201).json({
      success: true,
      data: sessionPlayer,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: "Player is already added to this session.",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to add player to session.",
    });
  }
});

router.get("/:sessionId", async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);

    if (!isValidId(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid session id.",
      });
    }

    const sessionPlayers = await getSessionPlayers(sessionId);

    res.status(200).json({
      success: true,
      data: sessionPlayers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch session players.",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const sessionPlayerId = Number(req.params.id);

    if (!isValidId(sessionPlayerId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid session player id.",
      });
    }

    const existingSessionPlayer = await getSessionPlayerById(sessionPlayerId);

    if (!existingSessionPlayer) {
      return res.status(404).json({
        success: false,
        error: "Session player not found.",
      });
    }

    if (
      req.body.plannedRounds !== undefined &&
      (!Number.isInteger(req.body.plannedRounds) || req.body.plannedRounds < 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "plannedRounds must be a non-negative integer.",
      });
    }

    if (
      req.body.roundsPlayed !== undefined &&
      (!Number.isInteger(req.body.roundsPlayed) || req.body.roundsPlayed < 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "roundsPlayed must be a non-negative integer.",
      });
    }

    if (
      req.body.sitOutCount !== undefined &&
      (!Number.isInteger(req.body.sitOutCount) || req.body.sitOutCount < 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "sitOutCount must be a non-negative integer.",
      });
    }

    if (
      req.body.status !== undefined &&
      !["ACTIVE", "RESTING", "INACTIVE"].includes(req.body.status)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid player status.",
      });
    }

    const sessionPlayer = await updateSessionPlayer(sessionPlayerId, req.body);

    res.status(200).json({
      success: true,
      data: sessionPlayer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to update session player.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const sessionPlayerId = Number(req.params.id);

    if (!isValidId(sessionPlayerId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid session player id.",
      });
    }

    const existingSessionPlayer = await getSessionPlayerById(sessionPlayerId);

    if (!existingSessionPlayer) {
      return res.status(404).json({
        success: false,
        error: "Session player not found.",
      });
    }

    await removeSessionPlayer(sessionPlayerId);

    res.status(200).json({
      success: true,
      message: "Session player removed successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to remove session player.",
    });
  }
});

module.exports = router;