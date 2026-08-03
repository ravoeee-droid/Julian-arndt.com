const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html is missing before Calendly booking tracking.');
}

let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes('CALENDLY_BOOKING_CONVERSION_TRACKING_V2')) {
  console.log('Calendly booking conversion tracking already present.');
  process.exit(0);
}

const leadSuccessNeedle = "leadId=data.leadId;track('Lead',{content_name:'Cashflow-Plan Funnel',content_category:'Lead Funnel'},true,leadEventId);renderLoading();";
const leadSuccessReplacement = "leadId=data.leadId;try{sessionStorage.setItem('cf_current_lead_id',leadId);sessionStorage.setItem('cf_current_lead_contact',JSON.stringify(state.contact));}catch(error){}track('Lead',{content_name:'Cashflow-Plan Funnel',content_category:'Lead Funnel'},true,leadEventId);renderLoading();";

const leadSuccessCount = html.split(leadSuccessNeedle).length - 1;
if (leadSuccessCount !== 1) {
  throw new Error(`Expected exactly one lead success marker, found ${leadSuccessCount}.`);
}
html = html.replace(leadSuccessNeedle, leadSuccessReplacement);

const overlayCss = `
<style id="calendly-booking-overlay-styles">
.cf-calendly-overlay{position:fixed;inset:0;z-index:14000;display:none;place-items:center;padding:14px;background:rgba(0,0,0,.88);backdrop-filter:blur(16px)}
.cf-calendly-overlay.is-open{display:grid}
.cf-calendly-panel{position:relative;width:min(980px,100%);height:min(820px,calc(100dvh - 28px));min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden;border:1px solid rgba(198,162,42,.28);border-radius:28px;background:#fff;box-shadow:0 40px 140px rgba(0,0,0,.68)}
.cf-calendly-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 18px;background:#0a0a0a;color:#f2eee5;border-bottom:1px solid rgba(198,162,42,.2)}
.cf-calendly-head strong{font-size:.86rem;letter-spacing:.08em;text-transform:uppercase}
.cf-calendly-close{width:40px;height:40px;display:grid;place-items:center;border:1px solid rgba(242,238,229,.16);border-radius:50%;background:rgba(255,255,255,.04);color:#f2eee5;font-size:1.25rem}
.cf-calendly-frame{width:100%;height:100%;min-height:0;border:0;background:#fff}
.cf-calendly-foot{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 16px;border-top:1px solid rgba(5,5,5,.1);background:#f4efe5;color:rgba(5,5,5,.68);font-size:.76rem}
.cf-calendly-foot a{color:#17120a;font-weight:850;text-decoration:underline;text-underline-offset:3px}
.cf-calendly-booked{display:none;position:absolute;inset:0;z-index:2;place-items:center;padding:24px;background:rgba(5,5,5,.96);color:#f2eee5;text-align:center}
.cf-calendly-overlay.is-booked .cf-calendly-booked{display:grid}
.cf-calendly-booked strong{display:block;margin-bottom:8px;color:#e0bf56;font-family:'Cormorant Garamond',serif;font-size:2.5rem;font-weight:500}
body.cf-calendar-lock{overflow:hidden!important}
@media(max-width:760px){.cf-calendly-overlay{padding:0}.cf-calendly-panel{width:100%;height:100dvh;max-height:none;border:0;border-radius:0}.cf-calendly-foot{display:block;text-align:center}.cf-calendly-foot a{display:block;margin-top:6px}}
</style>`;

if (!html.includes('</head>')) {
  throw new Error('Could not inject Calendly overlay styles because </head> is missing.');
}
html = html.replace('</head>', `${overlayCss}\n</head>`);

const trackingScript = `
<script id="calendly-booking-conversion-tracking">
/* CALENDLY_BOOKING_CONVERSION_TRACKING_V2 */
(function(){
  'use strict';

  var CALENDAR_URL='https://calendly.com/julian-defi-intelligence/30min';
  var CONTACT_KEY='cf_current_lead_contact';
  var LEAD_KEY='cf_current_lead_id';
  var CONSENT_KEY='defi_cookie_consent_v1';
  var ATTRIBUTION_KEY='defi_cashflow_attribution_v1';
  var overlay=null;

  function readJson(storage,key){try{return JSON.parse(storage.getItem(key)||'null');}catch(error){return null;}}
  function hasMarketingConsent(){var consent=readJson(localStorage,CONSENT_KEY);return !!(consent&&consent.marketing);}
  function makeEventId(){return 'schedule_'+(window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));}

  function buildCalendlyUrl(){
    var url=new URL(CALENDAR_URL);
    var contact=readJson(sessionStorage,CONTACT_KEY)||{};
    var attribution=readJson(sessionStorage,ATTRIBUTION_KEY)||{};
    if(contact.name)url.searchParams.set('name',String(contact.name).slice(0,120));
    if(contact.email)url.searchParams.set('email',String(contact.email).slice(0,180));
    url.searchParams.set('embed_domain',location.hostname);
    url.searchParams.set('embed_type','Inline');
    var fields={utm_source:attribution.utmSource,utm_medium:attribution.utmMedium,utm_campaign:attribution.utmCampaign,utm_content:attribution.utmContent,utm_term:attribution.utmTerm};
    Object.keys(fields).forEach(function(key){if(fields[key])url.searchParams.set(key,String(fields[key]).slice(0,255));});
    return url.toString();
  }

  function closeCalendly(){
    if(!overlay)return;
    overlay.classList.remove('is-open','is-booked');
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('cf-calendar-lock');
    var frame=overlay.querySelector('.cf-calendly-frame');
    if(frame)frame.src='about:blank';
  }

  function ensureOverlay(){
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.className='cf-calendly-overlay';
    overlay.id='cfCalendlyOverlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-hidden','true');
    overlay.setAttribute('aria-label','Termin auswählen');
    overlay.innerHTML='<div class="cf-calendly-panel"><div class="cf-calendly-head"><strong>Termin auswählen</strong><button class="cf-calendly-close" type="button" aria-label="Kalender schließen">×</button></div><iframe class="cf-calendly-frame" title="Termin bei Julian auswählen" loading="eager" allow="payment"></iframe><div class="cf-calendly-foot"><span>Der Kalender lädt nicht?</span><a class="cf-calendly-direct" target="_blank" rel="noopener noreferrer">Calendly direkt öffnen ↗</a></div><div class="cf-calendly-booked"><div><strong>Termin erfolgreich gebucht.</strong><span>Die Bestätigung wurde versendet.</span><br><button class="btn-main cf-calendly-done" type="button" style="margin-top:20px">Fertig</button></div></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.cf-calendly-close').addEventListener('click',closeCalendly);
    overlay.querySelector('.cf-calendly-done').addEventListener('click',closeCalendly);
    overlay.addEventListener('click',function(event){if(event.target===overlay)closeCalendly();});
    return overlay;
  }

  function openCalendly(){
    var url=buildCalendlyUrl();
    var shell=ensureOverlay();
    shell.querySelector('.cf-calendly-frame').src=url;
    shell.querySelector('.cf-calendly-direct').href=url;
    shell.classList.add('is-open');
    shell.setAttribute('aria-hidden','false');
    document.body.classList.add('cf-calendar-lock');
    setTimeout(function(){var close=shell.querySelector('.cf-calendly-close');if(close)close.focus({preventScroll:true});},30);
  }

  function isCalendlyOrigin(origin){
    try{var host=new URL(origin).hostname.toLowerCase();return host==='calendly.com'||host.endsWith('.calendly.com');}catch(error){return false;}
  }

  function browserScheduleEvent(eventId){
    if(!hasMarketingConsent()||!window.fbq)return;
    try{window.fbq('track','Schedule',{content_name:'Calendly 30-Minuten-Termin',content_category:'Beratungstermin',status:'booked'},{eventID:eventId});}catch(error){}
  }

  function reportScheduledBooking(messagePayload){
    var leadId='';
    try{leadId=sessionStorage.getItem(LEAD_KEY)||'';}catch(error){}
    var contact=readJson(sessionStorage,CONTACT_KEY)||{};
    var attribution=readJson(sessionStorage,ATTRIBUTION_KEY)||{};
    if(!/^cf_[a-f0-9-]{36}$/i.test(leadId)||!contact.name||!contact.email||!contact.phone)return;
    var eventUri=messagePayload&&messagePayload.event&&messagePayload.event.uri||'';
    var inviteeUri=messagePayload&&messagePayload.invitee&&messagePayload.invitee.uri||'';
    var reference=inviteeUri||eventUri||leadId;
    var sentKey='cf_schedule_reported_'+reference.replace(/[^a-zA-Z0-9_-]/g,'_').slice(-160);
    try{if(sessionStorage.getItem(sentKey))return;sessionStorage.setItem(sentKey,'pending');}catch(error){}
    var scheduleEventId=makeEventId();
    browserScheduleEvent(scheduleEventId);
    fetch('/api/schedule',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({leadId:leadId,eventId:scheduleEventId,name:String(contact.name),email:String(contact.email),phone:String(contact.phone),marketingConsent:hasMarketingConsent(),attribution:attribution,calendly:{eventUri:eventUri,inviteeUri:inviteeUri}})}).then(function(response){
      if(!response.ok)throw new Error('schedule_tracking_failed');
      try{sessionStorage.setItem(sentKey,'sent');}catch(error){}
      if(overlay)overlay.classList.add('is-booked');
      window.dispatchEvent(new CustomEvent('cashflowFunnelEvent',{detail:{name:'Schedule',params:{status:'booked'}}}));
    }).catch(function(){try{sessionStorage.removeItem(sentKey);}catch(error){}});
  }

  document.addEventListener('click',function(event){
    var trigger=event.target.closest&&event.target.closest('[data-cf-calendar]');
    if(!trigger)return;
    event.preventDefault();
    openCalendly();
  },true);

  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&overlay&&overlay.classList.contains('is-open'))closeCalendly();});
  window.addEventListener('message',function(event){if(!isCalendlyOrigin(event.origin)||!event.data||event.data.event!=='calendly.event_scheduled')return;reportScheduledBooking(event.data.payload||{});});
})();
</script>`;

if (!html.includes('</body>')) {
  throw new Error('Could not inject Calendly booking tracking because </body> is missing.');
}
html = html.replace('</body>', `${trackingScript}\n</body>`);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Calendly now opens in a reliable inline overlay and completed bookings remain tracked.');
