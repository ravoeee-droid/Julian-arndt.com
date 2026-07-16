const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html is missing before the hero highlight step.');
}

let html = fs.readFileSync(indexPath, 'utf8');
const oldHeadline = '<h1 class="hero-h1">Baue dir in unter <em class="hero-days">90 Tagen</em> die Grundlage für einen zusätzlichen Cashflow auf mit nur 20 Minuten Zeit pro Tag.</h1>';
const newHeadline = '<h1 class="hero-h1">Baue dir in unter <em class="hero-days">90 Tagen</em> die Grundlage für einen zusätzlichen Cashflow auf mit nur <em>20 Minuten</em> Zeit pro Tag.</h1>';

if (html.includes(oldHeadline)) {
  html = html.replace(oldHeadline, newHeadline);
}

if (!html.includes(newHeadline)) {
  throw new Error('The exact hero headline could not be highlighted as requested.');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Hero highlight applied: 20 Minuten is now gold.');
