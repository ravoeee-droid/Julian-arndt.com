const fs = require('fs');
const path = require('path');

const root = __dirname;
const indexPath = path.join(root, 'dist', 'index.html');
const privacyPath = path.join(root, 'dist', 'datenschutz.html');
const calendarUrl = 'https://calendly.com/julian-defi-intelligence/30min';

if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html is missing before the cashflow funnel step.');
}

let html = fs.readFileSync(indexPath, 'utf8');

function replaceOnce(searchValue, replacement, label) {
  if (!html.includes(searchValue)) throw new Error(`Cashflow funnel could not replace: ${label}`);
  html = html.replace(searchValue, () => replacement);
}

function replaceRegexOnce(regex, replacement, label) {
  const matches = html.match(regex);
  if (!matches || matches.length !== 1) {
    throw new Error(`Cashflow funnel expected exactly one match for ${label}, found ${matches ? matches.length : 0}.`);
  }
  html = html.replace(regex, () => replacement);
}

function setAttribute(tag, name, value) {
  const attr = new RegExp(`\\s${name}=("[^"]*"|'[^']*')`, 'i');
  if (attr.test(tag)) return tag.replace(attr, ` ${name}="${value}"`);
  return tag.replace(/>$/, ` ${name}="${value}">`);
}

function removeAttribute(tag, name) {
  return tag.replace(new RegExp(`\\s${name}=("[^"]*"|'[^']*')`, 'gi'), '');
}

function replaceClasses(tag) {
  const classAttr = /\sclass=("([^"]*)"|'([^']*)')/i;
  const match = tag.match(classAttr);
  const classes = (match ? (match[2] || match[3] || '') : '')
    .split(/\s+/)
    .filter(Boolean)
    .filter((className) => !['calendar-track', 'no-unlock', 'booking-trigger'].includes(className));
  if (!classes.includes('cashflow-funnel-trigger')) classes.push('cashflow-funnel-trigger');
  if (!match) return tag.replace(/>$/, ` class="${classes.join(' ')}">`);
  return tag.replace(classAttr, ` class="${classes.join(' ')}"`);
}

const oldBookingExperience = /<div[^>]*id="bookingExperience"[^>]*>[\s\S]*?<\/script>\s*(?=<div[^>]*id="cookieConsent")/;
replaceRegexOnce(oldBookingExperience, '', 'obsolete booking animation');

const inlineSection = `
<section class="section calendar-section cf-inline-section" id="termin">
  <div class="wrap">
    <div class="cf-inline-card sr">
      <div class="cf-inline-copy">
        <span class="s-tag">Dein persönlicher nächster Schritt</span>
        <h2 class="s-h2">Starte jetzt deinen <em>Cashflow-Plan.</em></h2>
        <p>Beantworte fünf kurze Fragen und erhalte eine persönliche Einordnung deiner aktuellen Ausgangslage. Danach entscheidest du selbst, ob du zurückgerufen werden oder direkt einen Termin auswählen möchtest.</p>
        <div class="cf-inline-trust">
          <span>✓ Nur 60 Sekunden</span>
          <span>✓ Kostenlos und unverbindlich</span>
          <span>✓ Keine Anlageberatung</span>
        </div>
        <a class="btn-main cashflow-funnel-trigger" href="#cashflow-funnel" aria-haspopup="dialog">Meinen Cashflow-Plan starten</a>
      </div>
      <div class="cf-inline-visual" aria-hidden="true">
        <div class="cf-inline-ring"><strong>5</strong><span>kurze<br>Schritte</span></div>
        <div class="cf-inline-line"><i></i><b>Dein Ziel</b><span>01</span></div>
        <div class="cf-inline-line"><i></i><b>Deine Ausgangslage</b><span>02</span></div>
        <div class="cf-inline-line"><i></i><b>Dein nächster Schritt</b><span>03</span></div>
      </div>
    </div>
  </div>
</section>
`;

replaceRegexOnce(
  /<section class="section calendar-section" id="termin">[\s\S]*?<\/section>\s*(?=<section class="section results")/,
  `${inlineSection}\n`,
  'embedded calendar section'
);

const ctaLabels = new Map([
  ['Kostenlose Analyse starten', 'Meinen Cashflow-Plan starten'],
  ['Kostenlose Analyse sichern', 'Meinen Cashflow-Plan starten'],
  ['Kostenlose Prozess-Analyse starten', 'Cashflow-Plan starten'],
  ['Kostenlose Analyse mit Julian buchen', 'Cashflow-Plan mit Julian starten'],
  ['Kalender separat öffnen', 'Meinen Cashflow-Plan starten'],
  ['Jetzt Termin auswählen', 'Meinen Cashflow-Plan starten']
]);

let rewrittenCtas = 0;
html = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (anchor) => {
  const startTagMatch = anchor.match(/^<a\b[^>]*>/i);
  if (!startTagMatch) return anchor;
  const startTag = startTagMatch[0];
  const isTrackedCalendar = /\bcalendar-track\b/i.test(startTag);
  const isCalendarLink = /href=("|')[^"']*calendar\.app\.google/i.test(startTag);
  if (!isTrackedCalendar && !isCalendarLink) return anchor;

  let updatedTag = removeAttribute(startTag, 'target');
  updatedTag = removeAttribute(updatedTag, 'rel');
  updatedTag = setAttribute(updatedTag, 'href', '#cashflow-funnel');
  updatedTag = setAttribute(updatedTag, 'aria-haspopup', 'dialog');
  updatedTag = replaceClasses(updatedTag);

  const inner = anchor.slice(startTag.length, -4);
  const plainText = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const updatedInner = ctaLabels.get(plainText) || inner;
  rewrittenCtas += 1;
  return `${updatedTag}${updatedInner}</a>`;
});

if (rewrittenCtas < 5) throw new Error(`Expected at least 5 cashflow CTA links, rewrote ${rewrittenCtas}.`);

if (html.includes('In der kostenlosen Analyse klären wir dein Ziel und prüfen, welcher realistische Zeitrahmen für dich möglich ist.')) {
  html = html.replace(
    'In der kostenlosen Analyse klären wir dein Ziel und prüfen, welcher realistische Zeitrahmen für dich möglich ist.',
    'Beantworte fünf kurze Fragen und finde heraus, welcher nächste Schritt zu deiner aktuellen Situation passt.'
  );
}
html = html.replace('<div class="value-chip">Private Analyse</div>', '<div class="value-chip">Persönlicher Cashflow-Plan</div>');

const funnelCss = `
/* PREMIUM CASHFLOW PLAN FUNNEL */
.cf-inline-section{overflow:hidden;background:radial-gradient(circle at 82% 20%,rgba(198,162,42,.12),transparent 32%),linear-gradient(180deg,#080808,#050505)}
.cf-inline-card{position:relative;display:grid;grid-template-columns:1.08fr .92fr;gap:46px;align-items:center;padding:clamp(30px,5vw,64px);overflow:hidden;border:1px solid rgba(198,162,42,.22);border-radius:36px;background:linear-gradient(145deg,rgba(20,20,20,.98),rgba(7,7,7,.98));box-shadow:0 40px 130px rgba(0,0,0,.42)}
.cf-inline-card::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(198,162,42,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(198,162,42,.035) 1px,transparent 1px);background-size:54px 54px;mask-image:linear-gradient(90deg,transparent,#000);pointer-events:none}
.cf-inline-copy{position:relative;z-index:2}.cf-inline-copy p{max-width:700px;margin:24px 0;color:var(--muted);font-size:1rem;line-height:1.85}.cf-inline-trust{display:flex;flex-wrap:wrap;gap:9px;margin:0 0 28px}.cf-inline-trust span{padding:8px 12px;border:1px solid rgba(242,238,229,.09);border-radius:999px;background:rgba(255,255,255,.025);color:rgba(242,238,229,.68);font-size:.72rem}.cf-inline-trust span::first-letter{color:var(--gold)}
.cf-inline-visual{position:relative;z-index:2;min-height:370px;padding:36px;border:1px solid rgba(198,162,42,.14);border-radius:30px;background:radial-gradient(circle at 50% 5%,rgba(198,162,42,.12),transparent 36%),rgba(255,255,255,.018)}
.cf-inline-ring{width:150px;height:150px;margin:0 auto 28px;display:grid;place-content:center;text-align:center;border-radius:50%;background:radial-gradient(circle at center,#111 54%,transparent 55%),conic-gradient(var(--gold) 0 82%,rgba(242,238,229,.08) 82%);box-shadow:0 0 70px rgba(198,162,42,.11)}
.cf-inline-ring strong{font-family:'Cormorant Garamond',serif;font-size:3.8rem;line-height:.7;color:var(--gold2)}.cf-inline-ring span{margin-top:12px;color:var(--soft);font-size:.66rem;line-height:1.35;letter-spacing:.12em;text-transform:uppercase}
.cf-inline-line{display:grid;grid-template-columns:18px 1fr auto;gap:12px;align-items:center;padding:13px 0;border-top:1px solid rgba(242,238,229,.07)}.cf-inline-line i{width:9px;height:9px;border-radius:50%;background:var(--gold);box-shadow:0 0 20px rgba(198,162,42,.55)}.cf-inline-line b{font-size:.8rem}.cf-inline-line span{color:var(--gold);font-size:.67rem;letter-spacing:.14em}

.cf-funnel{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.82);backdrop-filter:blur(18px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .28s ease,visibility .28s ease}
.cf-funnel.is-open{opacity:1;visibility:visible;pointer-events:auto}.cf-funnel::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 78% 18%,rgba(198,162,42,.16),transparent 30%),radial-gradient(circle at 8% 88%,rgba(198,162,42,.08),transparent 28%);pointer-events:none}
.cf-shell{position:relative;width:min(1120px,100%);height:min(760px,calc(100svh - 36px));min-height:620px;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(300px,.62fr);overflow:hidden;border:1px solid rgba(198,162,42,.24);border-radius:34px;background:#080808;box-shadow:0 44px 180px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.025) inset;transform:translateY(16px) scale(.985);transition:transform .38s cubic-bezier(.16,1,.3,1)}
.cf-funnel.is-open .cf-shell{transform:translateY(0) scale(1)}.cf-main{position:relative;display:flex;min-width:0;flex-direction:column;padding:28px 42px 36px;background:radial-gradient(circle at 10% 0%,rgba(198,162,42,.07),transparent 34%),#090909}
.cf-head{display:grid;grid-template-columns:auto minmax(120px,1fr) auto;gap:24px;align-items:center;min-height:48px}.cf-brand{display:flex;align-items:center;gap:10px;color:var(--gold2);font-size:.68rem;font-weight:850;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}.cf-brand img{width:30px;height:30px;object-fit:contain}.cf-progress-wrap{display:flex;align-items:center;gap:12px}.cf-progress-meta{min-width:76px;color:var(--soft);font-size:.65rem;letter-spacing:.11em;text-transform:uppercase;text-align:right}.cf-progress{height:4px;flex:1;overflow:hidden;border-radius:999px;background:rgba(242,238,229,.08)}.cf-progress-bar{display:block;width:20%;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--gold3),var(--gold2));box-shadow:0 0 18px rgba(198,162,42,.35);transition:width .45s cubic-bezier(.16,1,.3,1)}
.cf-close{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(242,238,229,.12);border-radius:50%;background:rgba(255,255,255,.025);color:var(--cream);font-size:1.35rem;transition:.2s}.cf-close:hover,.cf-close:focus-visible{border-color:var(--gold);color:var(--gold);outline:none;transform:rotate(3deg)}
.cf-content{flex:1;display:flex;min-height:0;align-items:center;padding:24px 0 8px}.cf-view{width:100%;max-height:100%;overflow-y:auto;padding:6px 6px 12px 0;scrollbar-width:thin;scrollbar-color:rgba(198,162,42,.35) transparent;animation:cfViewIn .42s cubic-bezier(.16,1,.3,1)}@keyframes cfViewIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.cf-kicker{display:flex;align-items:center;gap:9px;margin-bottom:13px;color:var(--gold);font-size:.68rem;font-weight:850;letter-spacing:.15em;text-transform:uppercase}.cf-kicker::before{content:"";width:26px;height:1px;background:var(--gold)}.cf-title{max-width:740px;margin:0;font-family:'Cormorant Garamond',serif;font-size:clamp(2.35rem,4.25vw,4.25rem);font-weight:500;line-height:1.02;letter-spacing:-.035em;text-wrap:balance}.cf-title em{color:var(--gold2);font-style:italic}.cf-lede{max-width:670px;margin:16px 0 24px;color:var(--muted);font-size:.94rem;line-height:1.72}.cf-private{display:inline-flex;align-items:center;gap:7px;margin-top:14px;color:var(--soft);font-size:.7rem}.cf-private svg{width:14px;color:var(--gold)}
.cf-options{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:760px}.cf-option{position:relative;min-height:92px;display:grid;grid-template-columns:42px 1fr 24px;gap:12px;align-items:center;padding:15px 16px;border:1px solid rgba(242,238,229,.09);border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.038),rgba(255,255,255,.016));color:var(--cream);text-align:left;transition:transform .2s,border-color .2s,background .2s,box-shadow .2s}.cf-option:hover,.cf-option:focus-visible{transform:translateY(-2px);border-color:rgba(198,162,42,.46);background:rgba(198,162,42,.055);box-shadow:0 16px 42px rgba(0,0,0,.2);outline:none}.cf-option.is-selected{border-color:var(--gold);background:rgba(198,162,42,.09);box-shadow:0 0 0 1px rgba(198,162,42,.1) inset}.cf-option-icon{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(198,162,42,.17);border-radius:13px;background:rgba(198,162,42,.06);color:var(--gold2);font-size:1.05rem}.cf-option-copy strong{display:block;font-size:.82rem;line-height:1.35}.cf-option-copy small{display:block;margin-top:4px;color:var(--soft);font-size:.68rem;line-height:1.42}.cf-option-check{width:20px;height:20px;display:grid;place-items:center;border:1px solid rgba(242,238,229,.15);border-radius:50%;color:transparent;font-size:.7rem;transition:.2s}.cf-option.is-selected .cf-option-check{border-color:var(--gold);background:var(--gold);color:#080808;transform:scale(1.08)}
.cf-nav-row{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:19px}.cf-back{display:inline-flex;align-items:center;gap:8px;padding:8px 0;border:0;background:none;color:var(--soft);font:inherit;font-size:.74rem;font-weight:750}.cf-back:hover,.cf-back:focus-visible{color:var(--gold);outline:none}.cf-saved{color:rgba(242,238,229,.38);font-size:.64rem;letter-spacing:.08em;text-transform:uppercase}
.cf-side{position:relative;overflow:hidden;padding:42px 34px;display:flex;flex-direction:column;justify-content:space-between;border-left:1px solid rgba(198,162,42,.12);background:radial-gradient(circle at 50% 10%,rgba(198,162,42,.13),transparent 32%),linear-gradient(165deg,#111,#070707)}.cf-side::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(198,162,42,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(198,162,42,.035) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(#000,transparent 80%);pointer-events:none}.cf-orbit{position:relative;width:220px;height:220px;margin:22px auto 32px;display:grid;place-items:center;border:1px solid rgba(198,162,42,.12);border-radius:50%;animation:cfFloat 5s ease-in-out infinite}.cf-orbit::before,.cf-orbit::after{content:"";position:absolute;border:1px solid rgba(198,162,42,.13);border-radius:50%}.cf-orbit::before{inset:20px}.cf-orbit::after{inset:44px}.cf-coin{position:relative;z-index:2;width:106px;height:106px;display:grid;place-items:center;border:1px solid rgba(255,232,158,.46);border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff1a6,#ddb84e 27%,#9c7416 62%,#3f2b05);box-shadow:0 24px 60px rgba(0,0,0,.45),0 0 48px rgba(198,162,42,.18),inset -12px -13px 24px rgba(0,0,0,.33);color:#241704;font-size:3.2rem;font-weight:900}.cf-orbit-dot{position:absolute;top:13px;left:50%;width:10px;height:10px;border-radius:50%;background:var(--gold2);box-shadow:0 0 20px var(--gold);transform-origin:0 97px;animation:cfOrbit 8s linear infinite}@keyframes cfOrbit{to{transform:rotate(360deg)}}@keyframes cfFloat{50%{transform:translateY(-8px)}}
.cf-side-copy{position:relative;z-index:2}.cf-side-copy span{color:var(--gold);font-size:.65rem;font-weight:850;letter-spacing:.14em;text-transform:uppercase}.cf-side-copy h3{margin:10px 0 12px;font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:500;line-height:1.1}.cf-side-copy p{color:var(--muted);font-size:.78rem;line-height:1.7}.cf-side-points{position:relative;z-index:2;display:grid;gap:11px;margin-top:24px}.cf-side-point{display:grid;grid-template-columns:24px 1fr;gap:10px;align-items:start;color:rgba(242,238,229,.68);font-size:.72rem}.cf-side-point i{width:22px;height:22px;display:grid;place-items:center;border:1px solid rgba(198,162,42,.22);border-radius:50%;color:var(--gold);font-style:normal;font-size:.65rem}
.cf-contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:760px}.cf-field{display:grid;gap:7px}.cf-field.cf-full{grid-column:1/-1}.cf-label{color:rgba(242,238,229,.72);font-size:.7rem;font-weight:750}.cf-input{width:100%;min-height:54px;padding:0 16px;border:1px solid rgba(242,238,229,.11);border-radius:14px;background:rgba(255,255,255,.035);color:var(--cream);font:inherit;font-size:.86rem;outline:none;transition:.2s}.cf-input::placeholder{color:rgba(242,238,229,.3)}.cf-input:hover{border-color:rgba(198,162,42,.28)}.cf-input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(198,162,42,.08)}.cf-input[aria-invalid="true"]{border-color:#d96f61}.cf-checkbox{display:grid;grid-template-columns:20px 1fr;gap:10px;align-items:start;margin-top:4px;cursor:pointer;color:var(--muted);font-size:.68rem;line-height:1.55}.cf-checkbox input{width:18px;height:18px;margin-top:1px;accent-color:var(--gold)}.cf-checkbox a{color:var(--gold);text-decoration:underline;text-underline-offset:3px}.cf-form-error{display:none;padding:11px 13px;border:1px solid rgba(217,111,97,.3);border-radius:12px;background:rgba(217,111,97,.07);color:#f3b3aa;font-size:.72rem}.cf-form-error.is-visible{display:block}.cf-submit{min-height:56px;width:100%;border:0;border-radius:999px;background:linear-gradient(100deg,var(--gold3),var(--gold2));box-shadow:0 18px 50px rgba(198,162,42,.2);color:#080808;font:inherit;font-size:.74rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;transition:.2s}.cf-submit:hover,.cf-submit:focus-visible{transform:translateY(-2px);box-shadow:0 23px 65px rgba(198,162,42,.3);outline:none}.cf-submit:disabled{cursor:wait;opacity:.65;transform:none}.cf-honeypot{position:absolute!important;left:-99999px!important;width:1px!important;height:1px!important;overflow:hidden!important}
.cf-loader{text-align:center}.cf-loader-orb{position:relative;width:124px;height:124px;margin:0 auto 28px;display:grid;place-items:center;border-radius:50%;background:conic-gradient(from 0deg,transparent,var(--gold2),transparent 72%);animation:cfSpin 1.3s linear infinite}.cf-loader-orb::before{content:"";position:absolute;inset:5px;border-radius:50%;background:#0a0a0a}.cf-loader-orb::after{content:"";position:relative;width:58px;height:58px;border:1px solid rgba(198,162,42,.2);border-radius:50%;background:radial-gradient(circle,rgba(198,162,42,.18),transparent 65%);box-shadow:0 0 40px rgba(198,162,42,.12)}@keyframes cfSpin{to{transform:rotate(360deg)}}.cf-loader-list{max-width:470px;margin:24px auto 0;display:grid;gap:9px;text-align:left}.cf-loader-item{display:grid;grid-template-columns:24px 1fr;gap:10px;align-items:center;padding:11px 13px;border:1px solid rgba(242,238,229,.07);border-radius:12px;color:var(--soft);font-size:.72rem;transition:.3s}.cf-loader-item i{width:22px;height:22px;display:grid;place-items:center;border:1px solid rgba(242,238,229,.13);border-radius:50%;font-style:normal;font-size:.65rem}.cf-loader-item.is-done{border-color:rgba(198,162,42,.23);color:var(--cream);background:rgba(198,162,42,.04)}.cf-loader-item.is-done i{border-color:var(--gold);background:var(--gold);color:#080808}
.cf-result-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid rgba(198,162,42,.24);border-radius:999px;background:rgba(198,162,42,.06);color:var(--gold2);font-size:.66rem;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.cf-result-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;max-width:760px;margin:22px 0}.cf-result-chip{padding:13px;border:1px solid rgba(242,238,229,.08);border-radius:14px;background:rgba(255,255,255,.025)}.cf-result-chip span{display:block;margin-bottom:5px;color:var(--soft);font-size:.59rem;letter-spacing:.1em;text-transform:uppercase}.cf-result-chip strong{display:block;font-size:.72rem;line-height:1.4}.cf-result-callout{max-width:760px;padding:16px 18px;border-left:2px solid var(--gold);border-radius:0 14px 14px 0;background:rgba(198,162,42,.055);color:var(--muted);font-size:.78rem;line-height:1.65}.cf-choice-title{margin:21px 0 10px;font-size:.8rem}.cf-next-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:760px}.cf-next-action{min-height:80px;display:grid;grid-template-columns:42px 1fr auto;gap:12px;align-items:center;padding:14px;border:1px solid rgba(198,162,42,.24);border-radius:16px;background:rgba(198,162,42,.06);color:var(--cream);text-align:left;transition:.2s}.cf-next-action:hover,.cf-next-action:focus-visible{transform:translateY(-2px);border-color:var(--gold);background:rgba(198,162,42,.1);outline:none}.cf-next-action.secondary{border-color:rgba(242,238,229,.11);background:rgba(255,255,255,.025)}.cf-next-action i{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:var(--gold);color:#080808;font-style:normal}.cf-next-action.secondary i{background:rgba(242,238,229,.08);color:var(--gold)}.cf-next-action strong{display:block;font-size:.77rem}.cf-next-action small{display:block;margin-top:3px;color:var(--soft);font-size:.62rem;line-height:1.35}.cf-next-action b{color:var(--gold);font-size:1rem}.cf-confirmation{max-width:720px;padding:22px;border:1px solid rgba(198,162,42,.25);border-radius:18px;background:rgba(198,162,42,.07)}.cf-confirmation h3{margin:0 0 7px;font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:500}.cf-confirmation p{color:var(--muted);font-size:.8rem}.cf-direct-fallback{display:inline-block;margin-top:10px;color:var(--gold);font-size:.72rem;text-decoration:underline;text-underline-offset:3px}
.cf-toast{position:absolute;left:50%;bottom:22px;z-index:5;max-width:calc(100% - 40px);padding:10px 14px;border:1px solid rgba(217,111,97,.3);border-radius:999px;background:#26110f;color:#f3b3aa;font-size:.7rem;opacity:0;pointer-events:none;transform:translate(-50%,10px);transition:.25s}.cf-toast.is-visible{opacity:1;transform:translate(-50%,0)}
body.cf-lock{overflow:hidden!important}.cashflow-funnel-trigger{position:relative}.cashflow-funnel-trigger::after{content:"→";margin-left:8px;transition:transform .2s}.cashflow-funnel-trigger:hover::after{transform:translateX(3px)}
@media(max-width:900px){.cf-shell{grid-template-columns:1fr}.cf-side{display:none}.cf-main{padding:24px 30px 30px}.cf-inline-card{grid-template-columns:1fr}.cf-inline-visual{min-height:auto}.cf-inline-ring{width:120px;height:120px}.cf-inline-line{max-width:480px;margin:auto}}
@media(max-width:620px){.cf-funnel{padding:0;place-items:stretch;background:#080808}.cf-shell{width:100%;height:100svh;min-height:0;border:0;border-radius:0}.cf-main{padding:16px 18px max(22px,env(safe-area-inset-bottom))}.cf-head{grid-template-columns:1fr auto;gap:12px}.cf-brand{font-size:.58rem}.cf-progress-wrap{grid-column:1/-1;grid-row:2;gap:9px}.cf-progress-meta{min-width:58px;font-size:.56rem}.cf-close{grid-column:2;grid-row:1;width:38px;height:38px}.cf-content{padding-top:8px;align-items:flex-start}.cf-view{padding-top:12px}.cf-kicker{font-size:.58rem;margin-bottom:10px}.cf-title{font-size:clamp(2.15rem,11vw,3.15rem)}.cf-lede{margin:12px 0 17px;font-size:.82rem;line-height:1.58}.cf-options{grid-template-columns:1fr;gap:8px}.cf-option{min-height:76px;padding:12px 13px}.cf-option-copy small{font-size:.64rem}.cf-nav-row{margin-top:12px}.cf-contact-grid{grid-template-columns:1fr;gap:9px}.cf-field.cf-full{grid-column:auto}.cf-input{min-height:49px}.cf-checkbox{font-size:.64rem}.cf-submit{min-height:52px}.cf-result-grid{grid-template-columns:1fr;gap:7px;margin:14px 0}.cf-result-chip{padding:10px 12px}.cf-result-callout{padding:13px 14px}.cf-choice-title{margin-top:14px}.cf-next-actions{grid-template-columns:1fr;gap:8px}.cf-next-action{min-height:69px;padding:11px}.cf-inline-section{padding-left:18px;padding-right:18px}.cf-inline-card{padding:28px 20px;border-radius:24px}.cf-inline-visual{padding:22px;border-radius:20px}.cf-inline-copy p{font-size:.88rem}.cf-inline-trust{display:grid}.mobile-sticky-cta.cashflow-funnel-trigger{padding-right:22px}.mobile-sticky-cta.cashflow-funnel-trigger::after{margin-left:6px}}
@media(max-height:680px) and (min-width:621px){.cf-shell{height:calc(100svh - 20px);min-height:0}.cf-main{padding-top:18px;padding-bottom:18px}.cf-content{padding-top:8px}.cf-title{font-size:2.55rem}.cf-lede{margin:10px 0 15px}.cf-option{min-height:72px}.cf-orbit{width:160px;height:160px}.cf-coin{width:80px;height:80px;font-size:2.5rem}.cf-side{padding-top:24px;padding-bottom:24px}}
@media(prefers-reduced-motion:reduce){.cf-funnel,.cf-shell,.cf-view,.cf-option,.cf-loader-orb,.cf-orbit,.cf-orbit-dot,.cashflow-funnel-trigger::after{animation:none!important;transition-duration:.01ms!important}}
`;

if (!html.includes('</style>')) throw new Error('Main stylesheet closing tag not found.');
html = html.replace('</style>', `${funnelCss}\n</style>`);

const funnelMarkup = String.raw`
<div class="cf-funnel" id="cashflowFunnel" role="dialog" aria-modal="true" aria-labelledby="cfQuestionTitle" aria-hidden="true">
  <div class="cf-shell">
    <div class="cf-main">
      <header class="cf-head">
        <div class="cf-brand"><img src="assets/defi-premium-signet.webp" width="30" height="30" alt="">DeFi Intelligence</div>
        <div class="cf-progress-wrap">
          <div class="cf-progress" role="progressbar" aria-label="Fortschritt" aria-valuemin="1" aria-valuemax="5" aria-valuenow="1"><span class="cf-progress-bar"></span></div>
          <div class="cf-progress-meta">1 von 5</div>
        </div>
        <button class="cf-close" type="button" aria-label="Cashflow-Plan schließen">×</button>
      </header>
      <div class="cf-content" id="cfContent"></div>
      <div class="cf-toast" id="cfToast" role="status" aria-live="polite"></div>
    </div>
    <aside class="cf-side" aria-hidden="true">
      <div>
        <div class="cf-orbit"><div class="cf-orbit-dot"></div><div class="cf-coin">₿</div></div>
        <div class="cf-side-copy"><span>Dein Cashflow-Plan</span><h3>Klarheit beginnt mit deiner Ausgangslage.</h3><p>Kein Standardformular, sondern fünf gezielte Fragen für einen sinnvollen persönlichen nächsten Schritt.</p></div>
      </div>
      <div class="cf-side-points">
        <div class="cf-side-point"><i>✓</i><span>Persönliche Einordnung statt pauschaler Empfehlung</span></div>
        <div class="cf-side-point"><i>✓</i><span>Du entscheidest selbst über Rückruf oder Termin</span></div>
        <div class="cf-side-point"><i>✓</i><span>Kostenlos, unverbindlich und ohne Gewinnversprechen</span></div>
      </div>
    </aside>
  </div>
</div>
<script id="cashflow-funnel-script">
(function(){
  'use strict';
  const CALENDAR_URL = ${JSON.stringify(calendarUrl)};
  const CONSENT_KEY = 'defi_cookie_consent_v1';
  const STATE_KEY = 'defi_cashflow_funnel_v1';
  const ATTRIBUTION_KEY = 'defi_cashflow_attribution_v1';
  const modal = document.getElementById('cashflowFunnel');
  const content = document.getElementById('cfContent');
  if(!modal || !content) return;

  const closeButton = modal.querySelector('.cf-close');
  const progress = modal.querySelector('.cf-progress');
  const progressBar = modal.querySelector('.cf-progress-bar');
  const progressMeta = modal.querySelector('.cf-progress-meta');
  const toast = document.getElementById('cfToast');
  let currentStep = 0;
  let lastFocused = null;
  let leadId = '';
  let leadEventId = '';
  let submitting = false;
  let startedAt = Date.now();
  let toastTimer = null;
  const state = { answers: {}, contact: { name:'', email:'', phone:'' } };

  const steps = [
    {
      key:'goal', kicker:'Schritt 1 · Dein Ziel', title:'Was möchtest du mit deiner <em>Investmentstrategie</em> erreichen?', lede:'Wähle die Antwort, die deinem wichtigsten Ziel heute am nächsten kommt.',
      options:[
        ['cashflow','Zusätzlichen Cashflow aufbauen','Eine zusätzliche Einkommensquelle strukturiert entwickeln.','↗'],
        ['structure','Kapital klarer strukturieren','Entscheidungen nach einem nachvollziehbaren System treffen.','◎'],
        ['improve','Bestehende Strategie verbessern','Mehr Klarheit, Regeln und Risikobewusstsein gewinnen.','＋'],
        ['orientation','Möglichkeiten erst verstehen','Ohne Druck herausfinden, welcher Weg sinnvoll sein könnte.','◇']
      ]
    },
    {
      key:'experience', kicker:'Schritt 2 · Deine Erfahrung', title:'Wo stehst du <em>heute?</em>', lede:'Damit dein nächster Schritt weder zu einfach noch unnötig kompliziert wird.',
      options:[
        ['starter','Ich starte gerade erst','Ich habe wenig oder noch keine praktische Erfahrung.','01'],
        ['invested','Ich habe bereits investiert','Ich kenne die Grundlagen, mir fehlt aber ein klares System.','02'],
        ['active','Ich bin regelmäßig aktiv','Ich möchte meinen bestehenden Prozess professioneller strukturieren.','03']
      ]
    },
    {
      key:'capital', kicker:'Schritt 3 · Deine Ausgangslage', title:'Welcher Rahmen beschreibt deine Situation <em>am besten?</em>', lede:'Eine grobe Einordnung genügt. Deine Angaben werden vertraulich behandelt.', private:true,
      options:[
        ['under-5k','Unter 5.000 €','Ich möchte mit einer überschaubaren Ausgangslage starten.','<'],
        ['5k-20k','5.000 bis 20.000 €','Ich habe bereits einen ersten finanziellen Rahmen.','5'],
        ['20k-50k','20.000 bis 50.000 €','Ich suche eine klarere Struktur für vorhandenes Kapital.','20'],
        ['over-50k','Über 50.000 €','Risikomanagement und ein sauberer Prozess sind besonders wichtig.','50'],
        ['monthly','Monatlicher Spielraum','Ich möchte schrittweise über mein laufendes Einkommen starten.','↻']
      ]
    },
    {
      key:'blocker', kicker:'Schritt 4 · Dein Engpass', title:'Was hält dich aktuell am stärksten <em>zurück?</em>', lede:'Damit wir den nächsten Schritt auf das eigentliche Problem ausrichten können.',
      options:[
        ['information','Zu viele Informationen','Ich weiß nicht, was wirklich relevant und seriös ist.','≋'],
        ['strategy','Keine klare Strategie','Mir fehlt ein wiederholbarer Prozess für Entscheidungen.','⌁'],
        ['risk','Unsicherheit beim Risiko','Ich möchte Chancen und Verlustrisiken besser einordnen.','◈'],
        ['time','Zu wenig Zeit','Die Strategie muss realistisch in meinen Alltag passen.','◷']
      ]
    }
  ];

  const labels = {};
  steps.forEach(function(step){
    labels[step.key] = {};
    step.options.forEach(function(option){ labels[step.key][option[0]] = option[1]; });
  });

  function escapeHtml(value){
    return String(value || '').replace(/[&<>'"]/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char];});
  }

  function readJson(storage,key){ try{return JSON.parse(storage.getItem(key)||'null');}catch(error){return null;} }
  function marketingConsent(){ const consent=readJson(localStorage,CONSENT_KEY);return !!(consent&&consent.marketing); }
  function getCookie(name){ const match=document.cookie.match(new RegExp('(?:^|; )'+name.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&')+'=([^;]*)'));return match?decodeURIComponent(match[1]):''; }
  function eventId(prefix){ return prefix+'_'+(window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)); }

  function captureAttribution(){
    const existing=readJson(sessionStorage,ATTRIBUTION_KEY)||{};
    const query=new URLSearchParams(location.search);
    const fbclid=query.get('fbclid')||existing.fbclid||'';
    const attribution={
      utmSource:query.get('utm_source')||existing.utmSource||'',utmMedium:query.get('utm_medium')||existing.utmMedium||'',utmCampaign:query.get('utm_campaign')||existing.utmCampaign||'',utmContent:query.get('utm_content')||existing.utmContent||'',utmTerm:query.get('utm_term')||existing.utmTerm||'',
      fbclid:fbclid,fbp:getCookie('_fbp')||existing.fbp||'',fbc:getCookie('_fbc')||existing.fbc||(fbclid?'fb.1.'+Date.now()+'.'+fbclid:''),landingPage:existing.landingPage||location.href,referrer:existing.referrer||document.referrer||''
    };
    try{sessionStorage.setItem(ATTRIBUTION_KEY,JSON.stringify(attribution));}catch(error){}
    return attribution;
  }

  function track(name,params,standard,eventID){
    const safeParams=Object.assign({funnel_name:'Cashflow-Plan'},params||{});
    if(marketingConsent()&&window.fbq){
      try{
        if(standard){ if(eventID) window.fbq('track',name,safeParams,{eventID:eventID}); else window.fbq('track',name,safeParams); }
        else window.fbq('trackCustom',name,safeParams);
      }catch(error){}
    }
    if(window.clarity){ try{window.clarity('event','Cashflow_'+name);}catch(error){} }
    window.dispatchEvent(new CustomEvent('cashflowFunnelEvent',{detail:{name:name,params:safeParams}}));
  }

  function fireViewContent(){
    if(!marketingConsent()||!window.fbq) return;
    try{ if(sessionStorage.getItem('cf_view_content_sent')) return;sessionStorage.setItem('cf_view_content_sent','1'); }catch(error){}
    track('ViewContent',{content_name:'Cashflow-Plan Landingpage',content_category:'Lead Funnel'},true);
  }

  function persistAnswers(){ try{sessionStorage.setItem(STATE_KEY,JSON.stringify({answers:state.answers}));}catch(error){} }
  function restoreAnswers(){ const saved=readJson(sessionStorage,STATE_KEY);if(saved&&saved.answers)state.answers=saved.answers; }

  function updateProgress(step){
    const display=Math.min(step+1,5);const percent=(display/5)*100;
    progress.setAttribute('aria-valuenow',String(display));progressBar.style.width=percent+'%';progressMeta.textContent=display+' von 5';
  }

  function backMarkup(){
    return '<div class="cf-nav-row"><button class="cf-back" type="button" data-cf-back>← Zurück</button><span class="cf-saved">Auswahl gespeichert</span></div>';
  }

  function renderQuestion(index){
    const step=steps[index];currentStep=index;updateProgress(index);
    const options=step.options.map(function(option){const selected=state.answers[step.key]===option[0];return '<button class="cf-option'+(selected?' is-selected':'')+'" type="button" data-cf-option="'+option[0]+'"><span class="cf-option-icon">'+option[3]+'</span><span class="cf-option-copy"><strong>'+option[1]+'</strong><small>'+option[2]+'</small></span><span class="cf-option-check">✓</span></button>';}).join('');
    content.innerHTML='<div class="cf-view"><div class="cf-kicker">'+step.kicker+'</div><h2 class="cf-title" id="cfQuestionTitle">'+step.title+'</h2><p class="cf-lede">'+step.lede+'</p><div class="cf-options">'+options+'</div>'+(step.private?'<div class="cf-private">🔒 Nur zur persönlichen Einordnung – keine Veröffentlichung deiner Angaben.</div>':'')+(index>0?backMarkup():'<div class="cf-nav-row"><span></span><span class="cf-saved">Dauert insgesamt etwa 60 Sekunden</span></div>')+'</div>';
    const first=content.querySelector('.cf-option');if(first)setTimeout(function(){first.focus({preventScroll:true});},60);
  }

  function renderContact(){
    currentStep=4;updateProgress(4);
    content.innerHTML='<div class="cf-view"><div class="cf-kicker">Schritt 5 · Dein persönlicher Plan</div><h2 class="cf-title" id="cfQuestionTitle">Wohin dürfen wir deinen nächsten Schritt <em>schicken?</em></h2><p class="cf-lede">Deine Angaben werden nur zur Bearbeitung deiner Anfrage und zur persönlichen Kontaktaufnahme genutzt.</p><form id="cfLeadForm" novalidate><div class="cf-contact-grid"><label class="cf-field"><span class="cf-label">Vorname</span><input class="cf-input" name="name" autocomplete="given-name" maxlength="80" placeholder="Dein Vorname" required value="'+escapeHtml(state.contact.name)+'"></label><label class="cf-field"><span class="cf-label">Telefonnummer</span><input class="cf-input" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="32" placeholder="z. B. +49 170 1234567" required value="'+escapeHtml(state.contact.phone)+'"></label><label class="cf-field cf-full"><span class="cf-label">E-Mail-Adresse</span><input class="cf-input" name="email" type="email" inputmode="email" autocomplete="email" maxlength="180" placeholder="name@beispiel.de" required value="'+escapeHtml(state.contact.email)+'"></label><label class="cf-honeypot" aria-hidden="true">Website<input name="companyWebsite" tabindex="-1" autocomplete="off"></label><label class="cf-checkbox cf-full"><input name="privacy" type="checkbox" required><span>Ich habe die <a href="datenschutz.html" target="_blank" rel="noopener">Datenschutzerklärung</a> gelesen und bin mit der Verarbeitung meiner Angaben zur Bearbeitung meiner Anfrage und Kontaktaufnahme einverstanden.</span></label><div class="cf-form-error cf-full" id="cfFormError" role="alert"></div><div class="cf-field cf-full"><button class="cf-submit" type="submit">Persönlichen Fahrplan erstellen →</button></div></div></form>'+backMarkup()+'</div>';
    const first=content.querySelector('input[name="name"]');if(first)setTimeout(function(){first.focus({preventScroll:true});},60);
  }

  function renderLoading(){
    progressBar.style.width='100%';progressMeta.textContent='Profil wird erstellt';
    content.innerHTML='<div class="cf-view cf-loader" aria-busy="true"><div class="cf-kicker" style="justify-content:center">Deine Angaben sind sicher angekommen</div><h2 class="cf-title" id="cfQuestionTitle">Dein Cashflow-Profil wird <em>erstellt.</em></h2><p class="cf-lede" style="margin-left:auto;margin-right:auto">Wir fassen deine Ausgangslage zusammen und bereiten deinen sinnvollen nächsten Schritt vor.</p><div class="cf-loader-orb"></div><div class="cf-loader-list"><div class="cf-loader-item" data-loader="1"><i>1</i><span>Ziel und Erfahrungsstand werden zusammengeführt</span></div><div class="cf-loader-item" data-loader="2"><i>2</i><span>Ausgangslage und Engpass werden eingeordnet</span></div><div class="cf-loader-item" data-loader="3"><i>3</i><span>Persönlicher nächster Schritt wird vorbereitet</span></div></div></div>';
    [1,2,3].forEach(function(n){setTimeout(function(){const item=content.querySelector('[data-loader="'+n+'"]');if(item){item.classList.add('is-done');item.querySelector('i').textContent='✓';}},220*n);});
    setTimeout(renderResult,1050);
  }

  function renderResult(){
    const name=state.contact.name.split(/\s+/)[0]||'du';
    updateProgress(4);progressBar.style.width='100%';progressMeta.textContent='Fertig';
    content.innerHTML='<div class="cf-view"><div class="cf-result-badge">✓ Cashflow-Profil erstellt</div><h2 class="cf-title" id="cfQuestionTitle" style="margin-top:14px">Danke, '+escapeHtml(name)+'. Dein nächster Schritt ist <em>bereit.</em></h2><p class="cf-lede">Auf Basis deiner Antworten ist eine persönliche Einordnung sinnvoll, bevor du weitere Entscheidungen triffst.</p><div class="cf-result-grid"><div class="cf-result-chip"><span>Dein Ziel</span><strong>'+escapeHtml(labels.goal[state.answers.goal])+'</strong></div><div class="cf-result-chip"><span>Deine Erfahrung</span><strong>'+escapeHtml(labels.experience[state.answers.experience])+'</strong></div><div class="cf-result-chip"><span>Dein Engpass</span><strong>'+escapeHtml(labels.blocker[state.answers.blocker])+'</strong></div></div><div class="cf-result-callout"><strong>Dein sinnvoller nächster Schritt:</strong> Julian oder sein Team ordnet deine Ausgangslage persönlich ein und prüft mit dir, welcher realistische Weg zu deinem Ziel passen könnte. Keine Anlageberatung und kein Gewinnversprechen.</div><h3 class="cf-choice-title">Wie möchtest du weitermachen?</h3><div class="cf-next-actions"><button class="cf-next-action" type="button" data-cf-callback><i>☎</i><span><strong>Rückruf anfordern</strong><small>Persönlich über deine angegebene Telefonnummer</small></span><b>→</b></button><a class="cf-next-action secondary" data-cf-calendar href="'+CALENDAR_URL+'" target="_blank" rel="noopener noreferrer"><i>↗</i><span><strong>Termin selbst auswählen</strong><small>In Ruhe einen passenden Zeitpunkt buchen</small></span><b>→</b></a></div></div>';
    const first=content.querySelector('[data-cf-callback]');if(first)setTimeout(function(){first.focus({preventScroll:true});},60);
  }

  function renderConfirmation(){
    content.innerHTML='<div class="cf-view"><div class="cf-result-badge">✓ Rückrufwunsch gespeichert</div><h2 class="cf-title" id="cfQuestionTitle" style="margin-top:14px">Danke. Wir melden uns <em>persönlich.</em></h2><div class="cf-confirmation"><h3>Dein Cashflow-Plan ist angekommen.</h3><p>Julian oder sein Team meldet sich über die von dir angegebene Telefonnummer, um deine Ausgangslage persönlich einzuordnen.</p></div><button class="cf-back" type="button" data-cf-close-confirm style="margin-top:22px">Fenster schließen →</button></div>';
    const close=content.querySelector('[data-cf-close-confirm]');if(close)setTimeout(function(){close.focus({preventScroll:true});},60);
  }

  function showToast(message){clearTimeout(toastTimer);toast.textContent=message;toast.classList.add('is-visible');toastTimer=setTimeout(function(){toast.classList.remove('is-visible');},3600);}
  function firstFocusable(){return modal.querySelector('button:not([disabled]),a[href],input:not([disabled])');}

  function openFunnel(trigger){
    lastFocused=trigger||document.activeElement;startedAt=Date.now();modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');document.body.classList.add('cf-lock');
    if(leadId)renderResult();else if(currentStep>=4)renderContact();else renderQuestion(currentStep);
    track('LeadFunnelStart',{entry_point:(trigger&&trigger.textContent||'direct').trim().slice(0,80)});
  }

  function closeFunnel(){
    if(submitting)return;modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('cf-lock');if(lastFocused&&lastFocused.focus)setTimeout(function(){lastFocused.focus({preventScroll:true});},30);
  }

  function validateContact(form){
    const values=Object.fromEntries(new FormData(form).entries());const errors=[];
    if(String(values.name||'').trim().length<2)errors.push('Bitte gib deinen Vornamen ein.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(values.email||'').trim()))errors.push('Bitte gib eine gültige E-Mail-Adresse ein.');
    const digits=String(values.phone||'').replace(/\D/g,'');if(digits.length<7||digits.length>16)errors.push('Bitte gib eine gültige Telefonnummer ein.');
    if(!form.elements.privacy.checked)errors.push('Bitte bestätige die Datenschutzhinweise.');
    form.querySelectorAll('.cf-input').forEach(function(input){input.setAttribute('aria-invalid','false');});
    if(errors.length){
      const box=form.querySelector('#cfFormError');box.textContent=errors[0];box.classList.add('is-visible');
      if(errors[0].includes('Vornamen'))form.elements.name.setAttribute('aria-invalid','true');else if(errors[0].includes('E-Mail'))form.elements.email.setAttribute('aria-invalid','true');else if(errors[0].includes('Telefon'))form.elements.phone.setAttribute('aria-invalid','true');
      return null;
    }
    return values;
  }

  async function submitLead(form){
    const values=validateContact(form);if(!values)return;
    state.contact={name:String(values.name).trim(),email:String(values.email).trim(),phone:String(values.phone).trim()};
    submitting=true;const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Wird sicher übertragen …';leadEventId=eventId('lead');
    try{
      const response=await fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:state.contact.name,email:state.contact.email,phone:state.contact.phone,companyWebsite:values.companyWebsite||'',privacyAccepted:true,marketingConsent:marketingConsent(),answers:state.answers,attribution:captureAttribution(),elapsedMs:Date.now()-startedAt,eventId:leadEventId})});
      const data=await response.json().catch(function(){return {};});
      if(!response.ok||!data.ok)throw new Error(data.message||'Die Anfrage konnte gerade nicht übertragen werden.');
      leadId=data.leadId;track('Lead',{content_name:'Cashflow-Plan Funnel',content_category:'Lead Funnel'},true,leadEventId);renderLoading();
    }catch(error){
      const box=form.querySelector('#cfFormError');box.innerHTML=escapeHtml(error.message||'Die Anfrage konnte gerade nicht übertragen werden.')+' <a class="cf-direct-fallback" href="'+CALENDAR_URL+'" target="_blank" rel="noopener">Alternativ direkt Termin wählen</a>';box.classList.add('is-visible');button.disabled=false;button.textContent='Erneut versuchen →';
    }finally{submitting=false;}
  }

  async function savePreference(preference){
    if(!leadId)return false;
    try{
      const response=await fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'preference',leadId:leadId,preference:preference,attribution:captureAttribution()}),keepalive:true});
      return response.ok;
    }catch(error){return false;}
  }

  content.addEventListener('click',function(event){
    const option=event.target.closest('[data-cf-option]');
    if(option){
      const step=steps[currentStep];if(!step)return;state.answers[step.key]=option.dataset.cfOption;persistAnswers();content.querySelectorAll('.cf-option').forEach(function(item){item.classList.toggle('is-selected',item===option);});track('FunnelStepCompleted',{step_number:currentStep+1,step_name:step.key});
      setTimeout(function(){if(currentStep<steps.length-1)renderQuestion(currentStep+1);else renderContact();},240);return;
    }
    if(event.target.closest('[data-cf-back]')){if(currentStep>0)renderQuestion(currentStep-1);return;}
    const callback=event.target.closest('[data-cf-callback]');
    if(callback){
      callback.disabled=true;callback.querySelector('strong').textContent='Wird gespeichert …';
      savePreference('callback').then(function(saved){if(!saved){callback.disabled=false;callback.querySelector('strong').textContent='Rückruf anfordern';showToast('Bitte versuche es noch einmal.');return;}track('Contact',{content_name:'Cashflow-Plan Callback'},true);renderConfirmation();});return;
    }
    if(event.target.closest('[data-cf-close-confirm]'))closeFunnel();
  });

  content.addEventListener('submit',function(event){if(event.target.id==='cfLeadForm'){event.preventDefault();submitLead(event.target);}});
  content.addEventListener('click',function(event){
    const calendar=event.target.closest('[data-cf-calendar]');if(!calendar)return;
    track('ScheduleInitiated',{content_name:'Cashflow-Plan Calendar'});savePreference('calendar');
  });

  document.addEventListener('click',function(event){
    const trigger=event.target.closest('.cashflow-funnel-trigger,a[href="#cashflow-funnel"]');if(!trigger||modal.contains(trigger))return;event.preventDefault();openFunnel(trigger);
  });
  closeButton.addEventListener('click',closeFunnel);
  modal.addEventListener('click',function(event){if(event.target===modal)closeFunnel();});
  document.addEventListener('keydown',function(event){
    if(!modal.classList.contains('is-open'))return;if(event.key==='Escape'){closeFunnel();return;}if(event.key!=='Tab')return;
    const focusable=Array.from(modal.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')).filter(function(el){return el.offsetParent!==null;});if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });

  restoreAnswers();captureAttribution();
  window.addEventListener('cookieConsentUpdated',function(event){if(event.detail&&event.detail.marketing)setTimeout(fireViewContent,0);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fireViewContent);else fireViewContent();
  if(location.hash==='#cashflow-funnel')setTimeout(function(){openFunnel(null);},80);
})();
</script>
`;

replaceOnce('</body>', `${funnelMarkup}\n</body>`, 'funnel markup insertion');

if (html.includes('Erlaubt optionale Tracking- und Remarketing-Funktionen, falls später eingebunden.')) {
  html = html.replace(
    'Erlaubt optionale Tracking- und Remarketing-Funktionen, falls später eingebunden.',
    'Erlaubt Meta Pixel und – nach dem Absenden des Cashflow-Plans – die datenschutzfreundlich übermittelte Erfolgsmessung über die Meta Conversions API.'
  );
}

const requiredMarkers = [
  'id="cashflowFunnel"',
  'PREMIUM CASHFLOW PLAN FUNNEL',
  'Meinen Cashflow-Plan starten',
  'Persönlichen Fahrplan erstellen',
  'Rückruf anfordern',
  'Termin selbst auswählen',
  "track('Lead'",
  "track('ScheduleInitiated'",
  "fetch('/api/lead'",
  'privacyAccepted:true',
  'prefers-reduced-motion:reduce',
  calendarUrl
];
for (const marker of requiredMarkers) {
  if (!html.includes(marker)) throw new Error(`Required cashflow funnel marker is missing: ${marker}`);
}

html = html
  .replace(/https:\/\/calendar\.app\.google\/sDXSGovL4Bjy41RB8/g, calendarUrl)
  .replace(/https:\/\/calendar\.app\.google/g, 'https://calendly.com')
  .replace(/calendar\.app\.google/g, 'calendly.com');

const oldDirectCalendarAnchors = (html.match(/<a\b[^>]*href=("|')https:\/\/calendar\.app\.google[^>]*>/gi) || [])
  .filter((anchor) => !/data-cf-calendar/i.test(anchor) && !/cf-direct-fallback/i.test(anchor));
if (oldDirectCalendarAnchors.length) {
  throw new Error(`Unexpected direct calendar anchors remain: ${oldDirectCalendarAnchors.length}`);
}
if (html.includes('calendar.app.google')) throw new Error('Legacy Google Calendar URL still exists.');
if (html.includes('id="bookingExperience"')) throw new Error('Obsolete booking experience still exists.');
if (html.includes('<iframe class="calendar-iframe')) throw new Error('Embedded calendar iframe still exists.');

fs.writeFileSync(indexPath, html, 'utf8');

if (fs.existsSync(privacyPath)) {
  let privacy = fs.readFileSync(privacyPath, 'utf8');
  const leadPrivacySection = `
<section class="legal-section">
  <h2>Cashflow-Plan und Kontaktanfrage</h2>
  <p>Wenn du den Cashflow-Plan absendest, verarbeiten wir deine Antworten zur Ausgangslage sowie deinen Namen, deine E-Mail-Adresse und deine Telefonnummer. Die Verarbeitung dient dazu, deine Anfrage zu bearbeiten, den passenden nächsten Schritt einzuordnen und dich auf dem von dir gewählten Weg zu kontaktieren.</p>
  <p>Die Angaben werden nicht öffentlich angezeigt. Sie werden gelöscht, sobald sie für die Bearbeitung der Anfrage nicht mehr erforderlich sind und keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Deine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft über die oben genannte E-Mail-Adresse widerrufen.</p>
</section>

`;
  if (!privacy.includes('Cashflow-Plan und Kontaktanfrage')) {
    privacy = privacy.replace('<section class="legal-section">\n  <h2>Meta Pixel</h2>', `${leadPrivacySection}<section class="legal-section">\n  <h2>Meta Pixel und Meta Conversions API</h2>`);
  }
  privacy = privacy.replace(
    'Diese Website kann den Meta Pixel von Meta Platforms Ireland Ltd. verwenden, um die Wirksamkeit von Werbeanzeigen zu messen und interessenbasierte Werbung zu ermöglichen. Der Meta Pixel wird erst geladen, wenn du im Cookie-Banner der Kategorie Marketing zustimmst.',
    'Diese Website kann den Meta Pixel und die Meta Conversions API von Meta Platforms Ireland Ltd. verwenden, um die Wirksamkeit von Werbeanzeigen zu messen. Beide Marketing-Funktionen werden nur verwendet, wenn du im Cookie-Banner der Kategorie Marketing zustimmst. Bei einer Anfrage können E-Mail-Adresse und Telefonnummer vor der Übermittlung an Meta mit SHA-256 gehasht sowie technische Verbindungsdaten übermittelt werden. Browser- und Server-Ereignisse erhalten dieselbe Ereignis-ID, damit Meta sie nicht doppelt zählt.'
  );
  if (!privacy.includes('Cashflow-Plan und Kontaktanfrage') || !privacy.includes('Meta Conversions API')) {
    throw new Error('Cashflow funnel privacy disclosures could not be added.');
  }
  fs.writeFileSync(privacyPath, privacy, 'utf8');
}

console.log(`Premium cashflow funnel injected: ${rewrittenCtas} CTAs converted, lead API and Meta event hooks ready.`);
