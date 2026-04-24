const express = require("express");
const cors = require("cors");
const scheduleRoutes = require("./routes/scheduleRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const playerRoutes = require("./routes/playerRoutes");
const sessionPlayerRoutes = require("./routes/sessionPlayerRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/schedule", scheduleRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/session-players", sessionPlayerRoutes);

const PORT = 5001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});