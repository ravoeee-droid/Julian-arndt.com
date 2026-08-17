const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dist', 'index.html');
if (!fs.existsSync(filePath)) throw new Error('dist/index.html missing before CRO layer.');
let html = fs.readFileSync(filePath, 'utf8');
const MARKER = 'JULIAN_CRO_2026_08_17_V3';
if (html.includes(MARKER)) process.exit(0);

function sectionRe(id) {
  return new RegExp(`<section\\b[^>]*\\bid=["']${id}["'][^>]*>[\\s\\S]*?<\\/section>`, 'i');
}
function getSection(id) {
  const m = html.match(sectionRe(id));
  if (!m) throw new Error(`CRO: section ${id} missing`);
  return m[0];
}
function setSection(id, section) {
  const re = sectionRe(id);
  if (!re.test(html)) throw new Error(`CRO: section ${id} missing while updating`);
  html = html.replace(re, section);
}
function replaceFirstH2(id, innerHtml) {
  let section = getSection(id);
  if (!/<h2\b[^>]*>[\s\S]*?<\/h2>/i.test(section)) throw new Error(`CRO: H2 missing in ${id}`);
  section = section.replace(/<h2\b([^>]*)>[\s\S]*?<\/h2>/i, `<h2$1>${innerHtml}</h2>`);
  setSection(id, section);
}
function replaceText(from, to) {
  if (html.includes(from)) html = html.replace(from, to);
}
function replaceAllText(from, to) {
  if (html.includes(from)) html = html.split(from).join(to);
}

/* Search/message match */
html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>DeFi Intelligence | Klarer Investmentprozess mit Julian Arndt</title>');
const metaDescription = '<meta name="description" content="Baue einen klaren Investmentprozess für Krypto und DeFi auf. Starte den kostenlosen 60-Sekunden-Check und prüfe, ob der Ansatz zu deiner Situation passt.">';
if (/<meta\b[^>]*name=["']description["'][^>]*>/i.test(html)) html = html.replace(/<meta\b[^>]*name=["']description["'][^>]*>/i, metaDescription);
else html = html.replace('</head>', `${metaDescription}\n</head>`);

/* Hero: mechanism first, outcome second */
if (!/<h1\b[^>]*class=["'][^"']*\bhero-h1\b[^"']*["'][^>]*>[\s\S]*?<\/h1>/i.test(html)) throw new Error('CRO: hero H1 missing');
html = html.replace(/<h1\b[^>]*class=["'][^"']*\bhero-h1\b[^"']*["'][^>]*>[\s\S]*?<\/h1>/i,
  '<h1 class="hero-h1">Baue dir in unter <em class="hero-days">90 Tagen</em> einen klaren Investmentprozess auf – als Grundlage für zusätzlichen Cashflow. Mit nur <em>20 Minuten</em> pro Tag.</h1>');
replaceText(
  'Beantworte fünf kurze Fragen und finde heraus, welcher nächste Schritt zu deiner aktuellen Situation passt.',
  'Beantworte fünf kurze Fragen. Danach weißt du, ob der Ansatz zu deiner Situation passt und kannst – wenn du möchtest – direkt mit Julian sprechen.'
);
replaceAllText('Meinen Cashflow-Plan starten', 'Kostenlosen Cashflow-Check starten');
replaceAllText('Cashflow-Plan mit Julian starten', 'Kostenlosen Cashflow-Check starten');
replaceAllText('Cashflow-Plan starten', 'Cashflow-Check starten');

let hero = getSection('top');
hero = hero.replace(/<a\b([^>]*href=["']#angebot["'][^>]*)>Ansatz ansehen<\/a>/i,
  (m, attrs) => `<a ${attrs.replace(/href=["']#angebot["']/i, 'href="#kundeneinblicke"')}>Kundenstimmen ansehen</a>`);
if (!hero.includes('cro-hero-reassure')) {
  hero = hero.replace(/(<div\b[^>]*class=["'][^"']*\bcta-row\b[^"']*["'][^>]*>[\s\S]*?<\/div>)/i,
    '$1<div class="cro-hero-reassure">✓ ca. 60 Sekunden <span>•</span> ✓ kostenlos <span>•</span> ✓ unverbindlich</div>');
}
setSection('top', hero);

/* Qualification replaces repetitive generic persuasion and removes conflicting review stat */
const fit = `<section class="quickfit" id="fit">
  <div class="quick-grid">
    <div class="sr">
      <span class="s-tag">Passt der Ansatz zu dir?</span>
      <h2 class="s-h2">Für Menschen, die <em>klarer entscheiden</em> wollen – nicht lauter spekulieren.</h2>
      <p class="section-lede" style="margin-top:22px">Der Check ist sinnvoll, wenn du zusätzlichen Cashflow über Krypto oder DeFi aufbauen möchtest, dafür aber einen nachvollziehbaren Prozess statt Tipps, FOMO und Einzelwetten suchst.</p>
      <div style="margin-top:28px"><a class="btn-main cashflow-funnel-trigger" href="#cashflow-funnel">Kostenlosen Cashflow-Check starten</a><div class="cro-microcopy">5 kurze Fragen · kostenlos · unverbindlich</div></div>
    </div>
    <div class="quick-card sr d1"><div class="quick-list">
      <div class="quick-item"><span>✓</span><strong>Du hast Einkommen oder Kapital</strong> und möchtest Entscheidungen nachvollziehbarer und strukturierter treffen.</div>
      <div class="quick-item"><span>✓</span><strong>Du willst Zeit sparen</strong> und nicht jeden Tag News, Influencern oder einzelnen Signalen hinterherlaufen.</div>
      <div class="quick-item"><span>✓</span><strong>Du akzeptierst, dass Rendite Risiko bedeutet</strong> und möchtest dieses Risiko mit Regeln statt Bauchgefühl steuern.</div>
      <div class="quick-item"><span>✓</span><strong>Du willst selbst verstehen</strong>, warum du eine Entscheidung triffst – statt blind etwas nachzumachen.</div>
      <div class="quick-item cro-not-fit"><span>×</span><strong>Nicht passend:</strong> Du suchst schnelle Coin-Tipps, garantierte Renditen oder eine Lösung ohne eigenes Risikobewusstsein.</div>
    </div></div>
  </div>
</section>`;
setSection('fit', fit);

/* Correct, consistent proof immediately after the first screen */
const proofStrip = `<div class="cro-proof-strip" aria-label="Vertrauenssignale">
  <div class="cro-proof-item"><strong>100+</strong><span>Kunden begleitet</span></div>
  <div class="cro-proof-item"><strong>2.000+</strong><span>Gespräche geführt</span></div>
  <div class="cro-proof-item"><strong>4,3 / 5</strong><span>Trustpilot · 18 Bewertungen</span></div>
  <div class="cro-proof-item"><strong>3</strong><span>dokumentierte Fallbeispiele</span></div>
</div>`;
hero = getSection('top');
html = html.replace(hero, hero + proofStrip);

/* Put concrete evidence before mechanism explanation */
let results = getSection('results');
results = results.replace(/<h2\b([^>]*)>[\s\S]*?<\/h2>/i, '<h2$1>Was Kunden nach der Begleitung berichten.</h2>');
results = results.replace('Jedes Ergebnis ist direkt der passenden Kundenstimme zugeordnet. Ergebnisse sind individuell und nicht garantiert.',
  'Drei dokumentierte Kundenerfahrungen – mit Ausgangslage, persönlicher Rückmeldung und klarer Risikoeinordnung. Ergebnisse sind individuell und nicht garantiert.');
html = html.replace(sectionRe('results'), '');
const proofChat = getSection('kundeneinblicke');
html = html.replace(proofChat, proofChat + '\n' + results);

/* Explain the actual mechanism instead of abstract benefits */
replaceFirstH2('process', 'So wird aus Informationschaos ein klarer Entscheidungsprozess.');
replaceText('Marktverständnis', 'Ausgangslage verstehen');
replaceText('Statt Trends hinterherzulaufen, entwickelst du ein fundiertes Verständnis für Kapitalmärkte und Krypto.',
  'Was besitzt du bereits? Was ist dein Ziel? Wo fehlen Regeln? Erst dann entsteht ein sinnvoller nächster Schritt.');
replaceText('Risikomanagement', 'Regeln & Risikorahmen');
replaceText('Dein Kapital wird nicht dem Zufall überlassen, sondern durch klare Regeln und Szenarien geschützt.',
  'Du definierst vorab, wie du Chancen bewertest, Risiken begrenzt und Entscheidungen dokumentierst – bevor Emotionen übernehmen.');
replaceText('Wochenroutine', 'Umsetzen ohne Dauerstress');
replaceText('Du triffst Entscheidungen nach Prozess, nicht aus Stress, FOMO oder einzelnen Meinungen.',
  'Eine wiederholbare Routine hilft dir, Märkte zu prüfen und Entscheidungen zu treffen, ohne jedem Signal hinterherzulaufen.');

/* Person and trust: specific, human, less defensive */
replaceText(
  'Mit DeFi Intelligence verfolgt Julian das Ziel, Menschen dabei zu unterstützen, sich unabhängig von ihrem Job oder Unternehmen ein zusätzliches Einkommen aufzubauen – effizient, strukturiert und langfristig.',
  'Im ersten Schritt geht es nicht um Coin-Tipps, sondern um deine Ausgangslage: Ziel, Erfahrung, Kapitalrahmen und aktueller Entscheidungsprozess. Danach wird transparent eingeordnet, ob eine Zusammenarbeit überhaupt sinnvoll ist.'
);
replaceFirstH2('vertrauen', 'Du weißt, mit wem du sprichst – und was du erwarten kannst.');
replaceText(
  'Deshalb wird hier klar gezeigt, wer hinter DeFi Intelligence steht, was im ersten Gespräch passiert und was ausdrücklich nicht versprochen wird.',
  'Gerade bei Krypto entsteht Vertrauen nicht durch große Versprechen, sondern durch klare Rollen, nachvollziehbare Prozesse und eine ehrliche Einordnung von Risiken.'
);

/* Mid-page action: lower uncertainty before click */
replaceFirstH2('termin', 'Finde in 60 Sekunden heraus, ob der Ansatz zu dir passt.');
replaceText(
  'Beantworte fünf kurze Fragen und erhalte eine persönliche Einordnung deiner aktuellen Ausgangslage. Danach entscheidest du selbst, ob du zurückgerufen werden oder direkt einen Termin auswählen möchtest.',
  'Der Check ordnet deine Ausgangslage ein. Danach entscheidest du selbst: Rückruf anfordern oder direkt einen freien Termin auswählen.'
);

/* Objections and FAQ: transparency + internal consistency */
replaceText(
  'Die erste Prozess-Prüfung ist kostenlos. Ob und wie eine weitere Zusammenarbeit aussieht, wird erst danach transparent besprochen. Es gibt keinen automatischen Kaufzwang.',
  'Die erste Prozess-Prüfung ist kostenlos. Wenn eine weitere Zusammenarbeit sinnvoll ist, werden Umfang und Preis vor deiner Entscheidung transparent besprochen. Es gibt keinen automatischen Kaufzwang.'
);
let faq = getSection('faq');
faq = faq.replace(/<h3\b([^>]*)>\s*Ist das individuelle Anlageberatung\?\s*<\/h3>/i, '<h3$1>Wie läuft die kostenlose Analyse ab?</h3>');
faq = faq.replace('Nein. Im kostenlosen Erstgespräch geht es um Struktur, Risikobewusstsein und eine Einschätzung deiner aktuellen Situation, nicht um individuelle Anlageberatung oder konkrete Kauf- und Verkaufsempfehlungen.',
  'Du beantwortest zuerst fünf kurze Fragen. Danach kannst du einen Rückruf anfordern oder direkt einen Termin wählen. Im Gespräch werden Ziel, Erfahrung, Kapitalrahmen und dein bisheriger Prozess eingeordnet – ohne individuelle Kauf- oder Verkaufsempfehlungen.');
faq = faq.replace('Das Angebot richtet sich an Menschen, die ein konstantes Einkommen haben, aber auch an Menschen, die gerade neu starten.',
  'Für den kostenlosen Check gibt es keine pauschale Mindestgröße. Ob eine weitere Zusammenarbeit sinnvoll ist, hängt von deiner Ausgangslage, deinen Zielen und deinem Risikorahmen ab.');
faq = faq.replace('Das Ziel ist ein realistischer Prozess, der mit etwa einer Stunde pro Woche in den Alltag integrierbar ist.',
  'Für den Aufbau solltest du je nach Phase mit rund 20 Minuten pro Tag rechnen. Sobald dein Prozess steht, kann die laufende Routine deutlich kompakter werden.');
setSection('faq', faq);

/* Funnel value exchange */
html = html.split('>Dein Cashflow-Plan<').join('>Dein Cashflow-Check<');
html = html.split('Ergebnis anzeigen →').join('Kostenlose Einordnung erhalten →');
html = html.split('Dein Cashflow-Profil wird erstellt.').join('Deine Einordnung wird vorbereitet.');
html = html.split('Dein Cashflow-Plan ist angekommen.').join('Deine Angaben sind angekommen.');

/* Final decision CTA after all evidence */
const finalCta = `<section class="cro-final-cta" id="cro-final">
  <span class="s-tag">Dein nächster Schritt</span>
  <h2>Noch unsicher? Genau dafür ist der kostenlose Check da.</h2>
  <p>Fünf kurze Fragen, etwa 60 Sekunden. Danach kannst du selbst entscheiden, ob du einen Rückruf möchtest oder direkt einen Termin auswählst.</p>
  <a class="btn-main cashflow-funnel-trigger" href="#cashflow-funnel">Kostenlosen Cashflow-Check starten</a>
  <div class="cro-final-micro">Kostenlos · unverbindlich · keine Anlageberatung · kein Kaufzwang</div>
</section>`;
const trustpilot = getSection('trustpilot');
html = html.replace(trustpilot, trustpilot + '\n' + finalCta);

/* Restrained premium styling for finance traffic */
const css = `<style id="julian-cro-2026-08-17">/* ${MARKER} */
.cro-hero-reassure{margin-top:14px;font-size:.78rem;line-height:1.5;letter-spacing:.02em;color:rgba(242,238,229,.68)}
.cro-hero-reassure span{padding:0 8px;color:rgba(216,176,48,.7)}
.cro-proof-strip{width:min(1180px,calc(100% - 48px));margin:-14px auto 74px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid rgba(216,176,48,.24);border-radius:20px;overflow:hidden;background:rgba(216,176,48,.12);box-shadow:0 26px 80px rgba(0,0,0,.22)}
.cro-proof-item{min-height:92px;padding:20px 18px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:rgba(9,9,8,.96)}
.cro-proof-item+.cro-proof-item{border-left:1px solid rgba(216,176,48,.16)}
.cro-proof-item strong{font-family:Manrope,sans-serif;font-size:1.38rem;line-height:1.05;font-weight:800;letter-spacing:-.035em;color:#f3efe6}
.cro-proof-item span{margin-top:7px;font-size:.68rem;line-height:1.35;letter-spacing:.04em;color:rgba(243,239,230,.62)}
.cro-microcopy{margin-top:12px;font-size:.74rem;color:rgba(243,239,230,.58)}
.cro-not-fit{margin-top:4px;border-color:rgba(216,176,48,.18)!important;background:rgba(216,176,48,.035)!important}
.cro-not-fit>span{color:rgba(243,239,230,.52)!important}
.cro-final-cta{width:min(1180px,calc(100% - 48px));margin:34px auto 90px;padding:72px 42px;text-align:center;border:1px solid rgba(216,176,48,.28);border-radius:28px;background:radial-gradient(circle at 50% 0%,rgba(216,176,48,.13),transparent 44%),#0b0b0a;box-shadow:0 30px 90px rgba(0,0,0,.26)}
.cro-final-cta h2{max-width:780px;margin:18px auto 0;font-family:Manrope,sans-serif;font-size:clamp(2rem,4vw,3.8rem);line-height:1.02;letter-spacing:-.045em;color:#f3efe6}
.cro-final-cta p{max-width:690px;margin:22px auto 30px;font-size:1rem;line-height:1.75;color:rgba(243,239,230,.7)}
.cro-final-cta .btn-main{display:inline-flex;align-items:center;justify-content:center}
.cro-final-micro{margin-top:16px;font-size:.72rem;line-height:1.5;color:rgba(243,239,230,.5)}
@media(max-width:760px){
 .cro-hero-reassure{font-size:.7rem;margin-top:12px}.cro-hero-reassure span{padding:0 4px}
 .cro-proof-strip{width:calc(100% - 28px);margin:0 auto 52px;grid-template-columns:repeat(2,minmax(0,1fr));border-radius:18px}
 .cro-proof-item{min-height:82px;padding:16px 10px}.cro-proof-item+.cro-proof-item{border-left:0}.cro-proof-item:nth-child(even){border-left:1px solid rgba(216,176,48,.16)}.cro-proof-item:nth-child(n+3){border-top:1px solid rgba(216,176,48,.16)}
 .cro-proof-item strong{font-size:1.2rem}.cro-proof-item span{font-size:.62rem}
 .cro-final-cta{width:calc(100% - 28px);margin:24px auto 94px;padding:48px 20px;border-radius:22px}.cro-final-cta h2{font-size:clamp(2rem,9vw,2.85rem)}.cro-final-cta p{font-size:.9rem;line-height:1.65}.cro-final-cta .btn-main{width:100%}
}
</style>`;
html = html.replace('</head>', `${css}\n</head>`);

/* CTA placement signal for future CRO decisions; no personal data */
const tracking = `<script id="julian-cro-tracking">(function(){document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('.cashflow-funnel-trigger');if(!a)return;var s=a.closest('section');var loc=s&&s.id?s.id:(a.classList.contains('mobile-sticky-cta')?'mobile_sticky':'unknown');try{window.dispatchEvent(new CustomEvent('julianCroEvent',{detail:{name:'CtaClick',location:loc}}));}catch(err){}},true);})();</script>`;
html = html.replace('</body>', `${tracking}\n</body>`);

const required = [
  'klaren Investmentprozess',
  'Kostenlosen Cashflow-Check starten',
  'cro-proof-strip',
  'Trustpilot · 18 Bewertungen',
  'Nicht passend:',
  'Was Kunden nach der Begleitung berichten.',
  'So wird aus Informationschaos ein klarer Entscheidungsprozess.',
  'Du weißt, mit wem du sprichst',
  'Finde in 60 Sekunden heraus',
  'keine Anlageberatung',
  'kein Kaufzwang',
  MARKER
];
for (const marker of required) if (!html.includes(marker)) throw new Error(`CRO required marker missing: ${marker}`);
if (html.indexOf('id="results"') > html.indexOf('id="process"')) throw new Error('CRO: results must appear before process');
if (html.includes('4,9 ★ 16 Bewertungen')) throw new Error('CRO: stale Trustpilot stat remains');

fs.writeFileSync(filePath, html, 'utf8');
console.log('High-conversion CRO V3 applied successfully.');
