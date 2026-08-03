const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dist', 'index.html');
if (!fs.existsSync(filePath)) {
  throw new Error('dist/index.html is missing before funnel validation fix.');
}

let html = fs.readFileSync(filePath, 'utf8');

const brokenEmailRegex = String.raw`/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/`;
const fixedEmailRegex = String.raw`/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`;
const brokenPhoneRegex = String.raw`/\\D/g`;
const fixedPhoneRegex = String.raw`/\D/g`;

if (!html.includes(brokenEmailRegex)) {
  throw new Error('Broken funnel email validation pattern was not found.');
}
if (!html.includes(brokenPhoneRegex)) {
  throw new Error('Broken funnel phone normalization pattern was not found.');
}

html = html.replace(brokenEmailRegex, fixedEmailRegex);
html = html.replace(brokenPhoneRegex, fixedPhoneRegex);

if (!html.includes(fixedEmailRegex) || !html.includes(fixedPhoneRegex)) {
  throw new Error('Funnel validation patterns were not corrected.');
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('Funnel email and phone validation corrected.');
