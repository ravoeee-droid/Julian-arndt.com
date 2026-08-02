module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const rawUrl = String(process.env.SUPABASE_URL || '');
  const rawKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  const table = String(process.env.SUPABASE_LEADS_TABLE || '');
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
  res.statusCode = 200;
  res.end(JSON.stringify({
    configured: Boolean(rawUrl && rawKey && table),
    projectRef,
    keyType,
    keyLength: rawKey.length,
    table
  }));
};
