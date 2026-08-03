const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'api', 'telegram-bot.js');
let source = fs.readFileSync(filePath, 'utf8');

const oldCode = "const isJulian = clean(from.first_name,100).toLowerCase() === 'julian'; if (!isJulian) { if (chatId) await telegram('sendMessage',{chat_id:chatId,text:'Dieser Bot ist nur für Julian freigeschaltet.'}); return json(res,200,{ok:true,ignored:true}); }";
const newCode = "const allowedChatIds = ['393937524','5056490944']; const isAllowed = allowedChatIds.includes(chatId); if (!isAllowed) { if (chatId) await telegram('sendMessage',{chat_id:chatId,text:'Dieser Bot ist nur für Julian und Raphael freigeschaltet.'}); return json(res,200,{ok:true,ignored:true}); }";

if (source.includes(newCode)) {
  console.log('Raphael Telegram access already enabled.');
  process.exit(0);
}
if (!source.includes(oldCode)) throw new Error('Telegram authorization block not found.');
source = source.replace(oldCode, newCode);
fs.writeFileSync(filePath, source, 'utf8');
console.log('Raphael and Julian can now use the Telegram lead bot.');
