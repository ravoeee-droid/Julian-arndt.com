const crypto = require('crypto');
const leadHandler = require('./lead');

const FALLBACK_TELEGRAM_CHAT_IDS = ['393937524', '5056490944'];

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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getTelegramToken() {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  return /^\d+:[A-Za-z0-9_-]{20,}$/.test(token) ? token : '';
}

function getTelegramChatIds() {
  const configured = String(process.env.TELEGRAM_CHAT_ID || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => /^-?\d+$/.test(value));
  return configured.length ? configured : FALLBACK_TELEGRAM_CHAT_IDS;
}

async function telegramRequest(token, chatId, text) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
      signal: controller.signal
    });
    const raw = await response.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch (error) { data = null; }
    if (!response.ok || !data || data.ok !== true) {
      throw new Error(`telegram_${response.status}`);
    }
    return true;
  } finally {
    clearTimeout(timeout);
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

function fallbackMessage(event) {
  if (event.type === 'lead.preference_updated') {
    return [
      '🔔 <b>LEAD-AKTUALISIERUNG</b>',
      '',
      `⏱ <b>Kontaktwunsch:</b> ${escapeHtml(event.preference)}`,
      `🆔 <b>Lead-ID:</b> <code>${escapeHtml(event.leadId)}</code>`
    ].join('\n');
  }

  const q = event.qualification || {};
  const contact = event.contact || {};
  return [
    '🚨 <b>NEUER CASHFLOW-LEAD</b>',
    '',
    `👤 <b>Name:</b> ${escapeHtml(contact.firstName)}`,
    `📞 <b>Telefon:</b> <code>${escapeHtml(contact.phone)}</code>`,
    `✉️ <b>E-Mail:</b> ${escapeHtml(contact.email)}`,
    '',
    `🎯 <b>Ziel:</b> ${escapeHtml(q.goal)}`,
    `📈 <b>Erfahrung:</b> ${escapeHtml(q.experience)}`,
    `💰 <b>Kapital:</b> ${escapeHtml(q.capital)}`,
    `🚧 <b>Hindernis:</b> ${escapeHtml(q.blocker)}`,
    '',
    `🆔 <b>Lead-ID:</b> <code>${escapeHtml(event.leadId)}</code>`,
    '',
    '⚠️ <i>Backup-Zustellung aktiv, weil die primäre Lead-Datenbank nicht erreichbar ist.</i>'
  ].join('\n');
}

async function deliverTelegramFallback(body, req) {
  const token = getTelegramToken();
  if (!token) throw new Error('telegram_token_missing');

  const chatIds = getTelegramChatIds();
  if (!chatIds.length) throw new Error('telegram_recipient_missing');

  const event = buildTelegramFallbackEvent(body, req);
  const text = fallbackMessage(event);
  const results = await Promise.allSettled(
    chatIds.map((chatId) => telegramRequest(token, chatId, text))
  );
  const sent = results.filter((result) => result.status === 'fulfilled').length;
  if (sent === 0) throw new Error('telegram_delivery_failed');
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
      console.warn('Primary lead storage unavailable; direct Telegram failover delivered the event.');
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
      console.error('Direct Telegram lead failover failed:', error.message);
    }
  }

  return replay(captured, res);
};
