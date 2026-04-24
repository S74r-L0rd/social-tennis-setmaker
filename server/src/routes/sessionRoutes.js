const express = require("express");
const {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession,
} = require("../repositories/sessionRepository");

const router = express.Router();

function isValidId(value) {
  return Number.isInteger(value) && value > 0;
}

router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "Session name is required.",
      });
    }

    const session = await createSession(req.body);

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
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

router.put("/:id", async (req, res) => {
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

    const session = await updateSession(sessionId, req.body);

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

router.delete("/:id", async (req, res) => {
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

module.exports = router;