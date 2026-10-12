const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { sendResetCode } = require('./mailer');

const router = express.Router();
// Rate-limit ONLY the sensitive endpoints (not status polling or notes pages)
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please wait a few minutes and try again.', message: 'Too many attempts. Please wait a few minutes and try again.' } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_RE = /^[A-Za-z0-9_.-]{3,30}$/;
const hashCode = (c) => crypto.createHash('sha256').update(String(c)).digest('hex');
const maskEmail = (e) => e.replace(/^(.).*(@.*)$/, (_, a, b) => a + '***' + b);

router.get('/me', (req, res) => {
  res.json({ user: req.session.userId ? { username: req.session.username } : null });
});

router.post('/register', limiter, async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!USER_RE.test(username || '')) return res.status(400).json({ error: 'Username must be 3-30 letters, numbers, . _ -' });
  if (!EMAIL_RE.test(email || '')) return res.status(400).json({ error: 'Enter a valid e-mail address.' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (db.findUser(username)) return res.status(409).json({ error: 'That username is already taken.' });
  const user = {
    id: crypto.randomUUID(), username, email: email.trim().toLowerCase(),
    passwordHash: await bcrypt.hash(password, 10), createdAt: new Date().toISOString(),
  };
  db.data.users.push(user); db.save();
  req.session.userId = user.id; req.session.username = user.username;
  res.json({ ok: true, username: user.username });
});

router.post('/login', limiter, async (req, res) => {
  const { username, password } = req.body || {};
  const user = db.findUser(username);
  if (!user) return res.status(404).json({ error: 'not_registered', message: 'New user? This username is not registered yet. Please register first.' });
  if (!(await bcrypt.compare(password || '', user.passwordHash)))
    return res.status(401).json({ error: 'bad_password', message: 'Wrong password. You can use "Forgot password" to reset it.' });
  req.session.userId = user.id; req.session.username = user.username;
  res.json({ ok: true, username: user.username });
});

router.post('/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

// Step 1: e-mail a 6-digit code
router.post('/forgot', limiter, async (req, res) => {
  const user = db.findUser((req.body || {}).username);
  if (!user) return res.status(404).json({ error: 'not_registered', message: 'No account with that username. Please register.' });
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  user.reset = { hash: hashCode(code), expires: Date.now() + 10 * 60 * 1000, attempts: 0 };
  db.save();
  try { await sendResetCode(user.email, user.username, code); }
  catch (e) { console.error('Mail error:', e.message); return res.status(502).json({ error: 'Could not send e-mail. Check SMTP settings in .env.' }); }
  res.json({ ok: true, sentTo: maskEmail(user.email) });
});

// Step 2: check the code typed on the website
router.post('/verify', limiter, (req, res) => {
  const { username, code } = req.body || {};
  const user = db.findUser(username);
  const r = user && user.reset;
  if (!r) return res.status(400).json({ error: 'Request a new code first.' });
  if (Date.now() > r.expires) { delete user.reset; db.save(); return res.status(400).json({ error: 'Code expired. Request a new one.' }); }
  if (r.attempts >= 5) { delete user.reset; db.save(); return res.status(429).json({ error: 'Too many wrong attempts. Request a new code.' }); }
  if (hashCode(String(code || '').trim()) !== r.hash) {
    r.attempts++; db.save();
    return res.status(400).json({ error: 'Incorrect code.' });
  }
  req.session.resetFor = user.id;           // proves the code was entered correctly
  res.json({ ok: true });
});

// Step 3: set new password, then log in
router.post('/reset', limiter, async (req, res) => {
  const { username, newPassword } = req.body || {};
  const user = db.findUser(username);
  if (!user || req.session.resetFor !== user.id) return res.status(403).json({ error: 'Verify the code first.' });
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  delete user.reset; db.save();
  delete req.session.resetFor;
  req.session.userId = user.id; req.session.username = user.username;
  res.json({ ok: true, username: user.username });
});

module.exports = router;
