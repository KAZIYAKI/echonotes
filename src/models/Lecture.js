// Backs SCRUM-13 (upload) and SCRUM-14 (validation).
// Matches the Class Diagram's Lecture entity and the State Chart's
// status values: UPLOADED, VALIDATING, TRANSCRIBING, STRUCTURING,
// DRAFT_READY, UNDER_REVIEW, FINALIZED, ARCHIVED, FAILED.

const mongoose = require("mongoose");

const LECTURE_STATUSES = [
  "UPLOADED",
  "VALIDATING",
  "TRANSCRIBING",
  "STRUCTURING",
  "DRAFT_READY",
  "UNDER_REVIEW",
  "FINALIZED",
  "ARCHIVED",
  "FAILED",
];

const lectureSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    title: { type: String, required: true, trim: true },
    courseName: { type: String, required: true, trim: true },
    topic: { type: String, trim: true },
    audioFilePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    status: { type: String, enum: LECTURE_STATUSES, default: "UPLOADED" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lecture", lectureSchema);
module.exports.LECTURE_STATUSES = LECTURE_STATUSES;
