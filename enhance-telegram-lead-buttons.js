const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'api', 'telegram-lead.js');
let source = fs.readFileSync(filePath, 'utf8');

const oldFunction = `async function sendTelegram(token, chatId, text) {
  await telegramRequest(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  });
}`;

const newFunction = `function leadActionKeyboard(payload) {
  if (!payload || payload.type !== 'lead.created' || !payload.leadId) return undefined;
  const id = clean(payload.leadId, 100);
  return {
    inline_keyboard: [
      [
        { text: '✅ Kontaktiert', callback_data: 'st:contacted:' + id },
        { text: '⭐ Qualifiziert', callback_data: 'st:qualified:' + id }
      ],
      [
        { text: '📅 Termin', callback_data: 'st:calendar_opened:' + id },
        { text: '🏆 Gewonnen', callback_data: 'out:won:' + id }
      ],
      [
        { text: '❌ Verloren', callback_data: 'out:lost:' + id }
      ]
    ]
  };
}

async function sendTelegram(token, chatId, text, payload) {
  const request = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  const keyboard = leadActionKeyboard(payload);
  if (keyboard) request.reply_markup = keyboard;
  await telegramRequest(token, 'sendMessage', request);
}`;

if (!source.includes(oldFunction)) {
  if (source.includes('function leadActionKeyboard(payload)')) {
    console.log('Telegram lead action buttons already applied.');
    process.exit(0);
  }
  throw new Error('Telegram send function not found.');
}
source = source.replace(oldFunction, newFunction);

const oldCall = `config.chatIds.map((chatId) => sendTelegram(config.token, chatId, text))`;
const newCall = `config.chatIds.map((chatId) => sendTelegram(config.token, chatId, text, payload))`;
if (!source.includes(oldCall)) throw new Error('Telegram send call not found.');
source = source.replace(oldCall, newCall);

fs.writeFileSync(filePath, source, 'utf8');
console.log('Telegram lead notifications now include action buttons.');
