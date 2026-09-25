// SCRUM-13 — As a student, I want to upload a lecture recording with a
// course name and topic, so that it can be turned into a study kit.
//
// Acceptance criteria covered here:
//  - Upload accepts mp3/wav/mp4 up to 500MB
//  - Uploaded lecture shows up as "UPLOADED" in My Lectures
//
// Validation (SCRUM-14) runs as middleware before this handler.

const express = require("express");
const upload = require("../config/upload");
const validateLectureFile = require("../middleware/validateLectureFile");
const requireAuth = require("../middleware/requireAuth");
const Lecture = require("../models/Lecture");

const router = express.Router();

// POST /api/lectures
router.post(
  "/",
  requireAuth,
  upload.single("audioFile"),
  validateLectureFile,
  async (req, res) => {
    const { courseName, topic } = req.body;

    if (!courseName) {
      return res.status(422).json({ error: "courseName is required" });
    }

    const lecture = await Lecture.create({
      student: req.student._id,
      title: req.file.originalname,
      courseName,
      topic: topic || "",
      audioFilePath: req.file.path,
      mimeType: req.file.mimetype,
      fileSizeBytes: req.file.size,
      status: "UPLOADED",
    });

    // In the full pipeline this is where the lecture gets enqueued for
    // transcription (SCRUM-15) — out of scope for this story.
    return res.status(201).json({ lecture });
  }
);

// GET /api/lectures — "My Lectures" list (used by SCRUM-22, history view)
router.get("/", requireAuth, async (req, res) => {
  const lectures = await Lecture.find({ student: req.student._id }).sort({ createdAt: -1 });
  return res.status(200).json({ lectures });
});

// GET /api/lectures/:id/status
router.get("/:id/status", requireAuth, async (req, res) => {
  const lecture = await Lecture.findOne({ _id: req.params.id, student: req.student._id });
  if (!lecture) {
    return res.status(404).json({ error: "Lecture not found" });
  }
  return res.status(200).json({ status: lecture.status });
});

module.exports = router;
