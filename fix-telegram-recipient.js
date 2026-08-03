const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'api', 'telegram-lead.js');
let source = fs.readFileSync(filePath, 'utf8');

const oldBlock = `async function resolveTelegramConfig() {
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
}`;

const newBlock = `async function resolveTelegramConfig() {
  const token = getTelegramToken();
  if (!token) return { token: '', chatIds: [], reason: 'missing_or_invalid_token' };
  try {
    const discovered = await discoverJulianChatIds(token);
    if (discovered.length) {
      console.log('Julian Telegram recipient discovered and prioritized.');
      return { token, chatIds: discovered, reason: 'julian_auto_discovered' };
    }
  } catch (error) {
    console.error('Telegram recipient discovery failed:', error.message);
  }
  const configured = getConfiguredChatIds();
  if (configured.length) return { token, chatIds: configured, reason: 'configured_fallback' };
  return { token, chatIds: [], reason: 'recipient_not_found' };
}`;

if (!source.includes(oldBlock)) {
  if (source.includes("reason: 'julian_auto_discovered'")) {
    console.log('Julian Telegram recipient priority already applied.');
    process.exit(0);
  }
  throw new Error('Telegram recipient resolver block not found.');
}

source = source.replace(oldBlock, newBlock);
fs.writeFileSync(filePath, source, 'utf8');
console.log('Julian Telegram chat is now prioritized over the previous test recipient.');
