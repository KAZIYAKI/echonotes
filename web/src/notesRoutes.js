const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./db');
const jobs = require('./jobs');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.mp4', '.mkv', '.mov', '.webm', '.avi']);
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED.has(path.extname(file.originalname).toLowerCase())),
});

router.use((req, res, next) => req.session.userId ? next() : res.status(401).json({ error: 'Please log in.' }));

const view = (n) => ({
  id: n.id, title: n.title, status: n.status, progress: n.progress || 0, error: n.error,
  createdAt: n.createdAt, preview: n.preview, keywords: n.keywords,
});
const mine = (req) => db.data.notes.filter(n => n.userId === req.session.userId);

router.post('/upload', (req, res) => {
  upload.single('media')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File is larger than 500 MB.' : err.message });
    if (!req.file) return res.status(400).json({ error: 'Choose an audio or video file (mp3, wav, m4a, mp4, mkv, mov, webm...).' });
    // browsers send UTF-8 names that multer reads as latin1: convert back
    const original = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const note = {
      id: crypto.randomUUID(), userId: req.session.userId,
      title: (req.body.title || '').trim() || path.parse(original).name,
      originalName: original, uploadPath: req.file.path,
      status: 'UPLOADED', progress: 0, createdAt: new Date().toISOString(),
    };
    db.data.notes.push(note); db.save();
    console.log(`[upload] received "${original}" (${(req.file.size/1048576).toFixed(1)} MB) -> job ${note.id.slice(0,8)}`);
    jobs.enqueue(note.id);
    res.json({ id: note.id });
  });
});

// Past notes (finished ones, newest first)
router.get('/notes', (req, res) => {
  const list = mine(req).filter(n => n.status === 'DONE').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ notes: list.map(view) });
});

router.get('/notes/:id', (req, res) => {
  const n = mine(req).find(x => x.id === req.params.id);
  if (!n) return res.status(404).json({ error: 'Not found' });
  res.json(view(n));
});

router.get('/notes/:id/pdf', (req, res) => {
  const n = mine(req).find(x => x.id === req.params.id && x.status === 'DONE');
  if (!n) return res.status(404).json({ error: 'Not found' });
  const file = path.join(jobs.PDF_DIR, n.pdfFile);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'PDF missing' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${n.title.replace(/[^\w .-]/g, '_')}.pdf"`);
  fs.createReadStream(file).pipe(res);
});

module.exports = router;
