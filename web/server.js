require('dotenv').config();
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const jobs = require('./src/jobs');

const app = express();
app.use(express.json());
app.use(session({
  name: 'echonotes.sid',
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 },
}));

app.use('/api', require('./src/auth'));
app.use('/api', require('./src/notesRoutes'));

// Pages that need a login
const guard = (file) => (req, res) =>
  req.session.userId ? res.sendFile(path.join(__dirname, 'public', file)) : res.redirect('/');
app.get('/home', guard('home.html'));
app.get('/upload', guard('upload.html'));
app.get('/notes', guard('notes.html'));
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html', extensions: ['html'] }));

jobs.recover();
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\nEchoNotes is running ->  http://localhost:${PORT}\n`);
  if (!process.env.SMTP_USER) console.log('(No SMTP set: reset codes will be printed here in the terminal.)\n');
});
