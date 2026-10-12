// One-at-a-time processing queue. Status mirrors the Assignment-1 state chart:
// UPLOADED -> TRANSCRIBING -> STRUCTURING -> DONE (or FAILED)
const path = require('path');
const fs = require('fs');
const db = require('./db');
const { transcribe } = require('./transcribe');
const { generateNotes } = require('./notes');
const { writePdf } = require('./pdf');

const PDF_DIR = path.join(__dirname, '..', 'data', 'pdfs');
fs.mkdirSync(PDF_DIR, { recursive: true });
const queue = []; let running = false;

function enqueue(noteId) { queue.push(noteId); pump(); }

async function pump() {
  if (running) return; running = true;
  while (queue.length) {
    const id = queue.shift();
    const note = db.data.notes.find(n => n.id === id);
    if (!note) continue;
    try { await process_(note); }
    catch (e) { console.error('Queue error:', e.message); }
  }
  running = false;
}

async function process_(note) {
  const set = (patch) => { Object.assign(note, patch); db.save(); };
  try {
    console.log(`[job ${note.id.slice(0,8)}] started`);
    set({ status: 'TRANSCRIBING', progress: 0 });
    const text = await transcribe(note.uploadPath, (p) => { note.progress = p; });
    console.log(`[job ${note.id.slice(0,8)}] transcript ready (${text.length} chars)`);
    set({ status: 'STRUCTURING' });
    const notes = generateNotes(text, note.title);
    const pdfFile = `${note.id}.pdf`;
    await writePdf(notes, path.join(PDF_DIR, pdfFile), {
      date: new Date().toLocaleDateString('en-IN'), source: note.originalName,
    });
    console.log(`[job ${note.id.slice(0,8)}] done`);
    set({ status: 'DONE', pdfFile, preview: notes.summary.slice(0, 2), keywords: notes.keywords.slice(0, 6), finishedAt: new Date().toISOString() });
  } catch (e) {
    console.error('Job failed:', e.message);
    set({ status: 'FAILED', error: e.message });
  } finally {
    fs.unlink(note.uploadPath, () => {});   // the uploaded media is not kept
  }
}

// Jobs interrupted by a restart are marked failed so the UI doesn't wait forever.
function recover() {
  let changed = false;
  for (const n of db.data.notes) if (['UPLOADED', 'TRANSCRIBING', 'STRUCTURING'].includes(n.status)) {
    n.status = 'FAILED'; n.error = 'Server restarted during processing. Please upload again.'; changed = true;
  }
  if (changed) db.save();
}
module.exports = { enqueue, recover, PDF_DIR };
