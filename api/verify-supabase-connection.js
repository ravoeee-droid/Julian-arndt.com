module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false }));
  }

  const baseUrl = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  const table = String(process.env.SUPABASE_LEADS_TABLE || 'cashflow_leads');
  if (!baseUrl || !key || !/^[a-zA-Z0-9_]+$/.test(table)) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, stage: 'configuration' }));
  }

  const id = `cf_health_${Date.now()}`;
  const eventId = `health_${Date.now()}`;
  const headers = {
    'Content-Type': 'application/json',
    apikey: key,
    Prefer: 'return=minimal'
  };
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;

  const endpoint = `${baseUrl}/rest/v1/${encodeURIComponent(table)}`;
  const row = {
    id,
    event_id: eventId,
    source: 'vercel/supabase-health-check',
    status: 'new',
    contact_preference: 'unselected',
    first_name: 'Systemtest',
    email: 'systemtest@invalid.example',
    phone: '+49000000000',
    privacy_accepted: true,
    marketing_consent: false,
    qualification: {},
    attribution: {},
    user_agent: 'Vercel Supabase Health Check'
  };

  try {
    const insert = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(row)
    });
    if (!insert.ok) {
      res.statusCode = 502;
      return res.end(JSON.stringify({ ok: false, stage: 'insert', upstreamStatus: insert.status }));
    }

    const remove = await fetch(`${endpoint}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers
    });
    if (!remove.ok) {
      res.statusCode = 502;
      return res.end(JSON.stringify({ ok: false, stage: 'cleanup', upstreamStatus: remove.status }));
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, storage: 'supabase' }));
  } catch (error) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ ok: false, stage: 'network' }));
  }
};
