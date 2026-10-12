async function api(url, body, method) {
  const opt = { method: method || (body ? 'POST' : 'GET'), headers: {} };
  if (body && !(body instanceof FormData)) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const r = await fetch(url, opt);
  let data = {}; try { data = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, data };
}
function say(el, text, kind) { el.className = 'msg ' + kind; el.textContent = text; }
async function requireLogin() {
  const { data } = await api('/api/me');
  if (!data.user) { location.href = '/'; return null; }
  const who = document.getElementById('who'); if (who) who.textContent = data.user.username;
  return data.user;
}
async function logout() { await api('/api/logout', {}); location.href = '/'; }
