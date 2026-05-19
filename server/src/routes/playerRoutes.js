const express = require("express");
const {
  createPlayer,
  getAllPlayers,
  getPlayerById,
  getPlayerScheduleUsage,
  updatePlayer,
  deletePlayer,
} = require("../repositories/playerRepository");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function isValidId(value) {
  return Number.isInteger(value) && value > 0;
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, gender, rating } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "Player name is required.",
      });
    }

    if (rating !== undefined && (!Number.isInteger(rating) || rating < 0)) {
      return res.status(400).json({
        success: false,
        error: "Player rating must be a non-negative integer.",
      });
    }

    const player = await createPlayer({
      name: name.trim(),
      gender: gender ?? null,
      rating: rating ?? 0,
    }, req.user.userId);

    res.status(201).json({
      success: true,
      data: player,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to create player.",
    });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const players = await getAllPlayers(req.user.userId);

    res.status(200).json({
      success: true,
      data: players,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch players.",
    });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const playerId = Number(req.params.id);

    if (!isValidId(playerId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid player id.",
      });
    }

    const player = await getPlayerById(playerId, req.user.userId);

    if (!player) {
      return res.status(404).json({
        success: false,
        error: "Player not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: player,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch player.",
    });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const playerId = Number(req.params.id);

    if (!isValidId(playerId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid player id.",
      });
    }

    const existingPlayer = await getPlayerById(playerId, req.user.userId);

    if (!existingPlayer) {
      return res.status(404).json({
        success: false,
        error: "Player not found.",
      });
    }

    if (
      req.body.rating !== undefined &&
      (!Number.isInteger(req.body.rating) || req.body.rating < 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "Player rating must be a non-negative integer.",
      });
    }

    const { name, gender, rating } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (gender !== undefined) updates.gender = gender;
    if (rating !== undefined) updates.rating = rating;

    const player = await updatePlayer(playerId, updates);

    res.status(200).json({
      success: true,
      data: player,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to update player.",
    });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const playerId = Number(req.params.id);

    if (!isValidId(playerId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid player id.",
      });
    }

    const existingPlayer = await getPlayerById(playerId, req.user.userId);

    if (!existingPlayer) {
      return res.status(404).json({
        success: false,
        error: "Player not found.",
      });
    }

    const usage = await getPlayerScheduleUsage(playerId);
    if (usage.matchAssignments > 0) {
      return res.status(409).json({
        success: false,
        error: "This player is already scheduled in a match. Clear the schedule before deleting them.",
      });
    }

    await deletePlayer(playerId);

    res.status(200).json({
      success: true,
      message: "Player deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete player.",
    });
  }
});

module.exports = router;
