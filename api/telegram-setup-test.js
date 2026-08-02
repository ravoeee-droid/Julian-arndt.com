const SETUP_KEY = 'tg-setup-7c41f09a2d6e';

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false });
  const requestUrl = new URL(req.url || '/', 'https://julian-arndt.com');
  if (requestUrl.searchParams.get('key') !== SETUP_KEY) return json(res, 404, { ok: false });

  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) {
    return json(res, 503, { ok: false, reason: 'invalid_or_missing_token' });
  }

  try {
    const updatesResponse = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 100, timeout: 0, allowed_updates: ['message'] })
    });
    const updatesBody = await updatesResponse.json();
    if (!updatesResponse.ok || !updatesBody.ok) {
      return json(res, 502, { ok: false, reason: 'get_updates_failed' });
    }

    const messages = (updatesBody.result || [])
      .map((update) => update && update.message)
      .filter((message) => message && message.chat && message.chat.type === 'private');
    const exact = messages.filter((message) => String(message.text || '').trim().toLowerCase() === 'julian');
    const named = messages.filter((message) => String(message.from && message.from.first_name || '').trim().toLowerCase() === 'julian');
    const candidates = exact.length ? exact : named;
    const message = candidates[candidates.length - 1];
    if (!message) return json(res, 404, { ok: false, reason: 'julian_message_not_found', privateMessages: messages.length });

    const chatId = String(message.chat.id);
    const sendResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '✅ <b>Julian Lead Alarm ist verbunden.</b>\n\nNeue Website-Leads werden ab jetzt sofort hier aufbereitet zugestellt.',
        parse_mode: 'HTML'
      })
    });
    const sendBody = await sendResponse.json();
    if (!sendResponse.ok || !sendBody.ok) {
      return json(res, 502, { ok: false, reason: 'test_message_failed', chatId });
    }

    return json(res, 200, {
      ok: true,
      chatId,
      firstName: String(message.from && message.from.first_name || ''),
      testMessageSent: true
    });
  } catch (error) {
    return json(res, 500, { ok: false, reason: 'unexpected_error' });
  }
};
