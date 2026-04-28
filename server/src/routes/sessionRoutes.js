const express = require("express");
const {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession,
} = require("../repositories/sessionRepository");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function isValidId(value) {
  return Number.isInteger(value) && value > 0;
}

function toDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      name, sessionDate, sessionPeriod, startDateTime,
      matchDurationMinutes, breakIntervalMinutes, courtCount,
      gameMode, ratingMode,
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "Session name is required.",
      });
    }

    const data = {
      name: name.trim(),
      sessionDate:           toDateOrNull(sessionDate),
      sessionPeriod:         sessionPeriod  || null,
      startDateTime:         toDateOrNull(startDateTime),
      matchDurationMinutes:  matchDurationMinutes  != null ? Number(matchDurationMinutes)  : null,
      breakIntervalMinutes:  breakIntervalMinutes  != null ? Number(breakIntervalMinutes)  : null,
      courtCount:            courtCount            != null ? Number(courtCount)            : null,
      gameMode:              gameMode    || null,
      ratingMode:            ratingMode  || null,
    };

    const session = await createSession(data);

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create session.",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const sessions = await getAllSessions();

    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch sessions.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const sessionId = Number(req.params.id);

    if (!isValidId(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid session id.",
      });
    }

    const session = await getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch session.",
    });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const sessionId = Number(req.params.id);

    if (!isValidId(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid session id.",
      });
    }

    const existingSession = await getSessionById(sessionId);

    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: "Session not found.",
      });
    }

    const {
      name, sessionDate, sessionPeriod, startDateTime,
      matchDurationMinutes, breakIntervalMinutes, courtCount,
      gameMode, ratingMode, status,
    } = req.body;
    const updates = {};
    if (name !== undefined)                 updates.name = name;
    if (sessionDate !== undefined)          updates.sessionDate = sessionDate;
    if (sessionPeriod !== undefined)        updates.sessionPeriod = sessionPeriod;
    if (startDateTime !== undefined)        updates.startDateTime = startDateTime;
    if (matchDurationMinutes !== undefined) updates.matchDurationMinutes = matchDurationMinutes;
    if (breakIntervalMinutes !== undefined) updates.breakIntervalMinutes = breakIntervalMinutes;
    if (courtCount !== undefined)           updates.courtCount = courtCount;
    if (gameMode !== undefined)             updates.gameMode = gameMode;
    if (ratingMode !== undefined)           updates.ratingMode = ratingMode;
    if (status !== undefined)               updates.status = status;

    const session = await updateSession(sessionId, updates);

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to update session.",
    });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const sessionId = Number(req.params.id);

    if (!isValidId(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid session id.",
      });
    }

    const existingSession = await getSessionById(sessionId);

    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: "Session not found.",
      });
    }

    await deleteSession(sessionId);

    res.status(200).json({
      success: true,
      message: "Session deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete session.",
    });
  }
});

// POST /api/sessions/:id/activate
// Moves a session from DRAFT → ACTIVE
router.post("/:id/activate", requireAuth, async (req, res) => {
  try {
    const sessionId = Number(req.params.id);

    if (!isValidId(sessionId)) {
      return res.status(400).json({ success: false, error: "Invalid session id." });
    }

    const existing = await getSessionById(sessionId);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Session not found." });
    }

    if (existing.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        error: `Cannot activate a session with status '${existing.status}'. Only DRAFT sessions can be activated.`,
      });
    }

    const session = await updateSession(sessionId, {
      status: "ACTIVE",
      startDateTime: existing.startDateTime ?? new Date(),
    });

    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to activate session." });
  }
});

// POST /api/sessions/:id/complete
// Moves a session from ACTIVE → COMPLETED
router.post("/:id/complete", requireAuth, async (req, res) => {
  try {
    const sessionId = Number(req.params.id);

    if (!isValidId(sessionId)) {
      return res.status(400).json({ success: false, error: "Invalid session id." });
    }

    const existing = await getSessionById(sessionId);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Session not found." });
    }

    if (existing.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        error: `Cannot complete a session with status '${existing.status}'. Only ACTIVE sessions can be completed.`,
      });
    }

    const session = await updateSession(sessionId, { status: "COMPLETED" });
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to complete session." });
  }
});

// POST /api/sessions/:id/cancel
// Moves a session from DRAFT or ACTIVE → CANCELLED
router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const sessionId = Number(req.params.id);

    if (!isValidId(sessionId)) {
      return res.status(400).json({ success: false, error: "Invalid session id." });
    }

    const existing = await getSessionById(sessionId);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Session not found." });
    }

    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel a session with status '${existing.status}'.`,
      });
    }

    const session = await updateSession(sessionId, { status: "CANCELLED" });
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to cancel session." });
  }
});

module.exports = router;