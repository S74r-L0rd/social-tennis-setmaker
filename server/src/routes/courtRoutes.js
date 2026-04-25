const express = require("express");
const {
  addCourt,
  getCourtsBySessionId,
  getCourtById,
  updateCourt,
  deleteCourt,
  bulkSetCourts,
} = require("../repositories/sessionCourtRepository");
const { getSessionById } = require("../repositories/sessionRepository");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function isValidId(value) {
  return Number.isInteger(value) && value > 0;
}

// POST /api/courts/session/:sessionId
// Add a single court to a session
router.post("/session/:sessionId", requireAuth, async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);

    if (!isValidId(sessionId)) {
      return res.status(400).json({ success: false, error: "Invalid sessionId." });
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found." });
    }

    const { courtNumber, courtName, isAvailable, priorityOrder } = req.body;

    if (!courtNumber || typeof courtNumber !== "number" || courtNumber < 1) {
      return res.status(400).json({ success: false, error: "courtNumber must be a positive number." });
    }

    const court = await addCourt({
      sessionId,
      courtNumber,
      courtName: courtName ?? null,
      isAvailable: isAvailable ?? true,
      priorityOrder: priorityOrder ?? null,
    });

    res.status(201).json({ success: true, data: court });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: "Court number already exists for this session.",
      });
    }
    res.status(500).json({ success: false, error: "Failed to add court." });
  }
});

// GET /api/courts/session/:sessionId
// Get all courts for a session, ordered by priority then court number
router.get("/session/:sessionId", async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);

    if (!isValidId(sessionId)) {
      return res.status(400).json({ success: false, error: "Invalid sessionId." });
    }

    const courts = await getCourtsBySessionId(sessionId);
    res.status(200).json({ success: true, data: courts });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch courts." });
  }
});

// POST /api/courts/session/:sessionId/bulk
// Replace all courts for a session at once
// Body: { courts: [{ courtNumber, courtName?, isAvailable?, priorityOrder? }] }
router.post("/session/:sessionId/bulk", requireAuth, async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);

    if (!isValidId(sessionId)) {
      return res.status(400).json({ success: false, error: "Invalid sessionId." });
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found." });
    }

    const { courts } = req.body;

    if (!Array.isArray(courts) || courts.length === 0) {
      return res.status(400).json({ success: false, error: "courts must be a non-empty array." });
    }

    for (const court of courts) {
      if (!court.courtNumber || typeof court.courtNumber !== "number" || court.courtNumber < 1) {
        return res.status(400).json({
          success: false,
          error: `Each court must have a valid courtNumber. Got: ${JSON.stringify(court)}`,
        });
      }
    }

    // Check for duplicate courtNumbers in the request
    const numbers = courts.map((c) => c.courtNumber);
    if (new Set(numbers).size !== numbers.length) {
      return res.status(400).json({ success: false, error: "Duplicate court numbers in request." });
    }

    const created = await bulkSetCourts(sessionId, courts);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to set courts." });
  }
});

// PUT /api/courts/:id
// Update a court (availability, name, priority order)
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, error: "Invalid court id." });
    }

    const existing = await getCourtById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Court not found." });
    }

    const { courtName, isAvailable, priorityOrder } = req.body;

    const court = await updateCourt(id, {
      ...(courtName !== undefined && { courtName }),
      ...(isAvailable !== undefined && { isAvailable }),
      ...(priorityOrder !== undefined && { priorityOrder }),
    });

    res.status(200).json({ success: true, data: court });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update court." });
  }
});

// DELETE /api/courts/:id
// Remove a court from a session
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, error: "Invalid court id." });
    }

    const existing = await getCourtById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Court not found." });
    }

    await deleteCourt(id);
    res.status(200).json({ success: true, message: "Court removed successfully." });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete court." });
  }
});

module.exports = router;
