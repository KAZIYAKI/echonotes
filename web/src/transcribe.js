// Speech-to-text, fully local: ffmpeg decodes audio, Whisper (via transformers.js) transcribes.
// First run downloads the Whisper model (~40-150 MB) once, then it works offline.
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let ffmpegPath;
try { ffmpegPath = require('ffmpeg-static'); } catch { ffmpegPath = 'ffmpeg'; }
if (!ffmpegPath || !fs.existsSync(ffmpegPath)) ffmpegPath = 'ffmpeg';

const SR = 16000;
const CHUNK_SEC = 600;
const MAX_MINUTES = Number(process.env.MAX_MINUTES || 120);

function probeDuration(file) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, ['-i', file]);
    let err = '';
    p.stderr.on('data', d => (err += d));
    p.on('error', reject);
    p.on('close', () => {
      const m = err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!m) return reject(new Error('Could not read this file. Is it a valid audio/video file?'));
      resolve(+m[1] * 3600 + +m[2] * 60 + +m[3]);
    });
  });
}

function decodeChunk(file, start, len) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, ['-v', 'error', '-ss', String(start), '-t', String(len), '-i', file,
      '-vn', '-ac', '1', '-ar', String(SR), '-f', 'f32le', 'pipe:1']);
    const bufs = []; let err = '';
    p.stdout.on('data', d => bufs.push(d));
    p.stderr.on('data', d => (err += d));
    p.on('error', reject);
    p.on('close', code => {
      if (code !== 0) return reject(new Error('ffmpeg failed: ' + err.slice(0, 200)));
      const b = Buffer.concat(bufs);
      resolve(new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4)));
    });
  });
}

let pipePromise;
async function getPipe() {
  if (!pipePromise) {
    pipePromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.cacheDir = path.join(__dirname, '..', 'data', 'models');
      const model = process.env.WHISPER_MODEL || 'Xenova/whisper-tiny.en';
      console.log('Loading speech model', model, '(first run downloads it)...');
      for (let attempt = 1; ; attempt++) {          // retry: the download can drop on weak networks
        try {
          return await pipeline('automatic-speech-recognition', model);
        } catch (e) {
          console.log(`Model download failed (attempt ${attempt}): ${e.message}`);
          if (attempt >= 5) throw e;
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    })();
    pipePromise.catch(() => { pipePromise = null; });
  }
  return pipePromise;
}

async function transcribe(file, onProgress = () => {}) {
  console.log('[transcribe] reading file with ffmpeg:', ffmpegPath);
  const duration = await probeDuration(file);
  console.log('[transcribe] duration', Math.round(duration), 'sec');
  if (duration / 60 > MAX_MINUTES) throw new Error(`File is longer than ${MAX_MINUTES} minutes.`);
  if (duration < 1) throw new Error('File has no audio.');

  if (process.env.TRANSCRIBER === 'stub') {            // used only for offline testing
    onProgress(1);
    return require('./stubText');
  }

  const asr = await getPipe();
  let text = '';
  for (let start = 0; start < duration; start += CHUNK_SEC) {
    const audio = await decodeChunk(file, start, CHUNK_SEC);
    if (audio.length > SR) {
      const out = await asr(audio, { chunk_length_s: 30, stride_length_s: 5 });
      text += ' ' + out.text.trim();
    }
    onProgress(Math.min(1, (start + CHUNK_SEC) / duration));
  }
  if (!text.trim()) throw new Error('No speech detected in this file.');
  return text.trim();
}
module.exports = { transcribe, probeDuration };
