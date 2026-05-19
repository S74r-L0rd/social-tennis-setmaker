const express = require("express");
const { generateRound } = require("../algorithm/scheduler");
const requireAuth = require("../middleware/auth");

const router = express.Router();

function hasRoundQuota(player) {
  return Number.isInteger(player.plannedRounds) && Number.isInteger(player.roundsPlayed);
}

function getEligiblePlayers(players) {
  if (!players.every(hasRoundQuota)) return players;
  return players.filter((player) => player.roundsPlayed < player.plannedRounds);
}

router.post("/generate", requireAuth, (req, res) => {
  try {
    const { players, courts, history } = req.body;
    if (!Array.isArray(players) || !Array.isArray(courts)) {
      return res.status(400).json({
        success: false,
        error: "Players and courts are required.",
      });
    }

    const eligiblePlayers = getEligiblePlayers(players);

    const result = generateRound(eligiblePlayers, courts, history);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
