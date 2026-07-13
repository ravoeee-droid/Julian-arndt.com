const fs = require('fs');
const path = require('path');

const SOURCE_BASE = 'https://raw.githubusercontent.com/ravoeee-droid/Julianarndt/main/';
const CALENDAR_URL = 'https://calendar.app.google/sDXSGovL4Bjy41RB8';
const CLARITY_ID = 'xjysyowuom';

const files = [
  'index.html',
  'datenschutz.html',
  'impressum.html',
  'agb.html'
];

const optionalFiles = [
  'robots.txt',
  'sitemap.xml',
  'site.webmanifest',
  'LAUNCH_PERFECTION_NOTES.md'
];

const assets = [
  'assets/defi-premium-signet.webp',
  'assets/defi-premium-full-logo.webp',
  'assets/hero-thumbnail.webp',
  'assets/julian-portrait.webp',
  'assets/julian-meeting.webp',
  'assets/julian-analysis.webp',
  'assets/julian-handshake.webp',
  'assets/julian-brand.webp',
  'assets/og-image.jpg'
];

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (dir && dir !== '.') fs.mkdirSync(dir, { recursive: true });
}

async function fetchText(filePath, required = true) {
  const url = SOURCE_BASE + filePath;
  const response = await fetch(url, { headers: { 'User-Agent': 'julian-arndt-build' } });
  if (!response.ok) {
    if (required) throw new Error(`Could not fetch ${filePath}: ${response.status}`);
    return null;
  }
  return await response.text();
}

function removeClaus(html) {
  return html
    .replace(/Julian\s+Claus\s+Arndt/g, 'Julian Arndt')
    .replace(/Julian\s+Claus/g, 'Julian')
    .replace(/Über Julian Claus Arndt/g, 'Über Julian Arndt');
}

function replaceClarity(html) {
  html = html.replace(/const\s+CLARITY_ID\s*=\s*['"][^'"]+['"]/g, `const CLARITY_ID = "${CLARITY_ID}"`);
  html = html.replace(/clarity\.ms\/tag\/[^"'<>\s]+/g, `clarity.ms/tag/${CLARITY_ID}`);
  html = html.replace(/"clarity",\s*"script",\s*"[a-zA-Z0-9]+"/g, `"clarity", "script", "${CLARITY_ID}"`);
  return html;
}

function calendarCss() {
  return `
/* DIRECT CALENDAR EMBED */
.calendar-section{background:linear-gradient(180deg,#080808,#050505);border-top:1px solid rgba(198,162,42,.13);border-bottom:1px solid rgba(198,162,42,.13)}
.calendar-intro{max-width:760px;margin:0 auto 38px;text-align:center;color:var(--muted);line-height:1.85}
.calendar-shell{position:relative;max-width:1040px;margin:0 auto;background:linear-gradient(145deg,rgba(18,18,18,.98),rgba(5,5,5,.98));border:1px solid rgba(198,162,42,.28);border-radius:34px;padding:22px;box-shadow:0 38px 130px rgba(0,0,0,.5),0 0 90px rgba(198,162,42,.08);overflow:hidden}
.calendar-shell:before{content:"";position:absolute;inset:-1px;background:radial-gradient(circle at 75% 10%,rgba(198,162,42,.18),transparent 34%);pointer-events:none}
.calendar-top{position:relative;z-index:2;display:flex;justify-content:space-between;gap:18px;align-items:center;padding:10px 8px 22px;border-bottom:1px solid rgba(198,162,42,.14);margin-bottom:18px}
.calendar-top strong{font-size:1.04rem;color:var(--cream)}
.calendar-top span{display:block;color:var(--soft);font-size:.82rem;margin-top:3px}
.calendar-badge{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(198,162,42,.28);background:rgba(198,162,42,.08);border-radius:999px;padding:10px 14px;color:var(--gold);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;font-weight:900;white-space:nowrap}
.calendar-frame-wrap{position:relative;z-index:2;border-radius:24px;overflow:hidden;border:1px solid rgba(242,238,229,.08);background:#0b0b0b;min-height:760px}
.calendar-iframe{width:100%;height:760px;border:0;background:#0b0b0b;display:block}
.calendar-fallback{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:18px;margin-top:18px;padding:18px 20px;border:1px solid rgba(242,238,229,.10);border-radius:22px;background:rgba(255,255,255,.035);color:var(--muted);font-size:.9rem}
.calendar-fallback a{flex:0 0 auto}
@media(max-width:760px){.calendar-shell{padding:14px;border-radius:24px}.calendar-top{display:block}.calendar-badge{margin-top:14px}.calendar-frame-wrap{min-height:680px}.calendar-iframe{height:680px}.calendar-fallback{display:block}.calendar-fallback a{margin-top:14px;width:100%}}
`;
}

function calendarSection() {
  return `
<section class="section calendar-section" id="termin">
  <div class="wrap">
    <div class="center sr">
      <span class="s-tag">Direkt Termin wählen</span>
      <h2 class="s-h2">Wähle jetzt deinen <em>Analyse-Termin.</em></h2>
      <div class="gold-rule c"></div>
      <p class="calendar-intro">Keine Weiterleitung, kein Suchen, kein unnötiger Zwischenschritt. Such dir direkt hier auf der Landingpage einen passenden Termin für deine kostenlose Analyse aus.</p>
    </div>

    <div class="calendar-shell sr d1">
      <div class="calendar-top">
        <div>
          <strong>Kostenlose Analyse mit Julian Arndt</strong>
          <span>Wähle einen freien Slot. Die Bestätigung kommt im Anschluss direkt per Kalender/E-Mail.</span>
        </div>
        <div class="calendar-badge">Nur 12 Plätze · kostenlos</div>
      </div>

      <div class="calendar-frame-wrap">
        <iframe class="calendar-iframe calendar-track" src="${CALENDAR_URL}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" title="Kostenlose Analyse Termin buchen"></iframe>
      </div>

      <div class="calendar-fallback">
        <span>Falls der Kalender in deinem Browser nicht direkt lädt, öffne ihn hier in einem neuen Tab.</span>
        <a class="btn-main calendar-track" href="${CALENDAR_URL}" target="_blank" rel="noopener">Kalender öffnen</a>
      </div>
    </div>
  </div>
</section>
`;
}

function injectCalendar(html) {
  html = removeClaus(replaceClarity(html));
  html = html.replace(/href="https:\/\/calendar\.app\.google\/sDXSGovL4Bjy41RB8"\s+target="_blank"/g, 'href="#termin"');
  html = html.replace(/href="https:\/\/calendar\.app\.google\/sDXSGovL4Bjy41RB8"/g, 'href="#termin"');

  if (!html.includes('/* DIRECT CALENDAR EMBED */')) {
    html = html.replace('</style>', `${calendarCss()}\n</style>`);
  }
  if (!html.includes('id="termin"')) {
    const marker = '<section class="section results" id="results">';
    html = html.includes(marker)
      ? html.replace(marker, `${calendarSection()}\n${marker}`)
      : html.replace('</main>', `${calendarSection()}\n</main>`);
  }

  // Keep fallback external button external.
  html = html.replace(/<a class="btn-main calendar-track" href="#termin"[^>]*>Kalender öffnen<\/a>/g, `<a class="btn-main calendar-track" href="${CALENDAR_URL}" target="_blank" rel="noopener">Kalender öffnen</a>`);

  return html;
}

async function writeFetchedFile(filePath, required = true, transform = (v) => v) {
  const content = await fetchText(filePath, required);
  if (content === null) return;
  ensureDir(filePath);
  fs.writeFileSync(filePath, transform(content), 'utf8');
  console.log('wrote', filePath);
}

(async () => {
  for (const file of files) {
    await writeFetchedFile(file, true, file === 'index.html' ? injectCalendar : (content) => removeClaus(replaceClarity(content)));
  }
  for (const file of optionalFiles) {
    await writeFetchedFile(file, false, (content) => removeClaus(replaceClarity(content)));
  }
  for (const asset of assets) {
    await writeFetchedFile(asset, false, (content) => content);
  }

  if (!fs.existsSync('site.webmanifest')) {
    fs.writeFileSync('site.webmanifest', JSON.stringify({
      name: 'DeFi Intelligence',
      short_name: 'DeFi',
      icons: [{ src: 'assets/defi-premium-signet.webp', sizes: 'any', type: 'image/svg+xml' }],
      theme_color: '#050505',
      background_color: '#050505',
      display: 'standalone'
    }, null, 2));
  }

  if (!fs.existsSync('robots.txt')) fs.writeFileSync('robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://www.julian-arndt.com/sitemap.xml\n');
  if (!fs.existsSync('sitemap.xml')) fs.writeFileSync('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://www.julian-arndt.com/</loc></url></urlset>\n');

  console.log('Julian Arndt website build complete with embedded calendar.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
