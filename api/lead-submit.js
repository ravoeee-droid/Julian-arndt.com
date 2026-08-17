const crypto = require('crypto');
const leadHandler = require('./lead');
const telegramLeadHandler = require('./telegram-lead');

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

function createCaptureResponse() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: '',
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), { name, value });
    },
    getHeader(name) {
      const entry = headers.get(String(name).toLowerCase());
      return entry ? entry.value : undefined;
    },
    getHeaders() {
      return Array.from(headers.values());
    },
    end(chunk) {
      if (chunk !== undefined && chunk !== null) {
        this.body += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      }
      return this;
    }
  };
}

function replay(captured, res) {
  res.statusCode = captured.statusCode || 200;
  for (const header of captured.getHeaders()) {
    res.setHeader(header.name, header.value);
  }
  return res.end(captured.body);
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body !== 'string') return {};
  try {
    return JSON.parse(req.body || '{}');
  } catch (error) {
    return {};
  }
}

function buildTelegramFallbackEvent(body, req) {
  const now = new Date().toISOString();
  if (body.action === 'preference') {
    return {
      type: 'lead.preference_updated',
      version: 2,
      leadId: String(body.leadId || ''),
      preference: String(body.preference || ''),
      updatedAt: now,
      source: 'julian-arndt.com/cashflow-plan',
      attribution: body.attribution && typeof body.attribution === 'object' ? body.attribution : {},
      technical: { userAgent: String(req.headers['user-agent'] || '').slice(0, 500) }
    };
  }

  const leadId = `cf_${crypto.randomUUID()}`;
  const eventId = String(body.eventId || '').trim().slice(0, 120) || `lead_${crypto.randomUUID()}`;
  return {
    type: 'lead.created',
    version: 2,
    leadId,
    eventId,
    createdAt: now,
    source: 'julian-arndt.com/cashflow-plan',
    contact: {
      firstName: String(body.name || '').trim().slice(0, 100),
      email: String(body.email || '').trim().slice(0, 180),
      phone: String(body.phone || '').trim().slice(0, 50)
    },
    qualification: body.answers && typeof body.answers === 'object' ? body.answers : {},
    contactPreference: 'unselected',
    consent: {
      privacyAccepted: body.privacyAccepted === true,
      marketingConsent: body.marketingConsent === true
    },
    attribution: body.attribution && typeof body.attribution === 'object' ? body.attribution : {},
    technical: { userAgent: String(req.headers['user-agent'] || '').slice(0, 500) }
  };
}

async function deliverTelegramFallback(body, req) {
  const secret = String(process.env.LEAD_WEBHOOK_SECRET || '').trim();
  if (!secret) throw new Error('telegram_fallback_secret_missing');

  const event = buildTelegramFallbackEvent(body, req);
  const telegramReq = {
    method: 'POST',
    headers: {
      ...req.headers,
      authorization: `Bearer ${secret}`
    },
    body: event
  };
  const telegramRes = createCaptureResponse();
  await telegramLeadHandler(telegramReq, telegramRes);

  let responseBody = null;
  try { responseBody = JSON.parse(telegramRes.body || '{}'); } catch (error) { responseBody = null; }
  if (telegramRes.statusCode < 200 || telegramRes.statusCode >= 300 || !responseBody || responseBody.ok !== true) {
    throw new Error(`telegram_fallback_${telegramRes.statusCode || 500}`);
  }

  return event;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (!isTrustedOrigin(req)) {
    return sendJson(res, 403, { ok: false, message: 'Origin not allowed.' });
  }

  req.headers = { ...req.headers };
  delete req.headers.origin;

  const body = parseBody(req);
  const captured = createCaptureResponse();
  await leadHandler(req, captured);

  let leadResponse = null;
  try { leadResponse = JSON.parse(captured.body || '{}'); } catch (error) { leadResponse = null; }

  const deliveryFailed = captured.statusCode === 502 && (
    (leadResponse && leadResponse.code === 'lead_delivery_failed') ||
    body.action === 'preference'
  );

  if (deliveryFailed) {
    try {
      const event = await deliverTelegramFallback(body, req);
      console.warn('Primary lead storage unavailable; Telegram failover delivered the event.');
      if (body.action === 'preference') {
        return sendJson(res, 200, { ok: true, storage: 'telegram-fallback' });
      }
      return sendJson(res, 200, {
        ok: true,
        leadId: event.leadId,
        eventId: event.eventId,
        metaStatus: 'skipped_after_storage_failover',
        storage: 'telegram-fallback'
      });
    } catch (error) {
      console.error('Telegram lead failover failed:', error.message);
    }
  }

  return replay(captured, res);
};
