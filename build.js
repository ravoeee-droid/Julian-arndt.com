const fs = require('fs');
const path = require('path');

const SOURCE_BASE = 'https://raw.githubusercontent.com/ravoeee-droid/Julianarndt/main/';
const CALENDAR_URL = 'https://calendar.app.google/sDXSGovL4Bjy41RB8';
const CLARITY_ID = 'xjysyowuom';

const pages = ['index.html', 'datenschutz.html', 'impressum.html', 'agb.html'];
const optionalTextFiles = ['robots.txt', 'sitemap.xml', 'site.webmanifest'];

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (dir && dir !== '.') fs.mkdirSync(dir, { recursive: true });
}

async function fetchText(filePath, required = true) {
  const response = await fetch(SOURCE_BASE + filePath, {
    headers: { 'User-Agent': 'julian-arndt-production-build' }
  });
  if (!response.ok) {
    if (required) throw new Error(`Could not fetch ${filePath}: ${response.status}`);
    return null;
  }
  return response.text();
}

function removeClaus(html) {
  return html
    .replace(/Julian\s+Claus\s+Arndt/g, 'Julian Arndt')
    .replace(/Julian\s+Claus/g, 'Julian');
}

function replaceClarity(html) {
  return html
    .replace(/const\s+CLARITY_ID\s*=\s*['"][^'"]+['"]/g, `const CLARITY_ID = "${CLARITY_ID}"`)
    .replace(/clarity\.ms\/tag\/[^"'<>\s]+/g, `clarity.ms/tag/${CLARITY_ID}`)
    .replace(/"clarity",\s*"script",\s*"[a-zA-Z0-9]+"/g, `"clarity", "script", "${CLARITY_ID}"`);
}

function removeConstructionContent(html) {
  const forbidden = [
    'Platzhalter', 'Baustelle', 'Coming soon', 'In Vorbereitung',
    'wird hier eingebunden', 'wird noch ergänzt', 'Live-Widget',
    'Demo-Inhalt', 'Beispielinhalt', 'folgt in Kürze'
  ];

  for (const phrase of forbidden) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(`<[^>]+class="[^"]*(?:live-widget-box|placeholder|construction)[^"]*"[^>]*>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/[^>]+>`, 'gi'), '');
  }

  html = html
    .replace(/<div[^>]*class="[^"]*live-widget-box[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*class="[^"]*waitlist-box[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*class="[^"]*dg-footer[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

  return html;
}

function removeDuplicatePlayButton(html) {
  html = html
    .replace(/<button[^>]*class="[^"]*(?:play-btn|play-button|hero-play)[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '')
    .replace(/<div[^>]*class="[^"]*(?:play-btn|play-button|hero-play)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

  const css = `
/* Production cleanup: thumbnail already contains its own play symbol */
.video-frame .play-btn,
.video-frame .play-button,
.video-frame .hero-play,
.video-frame .video-play,
#vThumb > .play-btn,
#vThumb > .play-button { display:none !important; }
.video-frame img { transition:transform .35s ease, filter .35s ease; }
.video-frame:hover img { transform:scale(1.025); filter:brightness(1.06); }
`;

  if (!html.includes('Production cleanup: thumbnail already contains')) {
    html = html.replace('</style>', `${css}\n</style>`);
  }
  return html;
}

function calendarCss() {
  return `
/* DIRECT CALENDAR EMBED */
.calendar-section{background:linear-gradient(180deg,#080808,#050505);border-top:1px solid rgba(198,162,42,.13);border-bottom:1px solid rgba(198,162,42,.13)}
.calendar-intro{max-width:760px;margin:0 auto 38px;text-align:center;color:var(--muted);line-height:1.85}
.calendar-shell{max-width:1040px;margin:0 auto;background:linear-gradient(145deg,rgba(18,18,18,.98),rgba(5,5,5,.98));border:1px solid rgba(198,162,42,.28);border-radius:34px;padding:22px;box-shadow:0 38px 130px rgba(0,0,0,.5)}
.calendar-frame-wrap{border-radius:24px;overflow:hidden;border:1px solid rgba(242,238,229,.08);background:#0b0b0b;min-height:760px}
.calendar-iframe{width:100%;height:760px;border:0;background:#0b0b0b;display:block}
.calendar-fallback{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-top:18px;padding:18px 20px;border:1px solid rgba(242,238,229,.10);border-radius:22px;background:rgba(255,255,255,.035);color:var(--muted);font-size:.9rem}
@media(max-width:760px){.calendar-shell{padding:14px;border-radius:24px}.calendar-frame-wrap{min-height:680px}.calendar-iframe{height:680px}.calendar-fallback{display:block}.calendar-fallback a{margin-top:14px;width:100%}}
`;
}

function calendarSection() {
  return `
<section class="section calendar-section" id="termin">
  <div class="wrap">
    <div class="center sr">
      <span class="s-tag">Kostenlose Analyse</span>
      <h2 class="s-h2">Wähle deinen passenden <em>Termin.</em></h2>
      <div class="gold-rule c"></div>
      <p class="calendar-intro">Wähle direkt auf dieser Seite einen freien Termin für deine persönliche Analyse mit Julian Arndt.</p>
    </div>
    <div class="calendar-shell sr d1">
      <div class="calendar-frame-wrap">
        <iframe class="calendar-iframe calendar-track" src="${CALENDAR_URL}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" title="Kostenlose Analyse buchen"></iframe>
      </div>
      <div class="calendar-fallback">
        <span>Der Kalender wird nicht angezeigt?</span>
        <a class="btn-main calendar-track" href="${CALENDAR_URL}" target="_blank" rel="noopener">Kalender öffnen</a>
      </div>
    </div>
  </div>
</section>`;
}

function transformIndex(html) {
  html = removeClaus(replaceClarity(html));
  html = removeConstructionContent(html);
  html = removeDuplicatePlayButton(html);

  html = html
    .replace(/href="https:\/\/calendar\.app\.google\/sDXSGovL4Bjy41RB8"\s+target="_blank"/g, 'href="#termin"')
    .replace(/href="https:\/\/calendar\.app\.google\/sDXSGovL4Bjy41RB8"/g, 'href="#termin"');

  if (!html.includes('/* DIRECT CALENDAR EMBED */')) {
    html = html.replace('</style>', `${calendarCss()}\n</style>`);
  }
  if (!html.includes('id="termin"')) {
    const marker = '<section class="section results" id="results">';
    html = html.includes(marker)
      ? html.replace(marker, `${calendarSection()}\n${marker}`)
      : html.replace('</body>', `${calendarSection()}\n</body>`);
  }

  html = html
    .replace(/<a class="btn-main calendar-track" href="#termin"[^>]*>Kalender öffnen<\/a>/g, `<a class="btn-main calendar-track" href="${CALENDAR_URL}" target="_blank" rel="noopener">Kalender öffnen</a>`)
    .replace(/assets\/hero-thumbnail\.(?:svg|png)/g, 'assets/hero-thumbnail.webp');

  return html;
}

(async () => {
  for (const page of pages) {
    const remote = await fetchText(page, true);
    const transformed = page === 'index.html'
      ? transformIndex(remote)
      : removeClaus(replaceClarity(remote));
    fs.writeFileSync(page, transformed, 'utf8');
    console.log('wrote', page);
  }

  for (const file of optionalTextFiles) {
    const remote = await fetchText(file, false);
    if (remote !== null) fs.writeFileSync(file, remote, 'utf8');
  }

  // IMPORTANT: Real production images live in this repository.
  // Never overwrite local assets with old placeholders from another repository.
  if (!fs.existsSync('assets/hero-thumbnail.webp')) {
    throw new Error('Missing production asset: assets/hero-thumbnail.webp');
  }

  console.log('Production build complete: local assets preserved, placeholders removed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
