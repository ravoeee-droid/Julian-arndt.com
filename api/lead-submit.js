const leadHandler = require('./lead');

function hostnameFromHeader(value) {
  return String(value || '')
    .split(',')[0]
    .trim()
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .split(':')[0]
    .toLowerCase();
}

function isTrustedOrigin(req) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin || process.env.VERCEL_ENV !== 'production') return true;

  let originHost = '';
  try {
    originHost = new URL(origin).hostname.toLowerCase();
  } catch (error) {
    return false;
  }

  const requestHost = hostnameFromHeader(
    req.headers['x-forwarded-host'] || req.headers.host
  );

  if (originHost === requestHost) return true;
  if (['julian-arndt.com', 'www.julian-arndt.com'].includes(originHost)) return true;
  if (originHost.endsWith('.vercel.app')) return true;
  return false;
}

module.exports = async function handler(req, res) {
  if (!isTrustedOrigin(req)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ ok: false, message: 'Origin not allowed.' }));
  }

  req.headers = { ...req.headers };
  delete req.headers.origin;
  return leadHandler(req, res);
};
