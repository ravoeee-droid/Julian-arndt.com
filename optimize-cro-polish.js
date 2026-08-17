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

// Canonical, Open Graph and structured-data URLs must describe the domain the visitor is actually on.
html = html.replaceAll('https://defi-intelligence.de/', 'https://julian-arndt.com/');
html = html.replaceAll('https://defi-intelligence.net/', 'https://julian-arndt.com/');

// Keep FAQ schema synchronized with the visible, CRO-optimized FAQ rather than publishing stale copy to search engines.
const faqSchemaIndex = html.indexOf('"@type":"FAQPage"');
if (faqSchemaIndex >= 0) {
  const schemaStart = html.lastIndexOf('<script type="application/ld+json">', faqSchemaIndex);
  const schemaEndStart = html.indexOf('</script>', faqSchemaIndex);
  if (schemaStart >= 0 && schemaEndStart > faqSchemaIndex) {
    const schemaEnd = schemaEndStart + '</script>'.length;
    const faqSchema = `<script type="application/ld+json">{
      "@context":"https://schema.org",
      "@type":"FAQPage",
      "mainEntity":[
        {"@type":"Question","name":"Wie läuft die kostenlose Analyse ab?","acceptedAnswer":{"@type":"Answer","text":"Du beantwortest zuerst fünf kurze Fragen. Danach kannst du einen Rückruf anfordern oder direkt einen Termin wählen. Im Gespräch werden Ziel, Erfahrung, Kapitalrahmen und dein bisheriger Prozess eingeordnet – ohne individuelle Kauf- oder Verkaufsempfehlungen."}},
        {"@type":"Question","name":"Wie viel Startkapital brauche ich?","acceptedAnswer":{"@type":"Answer","text":"Für den kostenlosen Check gibt es keine pauschale Mindestgröße. Ob eine weitere Zusammenarbeit sinnvoll ist, hängt von deiner Ausgangslage, deinen Zielen und deinem Risikorahmen ab."}},
        {"@type":"Question","name":"Wie viel Zeit brauche ich?","acceptedAnswer":{"@type":"Answer","text":"Für den Aufbau solltest du je nach Phase mit rund 20 Minuten pro Tag rechnen. Sobald dein Prozess steht, kann die laufende Routine deutlich kompakter werden."}}
      ]
    }</script>`;
    html = html.slice(0, schemaStart) + faqSchema + html.slice(schemaEnd);
  } else {
    throw new Error('CRO polish: FAQ schema boundaries not found');
  }
}

html = html.replace('</head>', `<meta name="cro-version" content="2026-08-17-v3-polished">\n<!-- ${MARKER} -->\n</head>`);

if (html.includes('<span class="stat-n">4,9 ★</span>')) throw new Error('CRO polish: stale review score remains');
if (!html.includes('60-Sekunden-Check')) throw new Error('CRO polish: hero value strip not updated');
if (!html.includes('Ausgangslage verstehen')) throw new Error('CRO polish: process label 1 missing');
if (!html.includes('Regeln &amp; Risikorahmen')) throw new Error('CRO polish: process label 2 missing');
if (html.includes('rel="canonical"') && html.includes('https://defi-intelligence.de/')) throw new Error('CRO polish: stale canonical remains');
if (!html.includes('"name":"Wie läuft die kostenlose Analyse ab?"')) throw new Error('CRO polish: FAQ schema not synchronized');

fs.writeFileSync(filePath, html, 'utf8');
console.log('CRO polish applied: stale proof removed, messaging synchronized and metadata aligned.');
