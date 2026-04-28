const express = require("express");
const cors = require("cors");
const scheduleRoutes = require("./routes/scheduleRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const playerRoutes = require("./routes/playerRoutes");
const sessionPlayerRoutes = require("./routes/sessionPlayerRoutes");
const roundRoutes = require("./routes/roundRoutes");
const courtRoutes = require("./routes/courtRoutes");
const authRoutes = require("./routes/authRoutes");

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set.");
  process.exit(1);
}

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/session-players", sessionPlayerRoutes);
app.use("/api/rounds", roundRoutes);
app.use("/api/courts", courtRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});