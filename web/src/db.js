// Tiny JSON-file database with atomic writes (no native modules needed).
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'db.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return { users: [], notes: [] }; }
}
let db = load();
function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}
module.exports = {
  get data() { return db; },
  save,
  findUser: (name) => db.users.find(u => u.username.toLowerCase() === String(name || '').toLowerCase()),
  reload() { db = load(); },
};
