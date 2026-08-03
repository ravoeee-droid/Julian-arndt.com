const crypto = require('crypto');
const SETUP_KEY = 'setup-julian-bot-2026-08-03-a91f';

function clean(v, n = 1000) { return String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n); }
async function call(token, method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const d = await r.json();
  if (!r.ok || !d.ok) throw new Error(`${method}_${r.status}`);
  return d.result;
}
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'https://julian-arndt.com');
  if (req.method !== 'GET' || url.searchParams.get('key') !== SETUP_KEY) { res.statusCode = 401; return res.end(JSON.stringify({ ok: false })); }
  const token = clean(process.env.TELEGRAM_BOT_TOKEN, 500);
  const base = clean(process.env.LEAD_WEBHOOK_SECRET, 1000);
  if (!token || !base) { res.statusCode = 500; return res.end(JSON.stringify({ ok: false, reason: 'missing_config' })); }
  const secretToken = crypto.createHash('sha256').update(base).digest('hex');
  try {
    await call(token, 'setWebhook', { url: 'https://julian-arndt.com/api/telegram-bot', secret_token: secretToken, allowed_updates: ['message','callback_query'], drop_pending_updates: false });
    await call(token, 'setMyCommands', { commands: [
      { command: 'start', description: 'Bot starten' },
      { command: 'neu', description: 'Offene Leads anzeigen' },
      { command: 'heute', description: 'Heutige Leads anzeigen' },
      { command: 'lead', description: 'Lead suchen' },
      { command: 'notiz', description: 'Notiz speichern' },
      { command: 'zahlen', description: 'Tagesübersicht anzeigen' },
      { command: 'status', description: 'Systemstatus prüfen' },
      { command: 'help', description: 'Hilfe anzeigen' }
    ] });
    res.statusCode = 200; return res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    res.statusCode = 500; return res.end(JSON.stringify({ ok: false, error: error.message }));
  }
};
