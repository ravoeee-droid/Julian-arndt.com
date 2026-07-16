const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const payloadDir = path.join(__dirname, 'static-payload');
const payloadFiles = fs.readdirSync(payloadDir)
  .filter((name) => /^payload-\d{3}\.txt$/.test(name))
  .sort();

if (payloadFiles.length !== 8) {
  throw new Error(`Expected 8 payload chunks, found ${payloadFiles.length}.`);
}

const encodedPayload = payloadFiles
  .map((name) => fs.readFileSync(path.join(payloadDir, name), 'utf8').trim())
  .join('');

const sourceBuffer = zlib.brotliDecompressSync(Buffer.from(encodedPayload, 'base64'));
const sourceSha256 = crypto.createHash('sha256').update(sourceBuffer).digest('hex');
const expectedSourceSha256 = '33eff936c7b37ce8b332933b986ffec9564d46b70195a42d17ba47769a328f10';

if (sourceSha256 !== expectedSourceSha256) {
  throw new Error(`Unexpected source website payload: ${sourceSha256}`);
}

let html = sourceBuffer.toString('utf8');

function replaceOnce(searchValue, replacement, label) {
  if (!html.includes(searchValue)) {
    throw new Error(`Could not apply final correction: ${label}`);
  }
  html = html.replace(searchValue, replacement);
}

function replaceRegexOnce(regex, replacement, label) {
  const matches = html.match(regex);
  if (!matches || matches.length !== 1) {
    throw new Error(`Could not apply final correction exactly once: ${label}`);
  }
  html = html.replace(regex, replacement);
}

const oldHeroNote = 'Finde heraus, welches Ziel für dich realistisch ist und wie du die Grundlage dafür Schritt für Schritt aufbauen kannst.';
const newHeroNote = 'In der kostenlosen Analyse klären wir dein Ziel und prüfen, welcher realistische Zeitrahmen für dich möglich ist.';
replaceOnce(oldHeroNote, newHeroNote, 'Hero analysis note');

const heroSlots = `<div class="slots-row"><div class="slots-subtle">${newHeroNote}</div></div>`;
replaceOnce(
  heroSlots,
  heroSlots + '<div class="value-strip"><div class="value-chip">Private Analyse</div><div class="value-chip">Persönlicher Ansprechpartner</div><div class="value-chip">Expertenteam im Hintergrund</div></div>',
  'Hero benefits'
);

replaceRegexOnce(/<div class="glass-card card-risk">.*?<\/div>/s, '', 'Hidden risk card');
replaceRegexOnce(/<div class="glass-card card-routine">.*?<\/div>/s, '', 'Hidden routine card');

const quickFit = '<span id="angebot" class="anchor-alias" aria-hidden="true"></span><section class="quickfit" id="fit"><div class="quick-grid"><div class="sr"><span class="s-tag">Für wen ist DeFi-Intelligence?</span><h2 class="s-h2">Für Menschen, die sich mit viel oder wenig Startkapital einen <em>zusätzlichen Cashflow aufbauen wollen.</em></h2><p class="section-lede" style="margin-top:22px">Du willst dir einen zusätzlichen Cashflow aufbauen – unabhängig davon, ob du gerade neu startest oder bereits Kapital mitbringst.</p><div style="margin-top:28px"><a class="btn-main calendar-track" href="#termin" rel="noopener">Kostenlose Analyse starten</a></div></div><div class="quick-card sr d1"><div class="quick-list"><div class="quick-item"><span>✓</span><strong>Mit viel oder wenig Startkapital</strong>Du möchtest dir unabhängig von deiner aktuellen Ausgangslage einen zusätzlichen Cashflow aufbauen.</div><div class="quick-item"><span>✓</span><strong>Konstantes Einkommen oder Neustart</strong>Du hast ein konstantes Einkommen oder stehst gerade am Anfang und möchtest strukturiert starten.</div><div class="quick-item"><span>✓</span><strong>Klare Strategie statt Bauchgefühl</strong>Du willst Entscheidungen nach nachvollziehbaren Regeln treffen und nicht nach spontanen Tipps.</div><div class="quick-item"><span>✓</span><strong>Realistische tägliche Routine</strong>Du bist bereit, rund 20 Minuten pro Tag in den Aufbau deines Systems zu investieren.</div></div></div></div></section>';
replaceRegexOnce(
  /<span id="angebot" class="anchor-alias" aria-hidden="true"><\/span><section class="quickfit" id="fit">.*?<\/section>/s,
  quickFit,
  'Target audience section'
);

const aboutPrefix = '<div class="about-copy sr d1"><span class="s-tag">Über Julian Arndt</span><h2 class="s-h2">Dein Ansprechpartner: <em>Julian Arndt</em></h2><div class="gold-rule"></div>';
const aboutCta = '<a class="btn-main calendar-track" href="#termin" rel="noopener">Kostenlose Analyse mit Julian buchen</a>';
replaceRegexOnce(
  /<div class="about-copy sr d1"><span class="s-tag">Über Julian Arndt<\/span><h2 class="s-h2">Dein Ansprechpartner: <em>Julian Arndt<\/em><\/h2><div class="gold-rule"><\/div>.*?<a class="btn-main calendar-track" href="#termin" rel="noopener">Kostenlose Analyse mit Julian buchen<\/a>/s,
  aboutPrefix + '<p>Mit DeFi Intelligence verfolgt Julian das Ziel, Menschen dabei zu unterstützen, sich unabhängig von ihrem Job oder Unternehmen ein zusätzliches Einkommen aufzubauen – effizient, strukturiert und langfristig.</p>' + aboutCta,
  'Julian copy'
);

replaceOnce(
  'Du kannst bereits mit kleinen Beträgen starten. Entscheidend ist nicht die Höhe deines Startkapitals, sondern dass du früh beginnst, strukturiert zu investieren und dir ein System aufzubauen.',
  'Das Angebot richtet sich an Menschen, die ein konstantes Einkommen haben, aber auch an Menschen, die gerade neu starten.',
  'FAQ start capital answer'
);

replaceRegexOnce(
  /<section class="section calc" id="calc">.*?<\/section>\s*(?=<section class="section objections")/s,
  '',
  'Potential calculator section'
);

replaceRegexOnce(
  /function fmt\(n\)\{return Math\.round\(n\)\.toLocaleString\('de-DE'\)\+' €'\}function updateCalc\(\)\{.*?\}if\(document\.getElementById\('capital'\)\)updateCalc\(\);/s,
  '',
  'Potential calculator JavaScript'
);

replaceOnce('kostenlosen Analyse-Termin.', 'kostenlosen Analysetermin.', 'Analysetermin heading');
replaceOnce('Kostenlosen Analyse-Termin buchen', 'Kostenlosen Analysetermin buchen', 'Analysetermin iframe title');

replaceOnce(
  '<li><strong>Julian Arndt:</strong> Gründer, persönlicher Ansprechpartner, Prozessführung</li>\n<li><strong>Franz:</strong> DeFi-Erfahrung, Marktverständnis, Struktur-Unterstützung</li>\n<li><strong>Expertenteam:</strong> Risiko, Prozesslogik, Umsetzung und Nachbereitung</li>',
  '<li><strong>Julian Arndt:</strong> Gründer, persönlicher Ansprechpartner, Prozessführung</li>\n<li><strong>Franz von Bresinski:</strong> Technische Marktanalysen, Portfolio Management, Cashflow-Experte</li>\n<li><strong>Ronny:</strong> Fachmann für Decentralized Finance und Blockchaintechnologie</li>\n<li><strong>Expertenteam:</strong> Kooperation mit zertifizierten Kryptosteuerberatern und Vermögensverwaltern</li>',
  'Expert team roles'
);

replaceOnce(
  '.hero-h1 .hero-days{font-size:1.18em;line-height:.84;display:inline-block}',
  '.hero-h1 .hero-days{font-size:1.22em;line-height:inherit;display:inline;vertical-align:baseline}',
  '90-day headline alignment'
);

const finalBuffer = Buffer.from(html, 'utf8');
const finalSha256 = crypto.createHash('sha256').update(finalBuffer).digest('hex');
const expectedFinalSha256 = '2499dcf6dc1e519cd90ba0f547c15e4b47f45334bef75a0a71619e31cffd5c6f';

if (finalSha256 !== expectedFinalSha256) {
  throw new Error(`Final website payload mismatch: ${finalSha256}`);
}

const requiredMarkers = [
  'id="video-bootstrap"',
  'zoAF6ZmVsOM',
  'data-video-id="-IjwKAos27M"',
  'data-video-id="_p1g88NG4Ho"',
  'data-video-id="diTTCbliMpI"',
  '90 Tagen',
  newHeroNote,
  'Private Analyse',
  'Persönlicher Ansprechpartner',
  'Expertenteam im Hintergrund',
  'viel oder wenig Startkapital',
  'Mit DeFi Intelligence verfolgt Julian das Ziel',
  'Franz von Bresinski',
  'Ronny:',
  'kostenlosen Analysetermin',
  'Microsoft Clarity',
  '1599406528431495',
  'calendar.app.google/sDXSGovL4Bjy41RB8'
];

const forbiddenMarkers = [
  'Potenzialrechner',
  'Wie stark Struktur, Zeit und Kapital zusammenspielen können.',
  'Kein lauter Chat. Kein Rätselraten.',
  'Von unsicheren Entscheidungen',
  'Warum selbst Topverdiener',
  'Ein wiederholbarer Prozess',
  'Mehr Klarheit über Kapital',
  'Was passiert in der Investmentprozess-Analyse',
  'Lass deine aktuelle Investmentstruktur einordnen',
  'glass-card card-risk',
  'glass-card card-routine',
  'kostenlosen Analyse-Termin.'
];

for (const marker of requiredMarkers) {
  if (!html.includes(marker)) {
    throw new Error(`Required website marker is missing: ${marker}`);
  }
}

for (const marker of forbiddenMarkers) {
  if (html.includes(marker)) {
    throw new Error(`Removed website marker is still present: ${marker}`);
  }
}

fs.writeFileSync(path.join(__dirname, 'index.html'), finalBuffer);
console.log(`Final static website ready: ${finalBuffer.length} bytes, SHA-256 ${finalSha256}`);
