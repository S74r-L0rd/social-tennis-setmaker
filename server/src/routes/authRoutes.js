const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, getUserByEmail } = require("../repositories/userRepository");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, error: "Name is required." });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "A valid email is required." });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });
    }

    const existing = await getUserByEmail(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ success: false, error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await createUser({
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.status(201).json({ success: true, data: { user, token } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Registration failed." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    const user = await getUserByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    const { passwordHash: _, ...safeUser } = user;

    res.status(200).json({ success: true, data: { user: safeUser, token } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Login failed." });
  }
});

// GET /api/auth/me  — returns the logged-in user's profile
router.get("/me", requireAuth, async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

module.exports = router;
