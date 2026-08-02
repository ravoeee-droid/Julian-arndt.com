const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('dist/index.html is missing before viewport metadata fix.');

let html = fs.readFileSync(indexPath, 'utf8');
const viewport = '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">';
const viewportTag = /<meta\b[^>]*\bname=(?:"viewport"|'viewport')[^>]*>/i;

if (viewportTag.test(html)) html = html.replace(viewportTag, viewport);
else html = html.replace('<head>', `<head>\n${viewport}`);

if (!html.includes('viewport-fit=cover')) throw new Error('Could not apply viewport-fit=cover.');
fs.writeFileSync(indexPath, html, 'utf8');
console.log('Mobile viewport metadata fixed with iOS safe-area support.');
