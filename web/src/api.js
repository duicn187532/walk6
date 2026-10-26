// Behind the shared ngrok gateway the app is served under /walk; locally it lives at the root.
export const BASE = /^\/walk(\/|$)/.test(window.location.pathname) ? '/walk' : '';
// Server-relative URLs (e.g. /uploads/…) need the same prefix.
export const assetUrl = (u) => (u && u.startsWith('/') ? BASE + u : u);

// Minimal fetch wrapper — MVP, so errors just surface as toasts.
async function req(method, url, body) {
  const opts = { method, headers: {} };
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const r = await fetch(BASE + '/api' + url, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}
export const api = {
  get: (u) => req('GET', u),
  post: (u, b = {}) => req('POST', u, b),
  put: (u, b) => req('PUT', u, b),
  del: (u) => req('DELETE', u),
};
export const qs = (o) => '?' + new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)).toString();
