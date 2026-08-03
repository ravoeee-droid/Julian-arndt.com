const ACTIVATION_KEY = 'julian-activate-2026-08-03-9f7c2d';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function clean(value, maxLength = 500) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function getToken() {
  const token = clean(process.env.TELEGRAM_BOT_TOKEN, 500);
  return /^\d+:[A-Za-z0-9_-]{20,}$/.test(token) ? token : '';
}

async function telegramRequest(token, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  const data = await response.json();
  if (!response.ok || !data || data.ok !== true) throw new Error(`telegram_${method}_${response.status}`);
  return data.result;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false });
  const url = new URL(req.url, 'https://julian-arndt.com');
  if (url.searchParams.get('key') !== ACTIVATION_KEY) return sendJson(res, 401, { ok: false });

  const token = getToken();
  if (!token) return sendJson(res, 500, { ok: false, reason: 'missing_token' });

  const updates = await telegramRequest(token, 'getUpdates', { limit: 100, timeout: 0, allowed_updates: ['message'] });
  const messages = (Array.isArray(updates) ? updates : [])
    .map((update) => update && update.message)
    .filter((message) => message && message.chat && message.chat.type === 'private');

  const julianMessages = messages.filter((message) => {
    const text = clean(message.text, 100).toLowerCase();
    const firstName = clean(message.from && message.from.first_name, 100).toLowerCase();
    return text === 'julian' || firstName === 'julian';
  });

  const target = julianMessages[julianMessages.length - 1];
  if (!target) return sendJson(res, 404, { ok: false, reason: 'julian_not_found' });

  await telegramRequest(token, 'sendMessage', {
    chat_id: String(target.chat.id),
    text: '✅ Bot erfolgreich verbunden. Neue Leads von julian-arndt.com werden dir ab jetzt hier gesendet.',
    disable_web_page_preview: true
  });

  return sendJson(res, 200, { ok: true, chatId: String(target.chat.id) });
};
