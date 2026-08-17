const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'dist', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
const MARKER = 'JULIAN_CRO_POLISH_2026_08_17';
if (html.includes(MARKER)) process.exit(0);

// Remove the legacy stats row. It duplicated proof and still contained an outdated review score.
const statsStart = html.indexOf('<div class="stats">');
if (statsStart >= 0) {
  const nextSection = html.indexOf('<section', statsStart);
  if (nextSection > statsStart) html = html.slice(0, statsStart) + html.slice(nextSection);
  else throw new Error('CRO polish: could not isolate legacy stats row');
}

// Keep the three hero value cues consistent with the lower-friction Cashflow-Check positioning.
html = html.replace(
  /<div class="value-strip"><div class="value-chip">[\s\S]*?<\/div><div class="value-chip">[\s\S]*?<\/div><div class="value-chip">[\s\S]*?<\/div><\/div>/i,
  '<div class="value-strip"><div class="value-chip">60-Sekunden-Check</div><div class="value-chip">Persönliche Einordnung</div><div class="value-chip">Kein Kaufzwang</div></div>'
);

// Make the mechanism labels match their concrete explanations.
html = html.replace('<div class="prin-title">Marktverständnis</div>', '<div class="prin-title">Ausgangslage verstehen</div>');
html = html.replace('<div class="prin-title">Risikomanagement</div>', '<div class="prin-title">Regeln &amp; Risikorahmen</div>');

// Runtime-generated funnel copy can be embedded in JS strings; normalize both plain and escaped variants.
html = html.replaceAll('Dein Cashflow-Profil wird erstellt.', 'Deine Einordnung wird vorbereitet.');
html = html.replaceAll('Dein Cashflow-Profil wird erstellt', 'Deine Einordnung wird vorbereitet');

// Keep technical cookie copy aligned with the public funnel name without touching tracking event identifiers.
html = html.replace('nach dem Absenden des Cashflow-Plans', 'nach dem Absenden des Cashflow-Checks');

html = html.replace('</head>', `<meta name="cro-version" content="2026-08-17-v3-polished">\n<!-- ${MARKER} -->\n</head>`);

if (html.includes('<span class="stat-n">4,9 ★</span>')) throw new Error('CRO polish: stale review score remains');
if (!html.includes('60-Sekunden-Check')) throw new Error('CRO polish: hero value strip not updated');
if (!html.includes('Ausgangslage verstehen')) throw new Error('CRO polish: process label 1 missing');
if (!html.includes('Regeln &amp; Risikorahmen')) throw new Error('CRO polish: process label 2 missing');

fs.writeFileSync(filePath, html, 'utf8');
console.log('CRO polish applied: stale proof removed and key messaging synchronized.');
