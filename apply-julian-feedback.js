const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
const marker = 'JULIAN_FEEDBACK_2026_08_17';

if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html is missing before Julian feedback cleanup.');
}

let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes(marker)) {
  console.log('Julian feedback cleanup already applied.');
  process.exit(0);
}

function removeRequiredRegex(regex, label) {
  const matches = html.match(regex);
  if (!matches || matches.length !== 1) {
    throw new Error(`Expected exactly one ${label}, found ${matches ? matches.length : 0}.`);
  }
  html = html.replace(regex, '');
}

function removeProofCardByAsset(assetName) {
  const assetIndex = html.indexOf(assetName);
  if (assetIndex < 0) throw new Error(`Trust asset not found: ${assetName}`);

  const cardStart = html.lastIndexOf('<article class="proof-chat-card', assetIndex);
  const cardEndStart = html.indexOf('</article>', assetIndex);
  if (cardStart < 0 || cardEndStart < 0) {
    throw new Error(`Could not isolate trust card for ${assetName}.`);
  }

  const cardEnd = cardEndStart + '</article>'.length;
  html = html.slice(0, cardStart) + html.slice(cardEnd);
}

// Julian feedback: simplify the hero and remove explanatory copy above the video.
removeRequiredRegex(/<p class="hero-sub">[\s\S]*?<\/p>/, 'hero subline');
removeRequiredRegex(/<div class="video-context">[\s\S]*?<\/div>/, 'video intro copy');

// Remove the four staged brand/photo tiles from the Julian section while preserving the wrap closing tag.
const imageGridStart = html.indexOf('<div class="image-grid">');
if (imageGridStart < 0) throw new Error('Julian image grid was not found.');
const aboutSectionEnd = html.indexOf('</section>', imageGridStart);
if (aboutSectionEnd < 0) throw new Error('Could not find the end of the Julian about section.');
const aboutWrapClose = html.lastIndexOf('</div>', aboutSectionEnd);
if (aboutWrapClose < imageGridStart) throw new Error('Could not preserve the Julian section wrapper.');
html = html.slice(0, imageGridStart) + html.slice(aboutWrapClose);

// Keep only the three strongest lower proof screenshots.
removeProofCardByAsset('trust-kundenstimme-alexander.jpeg');
removeProofCardByAsset('trust-kundenstimme-julius.jpeg');
removeProofCardByAsset('trust-kundenstimme-kai.jpeg');

const feedbackCss = `
<style id="julian-feedback-2026-08-17">
/* ${marker} */
.hero-h1{
  max-width:840px;
  font-family:Manrope,sans-serif!important;
  font-weight:800!important;
  line-height:1.03!important;
  letter-spacing:-.045em!important;
}
.hero-h1 em,
.hero-h1 .hero-days{
  font-family:inherit!important;
  font-style:normal!important;
  font-weight:800!important;
  line-height:inherit!important;
  letter-spacing:inherit!important;
}
.hero .cta-row{margin-top:30px}
.hero-media{padding-top:48px}
@media(min-width:981px){
  .proof-chat-card.featured,
  .proof-chat-card.result{grid-column:span 4}
  .proof-chat-grid{align-items:stretch}
  .proof-chat-card{height:100%}
}
@media(max-width:760px){
  .hero-h1{
    font-size:clamp(2.35rem,10.7vw,3.75rem)!important;
    line-height:1.04!important;
    letter-spacing:-.04em!important;
  }
  .hero .cta-row{margin-top:24px}
}
</style>`;

if (!html.includes('</head>')) throw new Error('Could not find </head> for feedback styles.');
html = html.replace('</head>', `${feedbackCss}\n</head>`);

const required = [
  marker,
  'trust-kundenstimme-joerg-keyboard.jpeg',
  'trust-umsetzung-gold-trades.jpeg',
  'trust-ergebnis-sol-eth.jpeg'
];
for (const item of required) {
  if (!html.includes(item)) throw new Error(`Required feedback result is missing: ${item}`);
}

const forbidden = [
  '<p class="hero-sub">',
  '<div class="video-context">',
  '<div class="image-grid">',
  'trust-kundenstimme-alexander.jpeg',
  'trust-kundenstimme-julius.jpeg',
  'trust-kundenstimme-kai.jpeg'
];
for (const item of forbidden) {
  if (html.includes(item)) throw new Error(`Removed feedback element is still present: ${item}`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Julian feedback applied: clearer hero, cleaner video area, photo tiles removed, proof reduced to three cards.');
