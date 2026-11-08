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

// Typography-only correction on the previously live V3 site.
// Do not change any video markup or video dimensions.
const originalHeroDash = 'einen klaren Investmentprozess auf – als Grundlage für zusätzlichen Cashflow.';
const correctedHeroDash = 'einen klaren Investmentprozess auf. So legst du die Grundlage für zusätzlichen Cashflow.';
if (!html.includes(originalHeroDash)) throw new Error('Headline fix: expected hero text is absent');
html = html.replace(originalHeroDash, correctedHeroDash);

const compactHeadlineStyle = `<style id="julian-headlines-2026-10-20">
/* JULIAN_HEADLINE_SCALE_2026_10_20 */
.hero-h1 {
  font-size: clamp(2.15rem, 3vw, 2.8rem) !important;
  line-height: 1.14 !important;
  letter-spacing: -.03em !important;
  hyphens: none !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
}
.s-h2, .cro-final-cta h2 {
  font-size: clamp(1.7rem, 2.4vw, 2.3rem) !important;
  line-height: 1.18 !important;
  hyphens: none !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
}
@media (max-width: 760px) {
  .hero-h1 {font-size: clamp(1.8rem, 7.4vw, 2.2rem) !important;line-height:1.15 !important;}
  .s-h2, .cro-final-cta h2 {font-size: clamp(1.55rem, 6.3vw, 1.85rem) !important;line-height:1.21 !important;}
}
</style>`;
html = html.replace('</head>', `${compactHeadlineStyle}\n</head>`);

if (html.includes('<span class="stat-n">4,9 ★</span>')) throw new Error('CRO polish: stale review score remains');
if (!html.includes('60-Sekunden-Check')) throw new Error('CRO polish: hero value strip not updated');
if (!html.includes('Ausgangslage verstehen')) throw new Error('CRO polish: process label 1 missing');
if (!html.includes('Regeln &amp; Risikorahmen')) throw new Error('CRO polish: process label 2 missing');
if (html.includes('rel="canonical"') && html.includes('https://defi-intelligence.de/')) throw new Error('CRO polish: stale canonical remains');
if (!html.includes('"name":"Wie läuft die kostenlose Analyse ab?"')) throw new Error('CRO polish: FAQ schema not synchronized');


/* OFFICIAL PROVENEXPERT TRUST INTEGRATION — 2026-11-08.
   Use the provider's real rating artwork and live widget; never hardcode a score. */
const provenExpertMarker = 'id="julian-provenexpert-inline"';
if (html.includes(provenExpertMarker) || html.includes('id="proSeal"')) {
  throw new Error('ProvenExpert injection is already present in the build source.');
}

const provenExpertProfile = 'https://www.provenexpert.com/julian-arndt/?utm_source=Widget&amp;utm_medium=Widget&amp;utm_campaign=Widget';
const provenExpertImage = 'https://images.provenexpert.com/9e/d1/d3d60ac664d78382a232b6a62f2f/widget_portrait_180_de_0.png';
const provenExpertCard = [
  '<div class="ja-pe-card" id="julian-provenexpert-inline" aria-label="Julian Arndt auf ProvenExpert">',
  '  <a class="ja-pe-badge-link" href="' + provenExpertProfile + '" title="Kundenbewertungen und Erfahrungen zu Julian Arndt auf ProvenExpert" target="_blank" rel="noopener noreferrer">',
  '    <img src="' + provenExpertImage + '" alt="Offizielles ProvenExpert-Bewertungssiegel für Julian Arndt" width="180" height="216" loading="lazy" decoding="async">',
  '  </a>',
  '  <div class="ja-pe-content">',
  '    <span class="ja-pe-eyebrow">Unabhängige Kundenbewertungen</span>',
  '    <strong>Erfahrungen statt Versprechen.</strong>',
  '    <p>Sieh dir die Bewertungen und Rückmeldungen zu Julian Arndt direkt auf ProvenExpert an.</p>',
  '    <a class="ja-pe-reviews-link" href="' + provenExpertProfile + '" target="_blank" rel="noopener noreferrer">Bewertungen ansehen <span aria-hidden="true">↗</span></a>',
  '  </div>',
  '</div>'
].join('\n');

const aboutStart = html.indexOf('<section class="section about" id="about">');
const aboutEnd = aboutStart < 0 ? -1 : html.indexOf('</section>', aboutStart);
if (aboutStart < 0 || aboutEnd < 0) throw new Error('ProvenExpert: about section not found.');
const aboutHtml = html.slice(aboutStart, aboutEnd + '</section>'.length);
const aboutCtaPattern = /(<a\b[^>]*class="[^"]*\bcashflow-funnel-trigger\b[^"]*"[^>]*>[^<]*<\/a>)/i;
if (!aboutCtaPattern.test(aboutHtml)) throw new Error('ProvenExpert: about CTA not found.');
const aboutUpdated = aboutHtml.replace(aboutCtaPattern, '$1\n' + provenExpertCard);
html = html.slice(0, aboutStart) + aboutUpdated + html.slice(aboutEnd + '</section>'.length);

const provenExpertCss = [
  '<style id="julian-provenexpert-styles">',
  '/* Premium trust card, coordinated with the black-and-gold finance visual language. */',
  '.ja-pe-card{display:flex;align-items:center;gap:21px;width:100%;max-width:650px;margin-top:27px;padding:18px 21px;border:1px solid rgba(198,162,42,.24);border-radius:23px;background:linear-gradient(137deg,rgba(198,162,42,.085),rgba(255,255,255,.025) 56%,rgba(0,0,0,.16));box-shadow:0 20px 62px rgba(0,0,0,.21);}',
  '.ja-pe-badge-link{display:block;flex:0 0 135px;max-width:135px;text-decoration:none;transition:transform .25s ease,filter .25s ease;}',
  '.ja-pe-badge-link:hover{transform:translateY(-3px);filter:brightness(1.06);}',
  '.ja-pe-badge-link img{display:block;width:100%;height:auto;object-fit:contain;border:0;}',
  '.ja-pe-content{min-width:0;display:flex;align-items:flex-start;flex-direction:column;gap:8px;}',
  '.ja-pe-eyebrow{font-size:.63rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold,#c6a22a);font-weight:800;}',
  '.ja-pe-content strong{color:var(--cream,#f2eee5);font-size:1rem;line-height:1.35;font-weight:800;}',
  '.ja-pe-content p{margin:0!important;color:var(--muted,#a7a5a0);font-size:.8rem;line-height:1.6;}',
  '.ja-pe-reviews-link{display:inline-flex;align-items:center;gap:8px;margin-top:2px;font-size:.78rem;font-weight:800;color:var(--gold2,#e2be60);text-decoration:none;border-bottom:1px solid rgba(198,162,42,.35);padding-bottom:3px;transition:color .2s ease,border-color .2s ease;}',
  '.ja-pe-reviews-link:hover{color:#f4d581;border-color:currentColor;}',
  '@media(max-width:760px){.ja-pe-card{gap:15px;margin-top:22px;padding:15px;border-radius:19px;}.ja-pe-badge-link{flex-basis:106px;max-width:106px;}.ja-pe-content strong{font-size:.9rem;}.ja-pe-eyebrow{font-size:.57rem;letter-spacing:.08em;}.ja-pe-content p{font-size:.72rem;line-height:1.45;}.ja-pe-reviews-link{font-size:.71rem;}}',
  '@media(max-width:360px){.ja-pe-card{gap:11px;padding:11px;}.ja-pe-badge-link{flex-basis:90px;max-width:90px;}.ja-pe-content{gap:6px;}}',
  '@media(prefers-reduced-motion:reduce){.ja-pe-badge-link,.ja-pe-reviews-link{transition:none;}}',
  '</style>'
].join('\n');

if (!html.includes('</head>') || !html.includes('</body>')) throw new Error('ProvenExpert: document boundaries missing.');
html = html.replace('</head>', provenExpertCss + '\n</head>');

const provenExpertProSeal = [
  '<!-- Official ProvenExpert ProSeal (Julian Arndt) -->',
  '<noscript><a href="https://www.provenexpert.com/julian-arndt/?utm_source=seals&amp;utm_campaign=proseal&amp;utm_medium=profile&amp;utm_content=0d5e8943-6459-4e34-ae63-0885f36db91f" target="_blank" title="Kundenbewertungen und Erfahrungen zu Julian Arndt" class="pe-pro-seal-more-infos" rel="nofollow noopener noreferrer">Mehr Informationen auf ProvenExpert</a></noscript>',
  '<script nowprocket id="proSeal">',
  'window.loadProSeal = function () {',
  '  if (!window.provenExpert || typeof window.provenExpert.proSeal !== "function") return;',
  '  window.provenExpert.proSeal({',
  '    widgetId: "0d5e8943-6459-4e34-ae63-0885f36db91f",',
  '    language: "de-DE", usePageLanguage: false,',
  '    bannerColor: "#097E92", textColor: "#FFFFFF",',
  '    showReviews: true, hideDate: true, hideName: false,',
  '    hideOnMobile: false, bottom: "250px", stickyToSide: "right",',
  '    googleStars: false, zIndex: "4000", displayReviewerLastName: false',
  '  });',
  '};',
  '</script>',
  '<script nowprocket src="https://s.provenexpert.net/seals/proseal-v2.js" async onload="window.loadProSeal && window.loadProSeal()"></script>',
  '<!-- End Official ProvenExpert ProSeal -->'
].join('\n');
html = html.replace('</body>', provenExpertProSeal + '\n</body>');

if ((html.match(/id="julian-provenexpert-inline"/g) || []).length !== 1 ||
    (html.match(/id="proSeal"/g) || []).length !== 1 ||
    !html.includes('0d5e8943-6459-4e34-ae63-0885f36db91f') ||
    !html.includes(provenExpertImage)) {
  throw new Error('ProvenExpert trust integration failed validation.');
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('CRO polish applied: stale proof removed, messaging synchronized and metadata aligned.');
