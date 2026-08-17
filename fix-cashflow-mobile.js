const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html is missing before the mobile funnel fix.');
}

let html = fs.readFileSync(indexPath, 'utf8');

const mobileFixCss = `
<style id="cashflow-mobile-scroll-fix">
/* iOS / mobile viewport and scroll fix for the cashflow funnel */
@media (max-width: 760px) {
  .cf-funnel {
    display: block !important;
    width: 100%;
    height: 100dvh;
    min-height: 100svh;
    padding: 0 !important;
    overflow: hidden !important;
    overscroll-behavior: contain;
  }

  .cf-shell {
    width: 100% !important;
    height: 100dvh !important;
    min-height: 0 !important;
    max-height: none !important;
    grid-template-columns: minmax(0, 1fr) !important;
    overflow: hidden !important;
    border: 0 !important;
    border-radius: 0 !important;
  }

  .cf-main {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    padding: calc(16px + env(safe-area-inset-top)) 18px calc(12px + env(safe-area-inset-bottom)) !important;
  }

  .cf-head {
    flex: 0 0 auto;
    gap: 10px !important;
    min-height: 48px;
  }

  .cf-brand {
    max-width: 154px;
    overflow: hidden;
    font-size: .58rem !important;
    letter-spacing: .1em !important;
    text-overflow: ellipsis;
  }

  .cf-brand img {
    width: 27px !important;
    height: 27px !important;
  }

  .cf-progress-wrap {
    min-width: 0;
  }

  .cf-progress-meta {
    min-width: 54px !important;
    font-size: .58rem !important;
  }

  .cf-close {
    width: 42px !important;
    height: 42px !important;
    flex: 0 0 42px;
  }

  .cf-content {
    flex: 1 1 auto;
    min-height: 0 !important;
    align-items: stretch !important;
    overflow: hidden !important;
    padding: 15px 0 0 !important;
  }

  .cf-view {
    box-sizing: border-box;
    width: 100%;
    height: 100% !important;
    max-height: none !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    touch-action: pan-y;
    padding: 5px 3px calc(120px + env(safe-area-inset-bottom)) 0 !important;
    scroll-padding-bottom: calc(120px + env(safe-area-inset-bottom));
  }

  .cf-title {
    font-size: clamp(2.15rem, 11vw, 3.15rem) !important;
    line-height: 1.01 !important;
  }

  .cf-lede {
    margin: 14px 0 20px !important;
    font-size: .88rem !important;
    line-height: 1.62 !important;
  }

  .cf-contact-grid {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }

  .cf-field.cf-full {
    grid-column: auto !important;
  }

  .cf-input {
    min-height: 56px !important;
    font-size: 16px !important;
  }

  .cf-checkbox {
    font-size: .72rem !important;
    line-height: 1.5 !important;
  }

  .cf-submit {
    min-height: 58px !important;
    margin-bottom: 8px;
  }

  .cf-nav-row {
    padding-bottom: 4px;
  }

  .cf-side {
    display: none !important;
  }

  .cf-input:-webkit-autofill,
  .cf-input:-webkit-autofill:hover,
  .cf-input:-webkit-autofill:focus {
    -webkit-text-fill-color: #f2eee5 !important;
    -webkit-box-shadow: 0 0 0 1000px #111 inset !important;
    caret-color: #f2eee5;
    transition: background-color 9999s ease-out 0s;
  }
}

@supports not (height: 100dvh) {
  @media (max-width: 760px) {
    .cf-funnel,
    .cf-shell {
      height: 100vh !important;
    }
  }
}
</style>`;

if (html.includes('id="cashflow-mobile-scroll-fix"')) {
  html = html.replace(/<style id="cashflow-mobile-scroll-fix">[\s\S]*?<\/style>/, mobileFixCss);
} else if (html.includes('</head>')) {
  html = html.replace('</head>', `${mobileFixCss}\n</head>`);
} else {
  throw new Error('Could not inject the mobile cashflow funnel fix because </head> is missing.');
}

/* JULIAN_FEEDBACK_2026_08_17
   Applied inside an existing production build step so preview and production use the same pipeline. */
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

// Requested hero cleanup.
removeFirst(/<p\b[^>]*class="[^"]*\bhero-sub\b[^"]*"[^>]*>[\s\S]*?<\/p>/i, 'hero subline');
removeFirst(/<div\b[^>]*class="[^"]*\bvideo-context\b[^"]*"[^>]*>[\s\S]*?<\/div>/i, 'video intro copy');

// Remove the four staged image tiles beneath the Julian section while preserving its wrapper.
const imageGridStart = html.indexOf('<div class="image-grid">');
if (imageGridStart >= 0) {
  const aboutSectionEnd = html.indexOf('</section>', imageGridStart);
  const aboutWrapClose = aboutSectionEnd >= 0 ? html.lastIndexOf('</div>', aboutSectionEnd) : -1;
  if (aboutSectionEnd >= 0 && aboutWrapClose > imageGridStart) {
    html = html.slice(0, imageGridStart) + html.slice(aboutWrapClose);
  } else {
    console.warn('Julian feedback: image grid boundary could not be isolated; continuing safely.');
  }
}

// Keep only the lower three proof screenshots.
removeProofCardByAsset('trust-kundenstimme-alexander.jpeg');
removeProofCardByAsset('trust-kundenstimme-julius.jpeg');
removeProofCardByAsset('trust-kundenstimme-kai.jpeg');

const julianFeedbackCss = `
<style id="julian-feedback-2026-08-17">
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
  .proof-chat-grid{
    grid-template-columns:repeat(3,minmax(0,1fr));
    gap:18px;
    align-items:stretch;
  }
  .proof-chat-card,
  .proof-chat-card.featured,
  .proof-chat-card.result{
    grid-column:auto!important;
    height:100%;
  }
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

if (!html.includes('id="julian-feedback-2026-08-17"') && html.includes('</head>')) {
  html = html.replace('</head>', `${julianFeedbackCss}\n</head>`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Cashflow mobile fix and Julian visual feedback applied.');
