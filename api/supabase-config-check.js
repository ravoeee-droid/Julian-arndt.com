module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const rawUrl = String(process.env.SUPABASE_URL || '').trim();
  const rawKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const table = String(process.env.SUPABASE_LEADS_TABLE || '').trim();

  let projectRef = '';
  try { projectRef = new URL(rawUrl).hostname.split('.')[0] || ''; } catch (error) {}

  const keyType = rawKey.startsWith('sb_secret_')
    ? 'secret'
    : rawKey.startsWith('sb_publishable_')
      ? 'publishable'
      : rawKey.split('.').length === 3
        ? 'legacy-jwt'
        : rawKey
          ? 'unknown'
          : 'missing';

  let jwtRole = '';
  let jwtRef = '';
  if (keyType === 'legacy-jwt') {
    try {
      const payload = JSON.parse(Buffer.from(rawKey.split('.')[1], 'base64url').toString('utf8'));
      jwtRole = String(payload.role || '');
      jwtRef = String(payload.ref || '');
    } catch (error) {}
  }

  res.statusCode = 200;
  res.end(JSON.stringify({
    configured: Boolean(rawUrl && rawKey && table),
    projectRef,
    keyType,
    keyLength: rawKey.length,
    jwtRole,
    jwtRef,
    table
  }));
};
