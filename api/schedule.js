const crypto = require('crypto');

const DEFAULT_PIXEL_ID = '1599406528431495';
const DEFAULT_GRAPH_VERSION = 'v25.0';
const DEFAULT_SUPABASE_TABLE = 'cashflow_leads';
const MAX_BODY_BYTES = 24 * 1024;

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

function cleanText(value, maxLength = 500) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeEmail(value) {
  return cleanText(value, 180).toLowerCase();
}

function normalizePhone(value) {
  let phone = String(value || '').replace(/\D/g, '');
  if (phone.startsWith('00')) phone = phone.slice(2);
  if (phone.startsWith('0')) phone = `49${phone.slice(1)}`;
  return phone;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function isValidPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 16;
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body !== 'string') return {};
  if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_BYTES) {
    const error = new Error('payload_too_large');
    error.statusCode = 413;
    throw error;
  }
  return JSON.parse(req.body || '{}');
}

function validateOrigin(req) {
  const origin = req.headers.origin;
  if (!origin || process.env.VERCEL_ENV !== 'production') return true;
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return ['julian-arndt.com', 'www.julian-arndt.com'].includes(hostname) || hostname.endsWith('.vercel.app');
  } catch (error) {
    return false;
  }
}

function sanitizeUrl(value, allowedHosts) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:') return '';
    const host = url.hostname.toLowerCase();
    if (allowedHosts && !allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) return '';
    return url.toString().slice(0, 1500);
  } catch (error) {
    return '';
  }
}

function sanitizeAttribution(value) {
  const attribution = value && typeof value === 'object' ? value : {};
  return {
    utmSource: cleanText(attribution.utmSource, 120),
    utmMedium: cleanText(attribution.utmMedium, 120),
    utmCampaign: cleanText(attribution.utmCampaign, 180),
    utmContent: cleanText(attribution.utmContent, 180),
    utmTerm: cleanText(attribution.utmTerm, 180),
    fbclid: cleanText(attribution.fbclid, 500),
    fbp: cleanText(attribution.fbp, 220),
    fbc: cleanText(attribution.fbc, 500),
    landingPage: sanitizeUrl(attribution.landingPage, ['julian-arndt.com', 'vercel.app']),
    referrer: sanitizeUrl(attribution.referrer)
  };
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : '';
}

async function requestJson(url, { method = 'POST', payload, headers = {}, timeoutMs = 4500 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: controller.signal
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (error) { data = null; }
    if (!response.ok) {
      const requestError = new Error(`upstream_${response.status}`);
      requestError.status = response.status;
      requestError.data = data;
      throw requestError;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function getSupabaseConfig() {
  const url = cleanText(process.env.SUPABASE_URL, 600).replace(/\/+$/, '');
  const serviceRoleKey = cleanText(process.env.SUPABASE_SERVICE_ROLE_KEY, 6000);
  const table = cleanText(process.env.SUPABASE_LEADS_TABLE, 80) || DEFAULT_SUPABASE_TABLE;
  if (!url || !serviceRoleKey) return null;
  if (!/^https:\/\//i.test(url) || !/^[a-zA-Z0-9_]+$/.test(table)) return null;
  return { url, serviceRoleKey, table };
}

function supabaseHeaders(config) {
  const headers = {
    apikey: config.serviceRoleKey,
    Prefer: 'return=minimal'
  };
  if (!config.serviceRoleKey.startsWith('sb_secret_')) {
    headers.Authorization = `Bearer ${config.serviceRoleKey}`;
  }
  return headers;
}

async function updateScheduledLead(leadId, scheduledAt) {
  const config = getSupabaseConfig();
  if (!config) return { skipped: 'not_configured' };
  const endpoint = `${config.url}/rest/v1/${encodeURIComponent(config.table)}?id=eq.${encodeURIComponent(leadId)}`;
  await requestJson(endpoint, {
    method: 'PATCH',
    payload: {
      status: 'scheduled',
      contact_preference: 'calendar',
      preference_updated_at: scheduledAt,
      updated_at: scheduledAt
    },
    headers: supabaseHeaders(config)
  });
  return { sent: true };
}

async function sendMetaScheduleEvent({ body, req, eventId, attribution }) {
  if (body.marketingConsent !== true) return { skipped: 'no_marketing_consent' };

  const accessToken = cleanText(process.env.META_CAPI_ACCESS_TOKEN, 6000);
  const pixelId = cleanText(process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID, 80);
  if (!accessToken || !pixelId) return { skipped: 'not_configured' };

  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const firstName = cleanText(body.name, 80).split(/\s+/)[0].toLowerCase();
  const userData = {
    em: [sha256(email)],
    ph: [sha256(phone)],
    fn: [sha256(firstName)],
    external_id: [sha256(cleanText(body.leadId, 120))],
    client_ip_address: getClientIp(req),
    client_user_agent: cleanText(req.headers['user-agent'], 500)
  };
  if (attribution.fbp) userData.fbp = attribution.fbp;
  if (attribution.fbc) userData.fbc = attribution.fbc;

  const data = [{
    event_name: 'Schedule',
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'website',
    event_source_url: attribution.landingPage || 'https://julian-arndt.com/',
    user_data: userData,
    custom_data: {
      content_name: 'Calendly 30-Minuten-Termin',
      content_category: 'Beratungstermin',
      status: 'booked'
    }
  }];

  const payload = { data };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  const graphVersion = cleanText(process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION, 20);
  const endpoint = `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`;
  return requestJson(endpoint, { method: 'POST', payload, timeoutMs: 2500 });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  }
  if (!validateOrigin(req)) return sendJson(res, 403, { ok: false, message: 'Origin not allowed.' });

  let body;
  try {
    body = parseBody(req);
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { ok: false, message: 'Ungültige Anfrage.' });
  }

  const leadId = cleanText(body.leadId, 120);
  const eventId = cleanText(body.eventId, 120);
  const name = cleanText(body.name, 80);
  const email = normalizeEmail(body.email);
  const phone = cleanText(body.phone, 32);
  if (!/^cf_[a-f0-9-]{36}$/i.test(leadId) || !/^schedule_[a-zA-Z0-9_-]{8,120}$/.test(eventId)) {
    return sendJson(res, 400, { ok: false, message: 'Ungültige Terminreferenz.' });
  }
  if (name.length < 2 || !isValidEmail(email) || !isValidPhone(phone)) {
    return sendJson(res, 400, { ok: false, message: 'Ungültige Kontaktdaten.' });
  }

  const scheduledAt = new Date().toISOString();
  let storageStatus = 'not_configured';
  try {
    const storage = await updateScheduledLead(leadId, scheduledAt);
    storageStatus = storage.skipped || 'sent';
  } catch (error) {
    storageStatus = 'failed';
    console.error('Schedule storage update failed:', error.message);
  }

  const attribution = sanitizeAttribution(body.attribution);
  let metaStatus = 'skipped';
  try {
    const result = await sendMetaScheduleEvent({ body: { ...body, name, email, phone, leadId }, req, eventId, attribution });
    metaStatus = result && result.skipped ? result.skipped : 'sent';
  } catch (error) {
    metaStatus = 'failed';
    console.error('Meta Schedule CAPI event failed:', error.message);
  }

  return sendJson(res, 200, {
    ok: true,
    eventId,
    metaStatus,
    storageStatus
  });
};

module.exports._internal = {
  normalizeEmail,
  normalizePhone,
  sanitizeAttribution,
  sendMetaScheduleEvent
};
