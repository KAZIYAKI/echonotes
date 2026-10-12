// Turns a raw transcript into structured study notes (extractive, no cloud AI).
const STOP = new Set(('a an the and or but if then so of to in on at by for with from as is are was were be been being it its this that these those i you he she we they them his her our your their my me not no do does did have has had will would can could should may might just very really also than too about into over under more most some any each other such only own same up down out off again once here there when where why how all both few what which who whom while because until during before after above below between through against so like okay ok um uh yeah well right now going gonna want let thing things stuff kind sort lot get got say said see know think mean actually basically look talk come back last first clearly way one two take make even need course going lecture today people world').split(/\s+/));
const FILLER = /\b(um+|uh+|you know|i mean|sort of|kind of|like,|okay so|alright so|so yeah|basically|actually)\b[, ]*/gi;

const words = (s) => (s.toLowerCase().match(/[a-z][a-z'-]+/g) || []);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Whisper (tiny model) can get stuck repeating a phrase on unclear audio: collapse such loops.
function collapseRepeats(t) {
  let prev;
  do {
    prev = t;
    t = t.replace(/((?:[\w'’-]+[,.]?\s+){1,8}?)(?:\1){2,}/gi, '$1');
  } while (t !== prev);
  return t;
}

function sentences(text) {
  const clean = collapseRepeats(text).replace(FILLER, '').replace(/\s+/g, ' ').trim();
  return (clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map(s => s.trim())
    .filter(s => { const w = words(s); return w.length >= 4 && w.length <= 70 && new Set(w).size / w.length > 0.55; })
    .map(cap);
}

function vec(sent) {
  const v = new Map();
  for (const w of words(sent)) if (!STOP.has(w) && w.length > 2) v.set(w, (v.get(w) || 0) + 1);
  return v;
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const [k, x] of a) { na += x * x; if (b.has(k)) dot += x * b.get(k); }
  for (const x of b.values()) nb += x * x;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function tfidf(sents) {
  const df = new Map(), tf = new Map();
  sents.forEach(s => {
    const seen = new Set();
    for (const w of words(s)) {
      if (STOP.has(w) || w.length < 3 || w.includes("'")) continue;
      tf.set(w, (tf.get(w) || 0) + 1);
      if (!seen.has(w)) { df.set(w, (df.get(w) || 0) + 1); seen.add(w); }
    }
  });
  const N = sents.length;
  const score = new Map();
  for (const [w, c] of tf) score.set(w, c * Math.log(1 + N / df.get(w)));
  return score;
}

// Split into topic sections where neighbouring sentences stop being similar.
function segment(sents) {
  const target = Math.max(1, Math.min(8, Math.round(sents.length / 12)));
  if (target === 1 || sents.length < 14) return [sents];
  const vs = sents.map(vec), win = 3, sims = [];
  for (let i = win; i <= sents.length - win; i++) {
    const L = new Map(), R = new Map();
    for (let j = i - win; j < i; j++) for (const [k, x] of vs[j]) L.set(k, (L.get(k) || 0) + x);
    for (let j = i; j < i + win; j++) for (const [k, x] of vs[j]) R.set(k, (R.get(k) || 0) + x);
    sims.push({ i, s: cosine(L, R) });
  }
  const minLen = 6, cuts = [];
  for (const c of [...sims].sort((a, b) => a.s - b.s)) {
    if (cuts.length >= target - 1) break;
    if (c.i < minLen || sents.length - c.i < minLen) continue;
    if (cuts.every(x => Math.abs(x - c.i) >= minLen)) cuts.push(c.i);
  }
  cuts.sort((a, b) => a - b);
  const out = []; let prev = 0;
  for (const c of [...cuts, sents.length]) { out.push(sents.slice(prev, c)); prev = c; }
  return out.filter(s => s.length);
}

function generateNotes(transcript, title) {
  const sents = sentences(transcript);
  if (sents.length < 3) {
    return { title, summary: [transcript.trim()], sections: [], glossary: [], keywords: [] };
  }
  const scores = tfidf(sents);
  const sScore = (s) => { const w = words(s).filter(x => scores.has(x)); return w.length ? w.reduce((a, x) => a + scores.get(x), 0) / Math.sqrt(w.length) : 0; };

  const keywords = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0]);

  const pick = (arr, n) => arr.map((s, i) => ({ s, i, sc: sScore(s) }))
    .sort((a, b) => b.sc - a.sc).slice(0, n).sort((a, b) => a.i - b.i).map(x => x.s);

  const summary = pick(sents, Math.min(5, Math.max(2, Math.round(sents.length / 15))));

  const sections = segment(sents).map((group, idx) => {
    const sc = tfidf(group);
    const top = [...sc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => cap(e[0]));
    return {
      heading: `${idx + 1}. ${top.join(' · ') || 'Topic'}`,
      bullets: pick(group, Math.min(6, Math.max(2, Math.round(group.length / 4)))),
    };
  });

  // Glossary: sentences that look like definitions of a keyword
  const glossary = [];
  for (const k of keywords) {
    const re = new RegExp(`\\b${k}\\b[^.]{0,40}\\b(is|are|means|refers to|called|defined as)\\b`, 'i');
    const hit = sents.find(s => re.test(s));
    if (hit && !glossary.some(g => g.def === hit)) glossary.push({ term: cap(k), def: hit });
    if (glossary.length >= 6) break;
  }
  return { title, summary, sections, glossary, keywords };
}
module.exports = { generateNotes };
