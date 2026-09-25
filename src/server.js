require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const lectureRoutes = require("./routes/lectures");

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);       // SCRUM-11
app.use("/api/lectures", lectureRoutes); // SCRUM-13, SCRUM-14

// Fallback error handler — catches anything a route didn't handle itself
// (e.g. multer's file-too-large error before our own 422 check runs).
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Unexpected server error" });
});

const PORT = process.env.PORT || 4000;

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  app.listen(PORT, () => console.log(`EchoNotes backend running on port ${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

module.exports = app;
