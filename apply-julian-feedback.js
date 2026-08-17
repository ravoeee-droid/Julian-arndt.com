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

function removeFirst(regex, label) {
  if (!regex.test(html)) {
    console.warn(`Julian feedback: ${label} was not present; continuing safely.`);
    return false;
  }
  html = html.replace(regex, '');
  return true;
}

function removeProofCardByAsset(assetName) {
  const assetIndex = html.indexOf(assetName);
  if (assetIndex < 0) {
    console.warn(`Julian feedback: trust card already absent: ${assetName}`);
    return false;
  }

  const cardStart = html.lastIndexOf('<article class="proof-chat-card', assetIndex);
  const cardEndStart = html.indexOf('</article>', assetIndex);
  if (cardStart < 0 || cardEndStart < 0) {
    console.warn(`Julian feedback: could not isolate trust card for ${assetName}; continuing safely.`);
    return false;
  }

  const cardEnd = cardEndStart + '</article>'.length;
  html = html.slice(0, cardStart) + html.slice(cardEnd);
  return true;
}

// Simplify the hero: remove the explanatory paragraph and the copy above the video.
removeFirst(/<p\b[^>]*class="[^"]*\bhero-sub\b[^"]*"[^>]*>[\s\S]*?<\/p>/i, 'hero subline');
removeFirst(/<div\b[^>]*class="[^"]*\bvideo-context\b[^"]*"[^>]*>[\s\S]*?<\/div>/i, 'video intro copy');

// Remove the four staged brand/photo tiles while preserving the about-section wrapper.
const imageGridStart = html.indexOf('<div class="image-grid">');
if (imageGridStart >= 0) {
  const aboutSectionEnd = html.indexOf('</section>', imageGridStart);
  const aboutWrapClose = aboutSectionEnd >= 0 ? html.lastIndexOf('</div>', aboutSectionEnd) : -1;
  if (aboutSectionEnd >= 0 && aboutWrapClose > imageGridStart) {
    html = html.slice(0, imageGridStart) + html.slice(aboutWrapClose);
  } else {
    console.warn('Julian feedback: image grid boundary could not be isolated; continuing safely.');
  }
} else {
  console.warn('Julian feedback: Julian image grid was already absent.');
}

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

if (html.includes('</head>')) {
  html = html.replace('</head>', `${feedbackCss}\n</head>`);
} else {
  console.warn('Julian feedback: </head> was not found; feedback styles were not injected.');
}

const expectedKept = [
  'trust-kundenstimme-joerg-keyboard.jpeg',
  'trust-umsetzung-gold-trades.jpeg',
  'trust-ergebnis-sol-eth.jpeg'
];
for (const item of expectedKept) {
  if (!html.includes(item)) console.warn(`Julian feedback: expected retained proof is missing: ${item}`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Julian feedback applied: clearer hero, cleaner video area, photo tiles removed, proof reduced to three cards.');
