const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dist', 'index.html');
if (!fs.existsSync(filePath)) throw new Error('dist/index.html missing before CRO V4 message layer.');
let html = fs.readFileSync(filePath, 'utf8');
const MARKER = 'JULIAN_CRO_V4_OUTCOME_PATH_2026_08_17';
if (html.includes(MARKER)) process.exit(0);

function sectionRe(id) {
  return new RegExp(`<section\\b[^>]*\\bid=["']${id}["'][^>]*>[\\s\\S]*?<\\/section>`, 'i');
}
function replaceSection(id, replacement) {
  const re = sectionRe(id);
  if (!re.test(html)) throw new Error(`CRO V4: section ${id} missing`);
  html = html.replace(re, replacement);
}
function replaceAll(from, to) {
  if (html.includes(from)) html = html.split(from).join(to);
}

// 1) One clear promise above the fold. No extra explanatory clutter around the video.
html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>Julian Arndt | Klarer Investmentprozess für Krypto &amp; DeFi</title>');
const description = '<meta name="description" content="Baue mit Julian Arndt einen klaren Investmentprozess für Krypto und DeFi auf – mit Strategie, Risikorahmen und einer wiederholbaren Routine statt Bauchgefühl.">';
if (/<meta\b[^>]*name=["']description["'][^>]*>/i.test(html)) html = html.replace(/<meta\b[^>]*name=["']description["'][^>]*>/i, description);
else html = html.replace('</head>', `${description}\n</head>`);

html = html.replace(
  /<h1\b[^>]*class=["'][^"']*\bhero-h1\b[^"']*["'][^>]*>[\s\S]*?<\/h1>/i,
  '<h1 class="hero-h1">Baue dir in unter <em class="hero-days">90 Tagen</em> einen klaren Investmentprozess auf, mit dem du strukturiert zusätzlichen Cashflow über Krypto &amp; DeFi aufbauen kannst – mit nur <em>20 Minuten</em> pro Tag.</h1>'
);

// Respect Julian's WhatsApp feedback: keep the area around the hero/video clean.
html = html.replace(/<div\b[^>]*class=["'][^"']*\bslots-row\b[^"']*["'][^>]*>[\s\S]*?<\/div>\s*<\/div>/i, '');
html = html.replace(/<div\b[^>]*class=["'][^"']*\bvalue-strip\b[^"']*["'][^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/i, '</div></div>');

replaceAll('Kostenlosen Cashflow-Check starten', 'Kostenlose Strategieanalyse starten');
replaceAll('Cashflow-Check starten', 'Strategieanalyse starten');
replaceAll('Dein Cashflow-Check', 'Deine Strategieanalyse');
replaceAll('Cashflow-Check', 'Strategieanalyse');

// Keep one low-friction cue directly under the CTA, not a paragraph above the video.
html = html.replace(
  /<div class="cro-hero-reassure">[\s\S]*?<\/div>/i,
  '<div class="cro-hero-reassure">5 kurze Fragen <span>•</span> ca. 60 Sekunden <span>•</span> kostenlos &amp; unverbindlich</div>'
);

// 2) The missing CRO core: desired result + explicit path.
const pathSection = `<section class="quickfit cro-path" id="fit">
  <div class="quick-grid cro-path-grid">
    <div class="sr">
      <span class="s-tag">Dein klarer Weg</span>
      <h2 class="s-h2">Von einzelnen Entscheidungen zu einem <em>Investmentprozess, den du verstehst und wiederholen kannst.</em></h2>
      <p class="section-lede" style="margin-top:22px">Das Ziel ist nicht, ständig den nächsten Coin zu suchen. Du baust einen persönlichen Prozess auf, der dir zeigt, wie du Chancen bewertest, Risiken begrenzt und Entscheidungen strukturiert triffst.</p>
      <div class="cro-result-box">
        <span>Das Ergebnis</span>
        <strong>Du weißt, was du warum tust – und hast einen klaren Rahmen für deine nächsten Investmententscheidungen.</strong>
      </div>
      <div style="margin-top:26px"><a class="btn-main cashflow-funnel-trigger" href="#cashflow-funnel">Kostenlose Strategieanalyse starten</a><div class="cro-microcopy">5 Fragen zu Ziel, Erfahrung und Kapitalrahmen · ca. 60 Sekunden</div></div>
    </div>
    <div class="cro-path-steps sr d1">
      <article class="cro-path-step"><b>01</b><div><h3>Ausgangslage &amp; Ziel klären</h3><p>Wo stehst du heute, welches Ziel verfolgst du und welcher Kapitalrahmen ist realistisch?</p></div></article>
      <article class="cro-path-step"><b>02</b><div><h3>Strategie &amp; Risikorahmen bauen</h3><p>Du definierst nachvollziehbare Regeln für Chancen, Risiko, Positionsgrößen und Entscheidungen.</p></div></article>
      <article class="cro-path-step"><b>03</b><div><h3>Prozess &amp; Routine umsetzen</h3><p>Aus den Regeln entsteht eine wiederholbare Routine, die zu deinem Alltag passt – statt FOMO und Dauerstress.</p></div></article>
    </div>
  </div>
</section>`;
replaceSection('fit', pathSection);

// 3) Proof remains early, but its job is now to validate the promise instead of carrying the message alone.
if (html.includes('Nicht nur Bewertungen. <em>Echte Nachrichten von Kunden.</em>')) {
  html = html.replace('Nicht nur Bewertungen. <em>Echte Nachrichten von Kunden.</em>', 'So sieht die Begleitung <em>aus Sicht echter Kunden</em> aus.');
}
replaceAll(
  'Ungefilterte Rückmeldungen und konkrete Einblicke zeigen, wie Kunden die persönliche Begleitung, die verständliche Vermittlung und ihre eigene Umsetzung erleben.',
  'Direkte Nachrichten aus der Begleitung zeigen, ob aus Theorie tatsächlich mehr Klarheit, Verständnis und strukturierte Umsetzung entsteht.'
);

// 4) Make the mechanism tangible and non-overlapping with the path section.
if (sectionRe('process').test(html)) {
  let process = html.match(sectionRe('process'))[0];
  process = process.replace(/<h2\b([^>]*)>[\s\S]*?<\/h2>/i, '<h2$1>Was du im Prozess <em>konkret aufbaust.</em></h2>');
  process = process.replace('<div class="prin-title">Ausgangslage verstehen</div>', '<div class="prin-title">Persönliche Investmentstrategie</div>');
  process = process.replace('Was besitzt du bereits? Was ist dein Ziel? Wo fehlen Regeln? Erst dann entsteht ein sinnvoller nächster Schritt.', 'Eine Strategie, die zu deiner Ausgangslage, deinem Kapitalrahmen, deinem Erfahrungsstand und deinen Zielen passt.');
  process = process.replace('<div class="prin-title">Regeln &amp; Risikorahmen</div>', '<div class="prin-title">Klare Entscheidungsregeln</div>');
  process = process.replace('Du definierst vorab, wie du Chancen bewertest, Risiken begrenzt und Entscheidungen dokumentierst – bevor Emotionen übernehmen.', 'Ein nachvollziehbarer Risikorahmen dafür, wie du Chancen bewertest, Verlustrisiken begrenzt und Entscheidungen dokumentierst.');
  process = process.replace('<div class="prin-title">Umsetzen ohne Dauerstress</div>', '<div class="prin-title">Wiederholbare Wochenroutine</div>');
  process = process.replace('Eine wiederholbare Routine hilft dir, Märkte zu prüfen und Entscheidungen zu treffen, ohne jedem Signal hinterherzulaufen.', 'Eine kompakte Routine, mit der du relevante Entwicklungen prüfst und Entscheidungen triffst, ohne permanent am Markt hängen zu müssen.');
  html = html.replace(sectionRe('process'), process);
}

// 5) Human trust section: make Julian's role explicit and outcome-oriented without promising returns.
replaceAll(
  'Im ersten Schritt geht es nicht um Coin-Tipps, sondern um deine Ausgangslage: Ziel, Erfahrung, Kapitalrahmen und aktueller Entscheidungsprozess. Danach wird transparent eingeordnet, ob eine Zusammenarbeit überhaupt sinnvoll ist.',
  'Julian hilft dir dabei, aus deiner aktuellen Situation einen klaren Investmentprozess zu entwickeln. Im ersten Schritt werden Ziel, Erfahrung, Kapitalrahmen und bisherige Entscheidungen eingeordnet. Danach siehst du, welcher nächste Schritt für dich sinnvoll ist.'
);

// 6) Mid- and end-page action must name exactly what happens next.
replaceAll('Finde in 60 Sekunden heraus, ob der Ansatz zu dir passt.', 'Starte mit einer kostenlosen Analyse deiner aktuellen Investment-Situation.');
replaceAll(
  'Der Check ordnet deine Ausgangslage ein. Danach entscheidest du selbst: Rückruf anfordern oder direkt einen freien Termin auswählen.',
  'Du beantwortest fünf kurze Fragen zu Ziel, Erfahrung und Kapitalrahmen. Danach entscheidest du selbst: Rückruf anfordern oder direkt einen freien Termin für die persönliche Strategieanalyse auswählen.'
);
replaceAll(
  'Noch unsicher? Genau dafür ist der kostenlose Check da.',
  'Der nächste Schritt: deine aktuelle Situation klar einordnen.'
);
replaceAll(
  'Fünf kurze Fragen, etwa 60 Sekunden. Danach kannst du selbst entscheiden, ob du einen Rückruf möchtest oder direkt einen Termin auswählst.',
  'Fünf kurze Fragen geben Julian und seinem Team den nötigen Kontext für die persönliche Strategieanalyse. Danach wählst du selbst Rückruf oder Termin.'
);

// 7) Funnel language: no vague "check" and no suggestion that a full strategy is generated by the form itself.
replaceAll('Klarheit beginnt mit deiner Ausgangslage.', 'Deine Strategie beginnt mit einer klaren Ausgangslage.');
replaceAll(
  'Kein Standardformular, sondern fünf gezielte Fragen für einen sinnvollen persönlichen nächsten Schritt.',
  'Fünf gezielte Fragen zu deinem Ziel, deiner Erfahrung und deinem Kapitalrahmen – damit die persönliche Strategieanalyse direkt bei deiner Situation ansetzt.'
);
replaceAll('Kostenlose Einordnung erhalten →', 'Strategieanalyse anfragen →');
replaceAll('Deine Einordnung wird vorbereitet.', 'Deine Angaben werden vorbereitet.');

// 8) FAQ and objections: answer what a skeptical prospect needs before giving contact details.
replaceAll('Wie läuft die kostenlose Analyse ab?', 'Was passiert in der kostenlosen Strategieanalyse?');
replaceAll(
  'Du beantwortest zuerst fünf kurze Fragen. Danach kannst du einen Rückruf anfordern oder direkt einen Termin wählen. Im Gespräch werden Ziel, Erfahrung, Kapitalrahmen und dein bisheriger Prozess eingeordnet – ohne individuelle Kauf- oder Verkaufsempfehlungen.',
  'Du beantwortest zuerst fünf kurze Fragen. Danach kannst du einen Rückruf anfordern oder direkt einen Termin wählen. Im Gespräch werden Ziel, Erfahrung, Kapitalrahmen und dein bisheriger Entscheidungsprozess eingeordnet. Du bekommst Klarheit darüber, wo dein Prozess aktuell Lücken hat und welcher nächste Schritt sinnvoll ist – ohne Gewinnversprechen oder konkrete Kauf- und Verkaufsempfehlungen.'
);

const css = `<style id="julian-cro-v4-message">/* ${MARKER} */
.cro-path{padding-top:86px!important;padding-bottom:92px!important}.cro-path-grid{align-items:start!important;gap:70px!important}.cro-result-box{margin-top:28px;padding:22px 24px;border:1px solid rgba(216,176,48,.22);border-radius:16px;background:rgba(216,176,48,.055)}.cro-result-box span{display:block;margin-bottom:8px;font-size:.68rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#d8b030}.cro-result-box strong{display:block;font-family:Manrope,sans-serif;font-size:1rem;line-height:1.55;color:#f3efe6}.cro-path-steps{display:grid;gap:14px}.cro-path-step{display:grid;grid-template-columns:54px 1fr;gap:18px;padding:24px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(255,255,255,.025)}.cro-path-step b{display:flex;width:44px;height:44px;align-items:center;justify-content:center;border-radius:50%;border:1px solid rgba(216,176,48,.3);font-size:.75rem;letter-spacing:.08em;color:#d8b030}.cro-path-step h3{margin:1px 0 7px;font-family:Manrope,sans-serif;font-size:1rem;line-height:1.25;color:#f3efe6}.cro-path-step p{margin:0;font-size:.83rem;line-height:1.58;color:rgba(243,239,230,.64)}
@media(max-width:820px){.cro-path{padding-top:58px!important;padding-bottom:64px!important}.cro-path-grid{gap:34px!important}.cro-path-step{grid-template-columns:46px 1fr;padding:19px 17px;gap:13px}.cro-result-box{padding:18px}.cro-hero-reassure{font-size:.72rem}}
</style>`;
html = html.replace('</head>', `${css}\n<meta name="cro-message-version" content="2026-08-17-v4-outcome-path">\n</head>`);

// Safety checks for the final conversion message.
const required = [
  'einen klaren Investmentprozess auf',
  'Kostenlose Strategieanalyse starten',
  'Dein klarer Weg',
  'Das Ergebnis',
  'Ausgangslage &amp; Ziel klären',
  'Strategie &amp; Risikorahmen bauen',
  'Prozess &amp; Routine umsetzen',
  'Was du im Prozess <em>konkret aufbaust.</em>'
];
for (const token of required) if (!html.includes(token)) throw new Error(`CRO V4 missing: ${token}`);
if (html.includes('Cashflow-Check')) throw new Error('CRO V4: vague Cashflow-Check copy remains');
if (html.includes('Persönlicher Cashflow-Plan')) throw new Error('CRO V4: stale hero value proposition remains');

fs.writeFileSync(filePath, html, 'utf8');
console.log('CRO V4 applied: clear result, explicit path, strategy-analysis CTA, Julian hero feedback preserved.');
