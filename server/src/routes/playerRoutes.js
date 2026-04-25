const express = require("express");
const {
  createPlayer,
  getAllPlayers,
  getPlayerById,
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
    const { name, rating } = req.body;

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

    const player = await createPlayer(req.body);

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

router.get("/", async (req, res) => {
  try {
    const players = await getAllPlayers();

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

router.get("/:id", async (req, res) => {
  try {
    const playerId = Number(req.params.id);

    if (!isValidId(playerId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid player id.",
      });
    }

    const player = await getPlayerById(playerId);

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

    const existingPlayer = await getPlayerById(playerId);

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

    const player = await updatePlayer(playerId, req.body);

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

    const existingPlayer = await getPlayerById(playerId);

    if (!existingPlayer) {
      return res.status(404).json({
        success: false,
        error: "Player not found.",
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