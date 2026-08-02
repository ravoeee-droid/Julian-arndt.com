const crypto = require('crypto');

const DEFAULT_PIXEL_ID = '1599406528431495';
const DEFAULT_GRAPH_VERSION = 'v25.0';
const DEFAULT_SUPABASE_TABLE = 'cashflow_leads';
const MAX_BODY_BYTES = 24 * 1024;

const ALLOWED_ANSWERS = {
  goal: ['cashflow', 'structure', 'improve', 'orientation'],
  experience: ['starter', 'invested', 'active'],
  capital: ['under-5k', '5k-20k', '20k-50k', 'over-50k', 'monthly'],
  blocker: ['information', 'strategy', 'risk', 'time']
};

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

function cleanText(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanPhone(value) {
  return cleanText(value, 32).replace(/[^+\d()\-\s]/g, '');
}

function normalizePhone(value) {
  let phone = String(value || '').replace(/\D/g, '');
  if (phone.startsWith('00')) phone = phone.slice(2);
  if (phone.startsWith('0')) phone = `49${phone.slice(1)}`;
  return phone;
}

function normalizeEmail(value) {
  return cleanText(value, 180).toLowerCase();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function isValidPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 16;
}

function isAllowedUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' || url.hostname === 'localhost';
  } catch (error) {
    return false;
  }
}

function isAllowedLandingPage(value) {
  try {
    const url = new URL(String(value || ''));
    return (url.protocol === 'https:' && ['julian-arndt.com', 'www.julian-arndt.com'].includes(url.hostname.toLowerCase())) || url.hostname === 'localhost';
  } catch (error) {
    return false;
  }
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : '';
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

  const configured = cleanText(process.env.ALLOWED_FORM_HOSTS, 500);
  const allowedHosts = (configured || 'julian-arndt.com,www.julian-arndt.com')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  try {
    return allowedHosts.includes(new URL(origin).hostname.toLowerCase());
  } catch (error) {
    return false;
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
    landingPage: isAllowedLandingPage(attribution.landingPage) ? String(attribution.landingPage).slice(0, 1500) : '',
    referrer: isAllowedUrl(attribution.referrer) ? String(attribution.referrer).slice(0, 1500) : ''
  };
}

function validateLead(body) {
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
  const name = cleanText(body.name, 80);
  const email = normalizeEmail(body.email);
  const phone = cleanPhone(body.phone);
  const errors = {};

  if (name.length < 2) errors.name = 'Bitte gib deinen Vornamen ein.';
  if (!isValidEmail(email)) errors.email = 'Bitte gib eine gültige E-Mail-Adresse ein.';
  if (!isValidPhone(phone)) errors.phone = 'Bitte gib eine gültige Telefonnummer ein.';
  if (body.privacyAccepted !== true) errors.privacy = 'Bitte bestätige die Datenschutzhinweise.';

  for (const [key, allowed] of Object.entries(ALLOWED_ANSWERS)) {
    if (!allowed.includes(answers[key])) errors[key] = 'Bitte beantworte alle Fragen.';
  }

  const elapsed = Number(body.elapsedMs || 0);
  if (!Number.isFinite(elapsed) || elapsed < 2500 || elapsed > 24 * 60 * 60 * 1000) {
    errors.session = 'Bitte starte den Cashflow-Plan erneut.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    lead: {
      name,
      email,
      phone,
      answers: {
        goal: answers.goal,
        experience: answers.experience,
        capital: answers.capital,
        blocker: answers.blocker
      },
      privacyAccepted: true,
      marketingConsent: body.marketingConsent === true,
      attribution: sanitizeAttribution(body.attribution)
    }
  };
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
  if (!/^https:\/\//i.test(url)) throw new Error('invalid_supabase_url');
  if (!/^[a-zA-Z0-9_]+$/.test(table)) throw new Error('invalid_supabase_table');
  return { url, serviceRoleKey, table };
}

function supabaseHeaders(config, prefer = 'return=minimal') {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    Prefer: prefer
  };
}

function mapLeadToSupabaseRow(payload) {
  const attribution = payload.attribution || {};
  const qualification = payload.qualification || {};
  return {
    id: payload.leadId,
    event_id: payload.eventId,
    created_at: payload.createdAt,
    updated_at: payload.createdAt,
    source: payload.source,
    status: 'new',
    contact_preference: payload.contactPreference || 'unselected',
    first_name: payload.contact && payload.contact.firstName,
    email: payload.contact && payload.contact.email,
    phone: payload.contact && payload.contact.phone,
    goal: qualification.goal || null,
    experience: qualification.experience || null,
    capital: qualification.capital || null,
    blocker: qualification.blocker || null,
    qualification,
    privacy_accepted: Boolean(payload.consent && payload.consent.privacyAccepted),
    marketing_consent: Boolean(payload.consent && payload.consent.marketingConsent),
    utm_source: attribution.utmSource || null,
    utm_medium: attribution.utmMedium || null,
    utm_campaign: attribution.utmCampaign || null,
    utm_content: attribution.utmContent || null,
    utm_term: attribution.utmTerm || null,
    fbclid: attribution.fbclid || null,
    fbp: attribution.fbp || null,
    fbc: attribution.fbc || null,
    landing_page: attribution.landingPage || null,
    referrer: attribution.referrer || null,
    attribution,
    user_agent: payload.technical && payload.technical.userAgent
  };
}

async function upsertSupabaseLead(config, payload) {
  const endpoint = `${config.url}/rest/v1/${encodeURIComponent(config.table)}?on_conflict=event_id`;
  return requestJson(endpoint, {
    method: 'POST',
    payload: mapLeadToSupabaseRow(payload),
    headers: supabaseHeaders(config, 'resolution=merge-duplicates,return=minimal')
  });
}

async function updateSupabasePreference(config, payload) {
  const endpoint = `${config.url}/rest/v1/${encodeURIComponent(config.table)}?id=eq.${encodeURIComponent(payload.leadId)}`;
  const status = payload.preference === 'callback' ? 'callback_requested' : 'calendar_opened';
  return requestJson(endpoint, {
    method: 'PATCH',
    payload: {
      contact_preference: payload.preference,
      status,
      preference_updated_at: payload.updatedAt,
      updated_at: payload.updatedAt
    },
    headers: supabaseHeaders(config)
  });
}

async function forwardToWebhook(payload) {
  const webhookUrl = cleanText(process.env.LEAD_WEBHOOK_URL, 1200);
  if (!webhookUrl) return { skipped: 'not_configured' };
  const headers = {};
  if (process.env.LEAD_WEBHOOK_SECRET) {
    headers.Authorization = `Bearer ${process.env.LEAD_WEBHOOK_SECRET}`;
  }
  await requestJson(webhookUrl, { method: 'POST', payload, headers });
  return { sent: true };
}

async function deliverLeadEvent(payload) {
  const supabase = getSupabaseConfig();
  let durableStorage = false;
  const result = {
    primary: 'none',
    supabase: supabase ? 'pending' : 'not_configured',
    webhook: process.env.LEAD_WEBHOOK_URL ? 'pending' : 'not_configured'
  };

  if (supabase) {
    if (payload.type === 'lead.created') await upsertSupabaseLead(supabase, payload);
    else if (payload.type === 'lead.preference_updated') await updateSupabasePreference(supabase, payload);
    result.supabase = 'sent';
    result.primary = 'supabase';
    durableStorage = true;
  }

  if (process.env.LEAD_WEBHOOK_URL) {
    try {
      await forwardToWebhook(payload);
      result.webhook = 'sent';
      if (!durableStorage) result.primary = 'webhook';
      durableStorage = true;
    } catch (error) {
      result.webhook = 'failed';
      if (!durableStorage) throw error;
      console.error('Optional lead webhook failed after durable storage:', error.message);
    }
  }

  if (!durableStorage) {
    if (process.env.VERCEL_ENV === 'production') throw new Error('lead_receiver_not_configured');
    result.primary = 'development_skip';
  }

  return result;
}

async function sendMetaLeadEvent({ lead, eventId, req }) {
  if (!lead.marketingConsent) return { skipped: 'no_marketing_consent' };

  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const pixelId = process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID;
  if (!accessToken || !pixelId) return { skipped: 'not_configured' };

  const graphVersion = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  const normalizedPhone = normalizePhone(lead.phone);
  const firstName = lead.name.split(' ')[0].toLowerCase();
  const userData = {
    em: [sha256(lead.email)],
    ph: [sha256(normalizedPhone)],
    fn: [sha256(firstName)],
    client_ip_address: getClientIp(req),
    client_user_agent: cleanText(req.headers['user-agent'], 500)
  };

  if (lead.attribution.fbp) userData.fbp = lead.attribution.fbp;
  if (lead.attribution.fbc) userData.fbc = lead.attribution.fbc;

  const data = [{
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'website',
    event_source_url: lead.attribution.landingPage || 'https://julian-arndt.com/',
    user_data: userData,
    custom_data: {
      content_name: 'Cashflow-Plan Funnel',
      content_category: 'Lead Funnel'
    }
  }];

  const payload = { data };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;

  const endpoint = `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`;
  return requestJson(endpoint, { method: 'POST', payload, timeoutMs: 2200 });
}

function buildLeadEvent(lead, leadId, eventId, req) {
  return {
    type: 'lead.created',
    version: 2,
    leadId,
    eventId,
    createdAt: new Date().toISOString(),
    source: 'julian-arndt.com/cashflow-plan',
    contact: {
      firstName: lead.name,
      email: lead.email,
      phone: lead.phone
    },
    qualification: lead.answers,
    contactPreference: 'unselected',
    consent: {
      privacyAccepted: true,
      marketingConsent: lead.marketingConsent
    },
    attribution: lead.attribution,
    technical: {
      userAgent: cleanText(req.headers['user-agent'], 500)
    }
  };
}

async function handleLeadCreate(body, req, res) {
  if (cleanText(body.companyWebsite, 200)) {
    return sendJson(res, 200, { ok: true, leadId: crypto.randomUUID() });
  }

  const validation = validateLead(body);
  if (!validation.valid) return sendJson(res, 400, { ok: false, errors: validation.errors });

  const leadId = `cf_${crypto.randomUUID()}`;
  const eventId = cleanText(body.eventId, 120) || `lead_${crypto.randomUUID()}`;
  const leadEvent = buildLeadEvent(validation.lead, leadId, eventId, req);

  let delivery;
  try {
    delivery = await deliverLeadEvent(leadEvent);
  } catch (error) {
    console.error('Lead delivery failed:', error.message);
    return sendJson(res, 502, {
      ok: false,
      code: 'lead_delivery_failed',
      message: 'Die Anfrage konnte gerade nicht sicher übertragen werden.'
    });
  }

  let metaStatus = 'skipped';
  try {
    const metaResult = await sendMetaLeadEvent({ lead: validation.lead, eventId, req });
    metaStatus = metaResult && metaResult.skipped ? metaResult.skipped : 'sent';
  } catch (error) {
    metaStatus = 'failed';
    console.error('Meta CAPI event failed:', error.message);
  }

  return sendJson(res, 200, { ok: true, leadId, eventId, metaStatus, storage: delivery.primary });
}

async function handlePreferenceUpdate(body, req, res) {
  const leadId = cleanText(body.leadId, 120);
  const preference = cleanText(body.preference, 40);
  if (!/^cf_[a-f0-9-]{36}$/i.test(leadId) || !['callback', 'calendar'].includes(preference)) {
    return sendJson(res, 400, { ok: false, message: 'Ungültige Auswahl.' });
  }

  const event = {
    type: 'lead.preference_updated',
    version: 2,
    leadId,
    preference,
    updatedAt: new Date().toISOString(),
    source: 'julian-arndt.com/cashflow-plan',
    attribution: sanitizeAttribution(body.attribution),
    technical: { userAgent: cleanText(req.headers['user-agent'], 500) }
  };

  let delivery;
  try {
    delivery = await deliverLeadEvent(event);
  } catch (error) {
    console.error('Lead preference delivery failed:', error.message);
    return sendJson(res, 502, { ok: false, message: 'Die Auswahl konnte gerade nicht gespeichert werden.' });
  }

  return sendJson(res, 200, { ok: true, storage: delivery.primary });
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  }
  if (!validateOrigin(req)) return sendJson(res, 403, { ok: false, message: 'Origin not allowed.' });
  const contentLength = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return sendJson(res, 413, { ok: false, message: 'Anfrage zu groß.' });
  }

  let body;
  try {
    body = parseBody(req);
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { ok: false, message: 'Ungültige Anfrage.' });
  }

  if (body.action === 'preference') return handlePreferenceUpdate(body, req, res);
  return handleLeadCreate(body, req, res);
}

module.exports = handler;
module.exports._internal = {
  ALLOWED_ANSWERS,
  cleanText,
  getSupabaseConfig,
  mapLeadToSupabaseRow,
  normalizeEmail,
  normalizePhone,
  sanitizeAttribution,
  validateLead
};
