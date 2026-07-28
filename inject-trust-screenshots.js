const fs = require('fs');
const path = require('path');

const root = __dirname;
const indexPath = path.join(root, 'dist', 'index.html');
const sourceDir = path.join(root, 'trust-assets');
const targetDir = path.join(root, 'dist', 'assets');

if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html is missing before the trust screenshot step.');
}

const screenshots = [
  {
    source: 'kundenstimme-alexander.jpeg',
    target: 'trust-kundenstimme-alexander.jpeg',
    width: 852,
    height: 1846,
    type: 'feedback',
    eyebrow: 'Kundenstimme',
    title: 'Von anfänglicher Skepsis zur klaren Empfehlung',
    alt: 'WhatsApp-Kundenstimme über das Coaching, die Kompetenz des Teams und verständliche Antworten'
  },
  {
    source: 'kundenstimme-julius.jpeg',
    target: 'trust-kundenstimme-julius.jpeg',
    width: 853,
    height: 1844,
    type: 'feedback',
    eyebrow: 'Kundenstimme',
    title: 'Charts selbst analysieren und langfristig aufbauen',
    alt: 'WhatsApp-Kundenstimme über Chartanalyse, Bitcoin-Strategie und persönliche Betreuung'
  },
  {
    source: 'kundenstimme-kai.jpeg',
    target: 'trust-kundenstimme-kai.jpeg',
    width: 853,
    height: 1844,
    type: 'feedback',
    eyebrow: 'Kundenstimme',
    title: 'Eine eigene Strategie verstehen und weiterentwickeln',
    alt: 'WhatsApp-Kundenstimme über eine erlernte Strategie und die persönliche Weiterentwicklung'
  },
  {
    source: 'kundenstimme-joerg-keyboard.jpeg',
    target: 'trust-kundenstimme-joerg-keyboard.jpeg',
    width: 853,
    height: 1844,
    type: 'feedback featured',
    eyebrow: 'Kundenstimme · 3 Jahre Begleitung',
    title: 'Mehrwert von Krypto-Grundlagen bis zu Cashflow-Strategien',
    alt: 'WhatsApp-Kundenstimme über mehr als drei Jahre Begleitung, Vermögensaufbau und Cashflow-Strategien'
  },
  {
    source: 'kundenstimme-joerg-kontext.jpeg',
    target: 'trust-kundenstimme-joerg-kontext.jpeg',
    width: 853,
    height: 1844,
    type: 'feedback featured',
    eyebrow: 'Langzeit-Kundenstimme',
    title: 'Das Kryptogeschäft verstehen und langfristig nutzen',
    alt: 'WhatsApp-Kundenstimme über CryptoBasics, Vermögensaufbau und eine langfristige Begleitung'
  },
  {
    source: 'umsetzung-gold-trades.jpeg',
    target: 'trust-umsetzung-gold-trades.jpeg',
    width: 1170,
    height: 1580,
    type: 'result',
    eyebrow: 'Umsetzungseinblick',
    title: 'Direktes Feedback nach der praktischen Umsetzung',
    alt: 'WhatsApp-Nachricht eines Kunden mit einem persönlichen Trading-Umsetzungsbeispiel'
  },
  {
    source: 'ergebnis-sol-eth.jpeg',
    target: 'trust-ergebnis-sol-eth.jpeg',
    width: 739,
    height: 1600,
    type: 'result',
    eyebrow: 'Ergebnisbeispiel',
    title: 'Einblick in eine individuelle Kundenumsetzung',
    alt: 'Persönliches Trading-Ergebnisbeispiel mit offenen SOL- und ETH-Positionen'
  }
];

fs.mkdirSync(targetDir, { recursive: true });

for (const screenshot of screenshots) {
  const sourcePath = path.join(sourceDir, screenshot.source);
  const targetPath = path.join(targetDir, screenshot.target);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Trust screenshot is missing: ${screenshot.source}`);
  }

  const image = fs.readFileSync(sourcePath);
  if (image.length < 100 || image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff) {
    throw new Error(`Trust screenshot is not a valid JPEG: ${screenshot.source}`);
  }

  fs.writeFileSync(targetPath, image);
}

let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes('id="kundeneinblicke"')) {
  throw new Error('The trust screenshot section already exists.');
}

const trustCss = `
/* CUSTOMER TRUST SCREENSHOTS */
.proof-chat{
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 50% 0%,rgba(198,162,42,.08),transparent 36%),
    #070707;
}
.proof-chat::before{
  content:"";
  position:absolute;
  width:360px;
  height:360px;
  right:-170px;
  top:120px;
  border:1px solid rgba(198,162,42,.08);
  border-radius:50%;
  pointer-events:none;
}
.proof-chat .section-lede{
  max-width:780px;
  margin-left:auto;
  margin-right:auto;
}
.proof-chat-grid{
  display:grid;
  grid-template-columns:repeat(12,minmax(0,1fr));
  gap:18px;
  margin-top:42px;
}
.proof-chat-card{
  grid-column:span 4;
  min-width:0;
  overflow:hidden;
  border:1px solid rgba(198,162,42,.16);
  border-radius:26px;
  background:linear-gradient(155deg,rgba(255,255,255,.045),rgba(255,255,255,.018));
  box-shadow:0 28px 90px rgba(0,0,0,.28);
  transition:transform .28s ease,border-color .28s ease,box-shadow .28s ease;
}
.proof-chat-card.result{
  grid-column:span 6;
}
.proof-chat-card.featured{
  grid-column:span 6;
}
.proof-chat-card:hover{
  transform:translateY(-4px);
  border-color:rgba(198,162,42,.32);
  box-shadow:0 34px 100px rgba(0,0,0,.34);
}
.proof-chat-copy{
  min-height:112px;
  padding:20px 20px 18px;
  border-bottom:1px solid rgba(198,162,42,.12);
}
.proof-chat-copy span{
  display:block;
  margin-bottom:8px;
  color:var(--gold);
  font-size:.66rem;
  font-weight:850;
  letter-spacing:.15em;
  text-transform:uppercase;
}
.proof-chat-copy h3{
  margin:0;
  color:var(--cream);
  font-size:1rem;
  line-height:1.45;
}
.proof-chat-shot{
  display:flex;
  align-items:center;
  justify-content:center;
  height:560px;
  padding:12px;
  background:#050505;
}
.proof-chat-shot img{
  display:block;
  width:100%;
  height:100%;
  object-fit:contain;
}
.proof-chat-open{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:14px 18px;
  border-top:1px solid rgba(255,255,255,.05);
  color:rgba(242,238,229,.68);
  font-size:.72rem;
  font-weight:700;
  letter-spacing:.05em;
  text-decoration:none;
}
.proof-chat-open b{
  color:var(--gold2);
  font-size:1rem;
}
.proof-chat-note{
  max-width:900px;
  margin:24px auto 0;
  padding:17px 20px;
  border:1px solid rgba(198,162,42,.14);
  border-radius:18px;
  background:rgba(198,162,42,.035);
  color:rgba(242,238,229,.58);
  font-size:.76rem;
  line-height:1.65;
  text-align:center;
}
.proof-chat-cta{
  display:flex;
  justify-content:center;
  margin-top:28px;
}
@media(max-width:980px){
  .proof-chat-card,
  .proof-chat-card.result{grid-column:span 6}
}
@media(max-width:760px){
  .proof-chat-grid{
    display:flex;
    width:100%;
    max-width:100%;
    margin-right:0;
    overflow-x:auto;
    overflow-y:hidden;
    gap:14px;
    padding:0 16px 14px 0;
    scroll-snap-type:x proximity;
    scroll-padding-inline:0 16px;
    overscroll-behavior-x:contain;
    overscroll-behavior-y:auto;
    -webkit-overflow-scrolling:touch;
    touch-action:pan-x pan-y;
    scrollbar-width:none;
  }
  .proof-chat-grid::-webkit-scrollbar{display:none}
  .proof-chat-card,
  .proof-chat-card.result,
  .proof-chat-card.featured{
    flex:0 0 min(calc(100vw - 52px),350px);
    scroll-snap-align:start;
    scroll-snap-stop:normal;
    touch-action:pan-x pan-y;
  }
  .proof-chat-shot img{-webkit-user-drag:none;user-select:none}
  .proof-chat-shot{height:520px}
  .proof-chat-copy{min-height:108px;padding:18px}
  .proof-chat-note{text-align:left}
}
`;

if (!html.includes('</style>')) {
  throw new Error('The main stylesheet closing tag was not found.');
}
html = html.replace('</style>', `${trustCss}\n</style>`);

const cards = screenshots.map((screenshot, index) => `
<article class="proof-chat-card ${screenshot.type} sr d${(index % 4) + 1}">
  <div class="proof-chat-copy">
    <span>${screenshot.eyebrow}</span>
    <h3>${screenshot.title}</h3>
  </div>
  <a class="proof-chat-shot" href="assets/${screenshot.target}" target="_blank" rel="noopener" aria-label="${screenshot.title} vollständig öffnen">
    <img src="assets/${screenshot.target}" width="${screenshot.width}" height="${screenshot.height}" loading="lazy" decoding="async" alt="${screenshot.alt}">
  </a>
  <a class="proof-chat-open" href="assets/${screenshot.target}" target="_blank" rel="noopener">
    <span>Screenshot öffnen</span><b aria-hidden="true">↗</b>
  </a>
</article>`).join('');

const section = `
<section class="section proof-chat" id="kundeneinblicke">
  <div class="wrap">
    <div class="center sr">
      <span class="s-tag">Direkte Einblicke aus der Begleitung</span>
      <h2 class="s-h2">Nicht nur Bewertungen. <em>Echte Nachrichten von Kunden.</em></h2>
      <div class="gold-rule c"></div>
      <p class="section-lede">Ungefilterte Rückmeldungen und konkrete Einblicke zeigen, wie Kunden die persönliche Begleitung, die verständliche Vermittlung und ihre eigene Umsetzung erleben.</p>
    </div>
    <div class="proof-chat-grid">${cards}
    </div>
    <p class="proof-chat-note">Die dargestellten Erfahrungen und Ergebnisse sind individuell und keine Garantie für zukünftige Ergebnisse. Trading und Krypto sind mit erheblichen Verlustrisiken verbunden. Die Inhalte stellen keine Anlageberatung dar.</p>
    <div class="proof-chat-cta">
      <a class="btn-main calendar-track" href="#termin" rel="noopener">Kostenlose Analyse starten</a>
    </div>
  </div>
</section>
`;

const insertionMarker = /<span id="protocol"/;
const match = html.match(insertionMarker);
if (!match || typeof match.index !== 'number') {
  throw new Error('Could not find the exact insertion point after the top-level statistics.');
}

html = `${html.slice(0, match.index)}${section}\n${html.slice(match.index)}`;

const requiredMarkers = [
  'id="kundeneinblicke"',
  'CUSTOMER TRUST SCREENSHOTS',
  'trust-kundenstimme-alexander.jpeg',
  'trust-kundenstimme-julius.jpeg',
  'trust-kundenstimme-kai.jpeg',
  'trust-kundenstimme-joerg-keyboard.jpeg',
  'trust-kundenstimme-joerg-kontext.jpeg',
  'trust-umsetzung-gold-trades.jpeg',
  'trust-ergebnis-sol-eth.jpeg',
  'Trading und Krypto sind mit erheblichen Verlustrisiken verbunden'
];

for (const marker of requiredMarkers) {
  if (!html.includes(marker)) {
    throw new Error(`Required trust section marker is missing: ${marker}`);
  }
}

const statsIndex = html.indexOf('<div class="stats">');
const trustIndex = html.indexOf('id="kundeneinblicke"');
const protocolIndex = html.indexOf('id="protocol"');
if (statsIndex < 0 || trustIndex < statsIndex || protocolIndex < trustIndex) {
  throw new Error('The trust screenshot section is not placed directly after the top-level statistics.');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log(`Customer trust section added with ${screenshots.length} privacy-safe screenshots.`);
