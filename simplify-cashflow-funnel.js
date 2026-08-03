const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dist', 'index.html');
const marker = 'CASHFLOW_FUNNEL_SIMPLIFIED_V2';

if (!fs.existsSync(filePath)) {
  throw new Error('dist/index.html is missing before funnel simplification.');
}

let html = fs.readFileSync(filePath, 'utf8');

if (html.includes(marker)) {
  console.log('Cashflow funnel simplification already applied.');
  process.exit(0);
}

function replaceRequired(searchValue, replacement, label) {
  if (!html.includes(searchValue)) {
    throw new Error(`Cashflow funnel simplification could not find ${label}.`);
  }
  html = html.replace(searchValue, replacement);
}

const copyReplacements = [
  [
    "key:'goal', kicker:'Schritt 1 · Dein Ziel', title:'Was möchtest du mit deiner <em>Investmentstrategie</em> erreichen?', lede:'Wähle die Antwort, die deinem wichtigsten Ziel heute am nächsten kommt.'",
    "key:'goal', kicker:'Schritt 1 von 5', title:'Was ist dein wichtigstes <em>Ziel?</em>', lede:'Wähle eine Antwort.'"
  ],
  [
    "key:'experience', kicker:'Schritt 2 · Deine Erfahrung', title:'Wo stehst du <em>heute?</em>', lede:'Damit dein nächster Schritt weder zu einfach noch unnötig kompliziert wird.'",
    "key:'experience', kicker:'Schritt 2 von 5', title:'Wie viel <em>Erfahrung</em> hast du?', lede:'Wähle eine Antwort.'"
  ],
  [
    "key:'capital', kicker:'Schritt 3 · Deine Ausgangslage', title:'Welcher Rahmen beschreibt deine Situation <em>am besten?</em>', lede:'Eine grobe Einordnung genügt. Deine Angaben werden vertraulich behandelt.', private:true",
    "key:'capital', kicker:'Schritt 3 von 5', title:'Wie groß ist dein aktueller <em>Rahmen?</em>', lede:'Eine grobe Einordnung genügt.', private:true"
  ],
  [
    "key:'blocker', kicker:'Schritt 4 · Dein Engpass', title:'Was hält dich aktuell am stärksten <em>zurück?</em>', lede:'Damit wir den nächsten Schritt auf das eigentliche Problem ausrichten können.'",
    "key:'blocker', kicker:'Schritt 4 von 5', title:'Was hält dich gerade <em>zurück?</em>', lede:'Wähle eine Antwort.'"
  ]
];

for (const [from, to] of copyReplacements) {
  replaceRequired(from, to, 'compact question copy');
}

replaceRequired(
  "<span class=\"cf-option-copy\"><strong>'+option[1]+'</strong><small>'+option[2]+'</small></span>",
  "<span class=\"cf-option-copy\"><strong>'+option[1]+'</strong></span>",
  'compact option markup'
);

const compactContact = String.raw`  function renderContact(){
    currentStep=4;updateProgress(4);
    content.innerHTML='<div class="cf-view"><div class="cf-kicker">Schritt 5 von 5</div><h2 class="cf-title" id="cfQuestionTitle">Fast geschafft. Wie erreichen wir <em>dich?</em></h2><p class="cf-lede">Vorname, Telefonnummer und E-Mail genügen.</p><form id="cfLeadForm" novalidate><div class="cf-contact-grid"><label class="cf-field"><span class="cf-label">Vorname</span><input class="cf-input" name="name" autocomplete="given-name" maxlength="80" placeholder="Dein Vorname" required value="'+escapeHtml(state.contact.name)+'"></label><label class="cf-field"><span class="cf-label">Telefonnummer</span><input class="cf-input" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="32" placeholder="z. B. +49 170 1234567" required value="'+escapeHtml(state.contact.phone)+'"></label><label class="cf-field cf-full"><span class="cf-label">E-Mail-Adresse</span><input class="cf-input" name="email" type="email" inputmode="email" autocomplete="email" maxlength="180" placeholder="name@beispiel.de" required value="'+escapeHtml(state.contact.email)+'"></label><label class="cf-honeypot" aria-hidden="true">Website<input name="companyWebsite" tabindex="-1" autocomplete="off"></label><label class="cf-checkbox cf-full"><input name="privacy" type="checkbox" required><span>Ich stimme der Verarbeitung meiner Angaben zur Bearbeitung meiner Anfrage zu. <a href="datenschutz.html" target="_blank" rel="noopener">Datenschutz</a></span></label><div class="cf-form-error cf-full" id="cfFormError" role="alert"></div><div class="cf-field cf-full"><button class="cf-submit" type="submit">Ergebnis anzeigen →</button></div></div></form>'+backMarkup()+'</div>';
    const first=content.querySelector('input[name="name"]');if(first)setTimeout(function(){first.focus({preventScroll:true});},60);
  }`;

const contactPattern = /  function renderContact\(\)\{[\s\S]*?\n  \}\n\n  function renderLoading\(\)\{/;
if (!contactPattern.test(html)) {
  throw new Error('Cashflow funnel simplification could not replace the contact step.');
}
html = html.replace(contactPattern, `${compactContact}\n\n  function renderLoading(){`);

const compactResult = String.raw`  function renderResult(){
    const name=state.contact.name.split(/\s+/)[0]||'du';
    updateProgress(4);progressBar.style.width='100%';progressMeta.textContent='Fertig';
    content.innerHTML='<div class="cf-view cf-result-simple"><div class="cf-result-badge">✓ Anfrage angekommen</div><h2 class="cf-title" id="cfQuestionTitle" style="margin-top:14px">Danke, '+escapeHtml(name)+'.</h2><p class="cf-lede">Wie möchtest du weitermachen?</p><div class="cf-next-actions"><button class="cf-next-action" type="button" data-cf-callback><i>☎</i><span><strong>Rückruf anfordern</strong><small>Julian oder sein Team meldet sich persönlich.</small></span><b>→</b></button><a class="cf-next-action secondary" data-cf-calendar href="'+CALENDAR_URL+'" target="_blank" rel="noopener noreferrer"><i>↗</i><span><strong>Termin auswählen</strong><small>Direkt einen freien Zeitpunkt buchen.</small></span><b>→</b></a></div></div>';
    const first=content.querySelector('[data-cf-callback]');if(first)setTimeout(function(){first.focus({preventScroll:true});},60);
  }`;

const resultPattern = /  function renderResult\(\)\{[\s\S]*?\n  \}\n\n  function renderConfirmation\(\)\{/;
if (!resultPattern.test(html)) {
  throw new Error('Cashflow funnel simplification could not replace the result step.');
}
html = html.replace(resultPattern, `${compactResult}\n\n  function renderConfirmation(){`);

const loadingNeedle = "track('Lead',{content_name:'Cashflow-Plan Funnel',content_category:'Lead Funnel'},true,leadEventId);renderLoading();";
replaceRequired(
  loadingNeedle,
  "track('Lead',{content_name:'Cashflow-Plan Funnel',content_category:'Lead Funnel'},true,leadEventId);renderResult();",
  'direct result transition'
);

const compactCss = `
<style id="cashflow-funnel-simplified-v2">
/* ${marker} */
.cf-shell{
  width:min(880px,calc(100vw - 28px))!important;
  height:min(700px,calc(100dvh - 28px))!important;
  min-height:0!important;
  max-height:calc(100dvh - 28px)!important;
  grid-template-columns:minmax(0,1fr)!important;
}
.cf-side{display:none!important}
.cf-main{
  min-height:0!important;
  overflow:hidden!important;
  padding:24px 32px 26px!important;
}
.cf-content{
  flex:1 1 auto!important;
  min-height:0!important;
  height:auto!important;
  align-items:stretch!important;
  overflow:hidden!important;
  padding:14px 0 0!important;
}
.cf-view{
  width:100%!important;
  height:100%!important;
  min-height:0!important;
  max-height:none!important;
  overflow-x:hidden!important;
  overflow-y:auto!important;
  padding:4px 10px 30px 0!important;
  overscroll-behavior-y:contain;
  scrollbar-gutter:stable;
}
.cf-title{font-size:clamp(2rem,3.6vw,3.35rem)!important;line-height:1.02!important}
.cf-lede{margin:10px 0 17px!important;font-size:.88rem!important;line-height:1.5!important}
.cf-options{gap:8px!important}
.cf-option{min-height:68px!important;padding:11px 13px!important;border-radius:15px!important}
.cf-option-icon{width:36px!important;height:36px!important}
.cf-option-copy small{display:none!important}
.cf-nav-row{margin-top:12px!important}
.cf-contact-grid{gap:10px!important}
.cf-input{min-height:50px!important}
.cf-checkbox{font-size:.66rem!important;line-height:1.45!important}
.cf-submit{min-height:54px!important}
.cf-result-simple{display:flex!important;flex-direction:column!important;justify-content:center!important}
.cf-result-simple .cf-next-actions{margin-top:8px!important}
.cf-next-action{min-height:76px!important}
@media(max-width:760px){
  .cf-shell{width:100%!important;height:var(--cf-viewport-height,100dvh)!important;max-height:var(--cf-viewport-height,100dvh)!important}
  .cf-main{padding:calc(12px + env(safe-area-inset-top)) 16px calc(10px + env(safe-area-inset-bottom))!important}
  .cf-title{font-size:clamp(1.95rem,10vw,2.8rem)!important}
  .cf-view{padding:4px 3px calc(30px + env(safe-area-inset-bottom)) 0!important}
  .cf-option{min-height:64px!important}
  .cf-next-action{min-height:72px!important}
}
@media(max-height:620px) and (min-width:761px){
  .cf-main{padding:18px 26px 20px!important}
  .cf-head{min-height:42px!important}
  .cf-content{padding-top:8px!important}
  .cf-title{font-size:2.25rem!important}
  .cf-option{min-height:60px!important}
}
</style>`;

if (!html.includes('</head>')) {
  throw new Error('Cashflow funnel simplification could not find </head>.');
}
html = html.replace('</head>', `${compactCss}\n</head>`);

fs.writeFileSync(filePath, html, 'utf8');
console.log('Cashflow funnel simplified and desktop scrolling stabilized.');
