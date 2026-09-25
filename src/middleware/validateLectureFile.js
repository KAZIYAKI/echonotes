// SCRUM-14 — As a student, I want invalid files rejected with a clear
// message, so that I know why my upload failed.
//
// Acceptance criterion: uploading an unsupported format, an oversized
// file, or one longer than the duration limit is rejected with HTTP 422
// and a specific, human-readable error.

const path = require("path");

const ALLOWED_MIME_TYPES = ["audio/mpeg", "audio/wav", "audio/x-wav", "video/mp4"];
const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".mp4"];
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 500 * 1024 * 1024); // 500MB
const MAX_DURATION_SECONDS = Number(process.env.MAX_LECTURE_DURATION_SECONDS || 120 * 60); // 120 min

// Runs after multer has already saved the file to disk (req.file is set).
// If validation fails, the file is removed and a 422 is returned instead
// of letting a bad lecture continue into the processing pipeline.
async function validateLectureFile(req, res, next) {
  const file = req.file;
  const fs = require("fs/promises");

  if (!file) {
    return res.status(422).json({ error: "No audio/video file was attached to this upload" });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const validFormat = ALLOWED_EXTENSIONS.includes(ext) && ALLOWED_MIME_TYPES.includes(file.mimetype);

  if (!validFormat) {
    await fs.unlink(file.path).catch(() => {});
    return res.status(422).json({
      error: `Unsupported file type "${ext || file.mimetype}". Please upload mp3, wav, or mp4.`,
    });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    await fs.unlink(file.path).catch(() => {});
    const maxMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
    return res.status(422).json({ error: `File is too large. Maximum allowed size is ${maxMb}MB.` });
  }

  // Duration check requires probing the media file. In production this
  // would call ffprobe; stubbed here so the story is demonstrable without
  // a native ffmpeg dependency in this environment.
  const durationSeconds = await probeDurationSeconds(file.path);
  if (durationSeconds && durationSeconds > MAX_DURATION_SECONDS) {
    await fs.unlink(file.path).catch(() => {});
    const maxMin = Math.round(MAX_DURATION_SECONDS / 60);
    return res.status(422).json({ error: `Lecture is too long. Maximum allowed length is ${maxMin} minutes.` });
  }

  req.lectureDurationSeconds = durationSeconds;
  next();
}

// Placeholder — swap for a real ffprobe call (e.g. via fluent-ffmpeg) in production.
async function probeDurationSeconds(_filePath) {
  return null; // unknown; skip the duration check until ffprobe is wired in
}

module.exports = validateLectureFile;
