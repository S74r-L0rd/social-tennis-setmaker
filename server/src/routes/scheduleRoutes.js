const express = require("express");
const { generateRound } = require("../algorithm/scheduler");

const router = express.Router();

router.post("/generate", (req, res) => {
  try {
    const { players, courts, history } = req.body;

    const result = generateRound(players, courts, history);

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