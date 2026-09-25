const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

// A generous multer-level cap; the real 500MB business-rule check happens
// in validateLectureFile.js so we can return a clean, specific 422 message
// instead of multer's generic error.
const upload = multer({ storage, limits: { fileSize: 600 * 1024 * 1024 } });

module.exports = upload;
