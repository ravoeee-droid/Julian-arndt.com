const MAX_BODY_BYTES = 48 * 1024;

const LABELS = {
  goal: {
    cashflow: 'Zusätzlichen Cashflow aufbauen',
    structure: 'Mehr Struktur ins Portfolio bringen',
    improve: 'Bestehende Ergebnisse verbessern',
    orientation: 'Erst einmal Klarheit gewinnen'
  },
  experience: {
    starter: 'Noch am Anfang',
    invested: 'Bereits investiert',
    active: 'Aktiv und erfahren'
  },
  capital: {
    'under-5k': 'Unter 5.000 €',
    '5k-20k': '5.000–20.000 €',
    '20k-50k': '20.000–50.000 €',
    'over-50k': 'Über 50.000 €',
    monthly: 'Monatlicher Aufbau geplant'
  },
  blocker: {
    information: 'Zu viele widersprüchliche Informationen',
    strategy: 'Keine klare Strategie',
    risk: 'Unsicherheit beim Risiko',
    time: 'Zu wenig Zeit für die Umsetzung'
  },
  preference: {
    callback: 'Sofortiger Rückruf gewünscht',
    calendar: 'Calendly geöffnet / Terminwahl'
  }
};

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clean(value, maxLength = 500) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
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

function verifyWebhook(req) {
  const configured = clean(process.env.LEAD_WEBHOOK_SECRET, 1000);
  if (!configured) return false;
  const header = clean(req.headers.authorization, 1200);
  return header === `Bearer ${configured}`;
}

function label(group, value) {
  return LABELS[group] && LABELS[group][value] ? LABELS[group][value] : clean(value, 180) || 'Nicht angegeben';
}

function sourceLine(attribution = {}) {
  const source = clean(attribution.utmSource, 120);
  const medium = clean(attribution.utmMedium, 120);
  const campaign = clean(attribution.utmCampaign, 180);
  const parts = [];
  if (source) parts.push(source);
  if (medium) parts.push(medium);
  if (campaign) parts.push(campaign);
  return parts.length ? parts.join(' · ') : 'Direkt / unbekannt';
}

function formatCreated(payload) {
  const contact = payload.contact || {};
  const qualification = payload.qualification || {};
  const attribution = payload.attribution || {};
  const createdAt = payload.createdAt ? new Date(payload.createdAt) : new Date();
  const time = Number.isNaN(createdAt.getTime())
    ? ''
    : createdAt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' });

  return [
    '🚨 <b>NEUER CASHFLOW-LEAD</b>',
    '',
    `👤 <b>Name:</b> ${escapeHtml(clean(contact.firstName, 100))}`,
    `📞 <b>Telefon:</b> <code>${escapeHtml(clean(contact.phone, 50))}</code>`,
    `✉️ <b>E-Mail:</b> ${escapeHtml(clean(contact.email, 180))}`,
    '',
    `🎯 <b>Ziel:</b> ${escapeHtml(label('goal', qualification.goal))}`,
    `📈 <b>Erfahrung:</b> ${escapeHtml(label('experience', qualification.experience))}`,
    `💰 <b>Kapital:</b> ${escapeHtml(label('capital', qualification.capital))}`,
    `🚧 <b>Hindernis:</b> ${escapeHtml(label('blocker', qualification.blocker))}`,
    '',
    '⏱ <b>Kontaktwunsch:</b> Noch nicht ausgewählt',
    `📣 <b>Quelle:</b> ${escapeHtml(sourceLine(attribution))}`,
    time ? `🕒 <b>Eingang:</b> ${escapeHtml(time)} Uhr` : '',
    `🆔 <b>Lead-ID:</b> <code>${escapeHtml(clean(payload.leadId, 140))}</code>`,
    '',
    '👉 <b>Am besten innerhalb weniger Minuten reagieren.</b>'
  ].filter(Boolean).join('\n');
}

function formatPreference(payload) {
  return [
    '🔔 <b>LEAD-AKTUALISIERUNG</b>',
    '',
    `⏱ <b>Kontaktwunsch:</b> ${escapeHtml(label('preference', payload.preference))}`,
    `🆔 <b>Lead-ID:</b> <code>${escapeHtml(clean(payload.leadId, 140))}</code>`
  ].join('\n');
}

function formatMessage(payload) {
  if (payload.type === 'lead.created') return formatCreated(payload);
  if (payload.type === 'lead.preference_updated') return formatPreference(payload);
  return '';
}

function getTelegramToken() {
  const token = clean(process.env.TELEGRAM_BOT_TOKEN, 500);
  return /^\d+:[A-Za-z0-9_-]{20,}$/.test(token) ? token : '';
}

function getConfiguredChatIds() {
  return clean(process.env.TELEGRAM_CHAT_ID, 1000)
    .split(',')
    .map((value) => value.trim())
    .filter((value) => /^-?\d+$/.test(value));
}

async function telegramRequest(token, method, payload, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
      signal: controller.signal
    });
    const body = await response.text();
    let data = null;
    try { data = body ? JSON.parse(body) : null; } catch (error) { data = null; }
    if (!response.ok || !data || data.ok !== true) {
      const error = new Error(`telegram_${method}_${response.status}`);
      error.details = body.slice(0, 500);
      throw error;
    }
    return data.result;
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverJulianChatIds(token) {
  const updates = await telegramRequest(token, 'getUpdates', {
    limit: 100,
    timeout: 0,
    allowed_updates: ['message']
  });
  const messages = (Array.isArray(updates) ? updates : [])
    .map((update) => update && update.message)
    .filter((message) => message && message.chat && message.chat.type === 'private');

  const exactJulian = messages.filter((message) => clean(message.text, 100).toLowerCase() === 'julian');
  const namedJulian = messages.filter((message) => {
    const firstName = clean(message.from && message.from.first_name, 100).toLowerCase();
    return firstName === 'julian';
  });
  const preferred = exactJulian[exactJulian.length - 1] || namedJulian[namedJulian.length - 1] || messages[messages.length - 1];
  if (!preferred) return [];
  const chatId = String(preferred.chat.id);
  return /^\d+$/.test(chatId) ? [chatId] : [];
}

async function resolveTelegramConfig() {
  const token = getTelegramToken();
  if (!token) return { token: '', chatIds: [], reason: 'missing_or_invalid_token' };
  const configured = getConfiguredChatIds();
  if (configured.length) return { token, chatIds: configured, reason: 'configured' };
  try {
    const discovered = await discoverJulianChatIds(token);
    if (discovered.length) {
      console.log('Telegram recipient auto-discovered from private bot conversation.');
      return { token, chatIds: discovered, reason: 'auto_discovered' };
    }
    return { token, chatIds: [], reason: 'recipient_not_found' };
  } catch (error) {
    console.error('Telegram recipient discovery failed:', error.message);
    return { token, chatIds: [], reason: 'recipient_discovery_failed' };
  }
}

async function sendTelegram(token, chatId, text) {
  await telegramRequest(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  }
  if (!verifyWebhook(req)) return sendJson(res, 401, { ok: false, message: 'Unauthorized.' });

  let payload;
  try {
    payload = parseBody(req);
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { ok: false, message: 'Invalid payload.' });
  }

  const text = formatMessage(payload);
  if (!text) return sendJson(res, 202, { ok: true, skipped: 'unsupported_event' });

  const config = await resolveTelegramConfig();
  if (!config.token) {
    console.error('Telegram lead notification unavailable:', config.reason);
    return sendJson(res, 503, { ok: false, message: 'Telegram bot token is not configured.' });
  }
  if (!config.chatIds.length) {
    console.error('Telegram lead notification unavailable:', config.reason);
    return sendJson(res, 503, { ok: false, message: 'Telegram recipient is not configured.' });
  }

  const results = await Promise.allSettled(
    config.chatIds.map((chatId) => sendTelegram(config.token, chatId, text))
  );
  const sent = results.filter((result) => result.status === 'fulfilled').length;

  if (sent === 0) {
    const firstError = results.find((result) => result.status === 'rejected');
    console.error('Telegram lead notification failed:', firstError && firstError.reason && firstError.reason.message);
    return sendJson(res, 502, { ok: false, message: 'Telegram delivery failed.' });
  }

  return sendJson(res, 200, { ok: true, sent, recipientSource: config.reason });
};

module.exports._internal = {
  discoverJulianChatIds,
  escapeHtml,
  formatCreated,
  formatPreference,
  getConfiguredChatIds,
  getTelegramToken,
  resolveTelegramConfig
};
