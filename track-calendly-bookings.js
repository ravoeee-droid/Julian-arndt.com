const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html is missing before Calendly booking tracking.');
}

let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes('CALENDLY_BOOKING_CONVERSION_TRACKING')) {
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

const trackingScript = `
<script id="calendly-booking-conversion-tracking">
/* CALENDLY_BOOKING_CONVERSION_TRACKING */
(function(){
  'use strict';

  var CALENDAR_URL='https://calendly.com/julian-defi-intelligence/30min';
  var CONTACT_KEY='cf_current_lead_contact';
  var LEAD_KEY='cf_current_lead_id';
  var CONSENT_KEY='defi_cookie_consent_v1';
  var ATTRIBUTION_KEY='defi_cashflow_attribution_v1';
  var calendlyLoader=null;

  function readJson(storage,key){
    try{return JSON.parse(storage.getItem(key)||'null');}catch(error){return null;}
  }

  function hasMarketingConsent(){
    var consent=readJson(localStorage,CONSENT_KEY);
    return !!(consent&&consent.marketing);
  }

  function makeEventId(){
    return 'schedule_'+(window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));
  }

  function loadCalendly(){
    if(window.Calendly&&typeof window.Calendly.initPopupWidget==='function')return Promise.resolve(window.Calendly);
    if(calendlyLoader)return calendlyLoader;
    calendlyLoader=new Promise(function(resolve,reject){
      var existing=document.querySelector('script[src*="assets.calendly.com/assets/external/widget.js"]');
      var script=existing||document.createElement('script');
      var done=function(){
        if(window.Calendly&&typeof window.Calendly.initPopupWidget==='function')resolve(window.Calendly);
        else reject(new Error('calendly_widget_unavailable'));
      };
      if(existing){
        if(window.Calendly)return done();
        existing.addEventListener('load',done,{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      script.src='https://assets.calendly.com/assets/external/widget.js';
      script.async=true;
      script.addEventListener('load',done,{once:true});
      script.addEventListener('error',reject,{once:true});
      document.head.appendChild(script);
    });
    return calendlyLoader;
  }

  function buildCalendlyUrl(){
    var url=new URL(CALENDAR_URL);
    var contact=readJson(sessionStorage,CONTACT_KEY)||{};
    var attribution=readJson(sessionStorage,ATTRIBUTION_KEY)||{};
    if(contact.name)url.searchParams.set('name',String(contact.name).slice(0,120));
    if(contact.email)url.searchParams.set('email',String(contact.email).slice(0,180));
    var fields={
      utm_source:attribution.utmSource,
      utm_medium:attribution.utmMedium,
      utm_campaign:attribution.utmCampaign,
      utm_content:attribution.utmContent,
      utm_term:attribution.utmTerm
    };
    Object.keys(fields).forEach(function(key){if(fields[key])url.searchParams.set(key,String(fields[key]).slice(0,255));});
    return url.toString();
  }

  function openCalendly(){
    var url=buildCalendlyUrl();
    loadCalendly().then(function(Calendly){
      Calendly.initPopupWidget({url:url});
    }).catch(function(){
      window.location.href=url;
    });
  }

  function isCalendlyOrigin(origin){
    try{
      var host=new URL(origin).hostname.toLowerCase();
      return host==='calendly.com'||host.endsWith('.calendly.com');
    }catch(error){return false;}
  }

  function browserScheduleEvent(eventId){
    if(!hasMarketingConsent()||!window.fbq)return;
    try{
      window.fbq('track','Schedule',{
        content_name:'Calendly 30-Minuten-Termin',
        content_category:'Beratungstermin',
        status:'booked'
      },{eventID:eventId});
    }catch(error){}
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

    fetch('/api/schedule',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      keepalive:true,
      body:JSON.stringify({
        leadId:leadId,
        eventId:scheduleEventId,
        name:String(contact.name),
        email:String(contact.email),
        phone:String(contact.phone),
        marketingConsent:hasMarketingConsent(),
        attribution:attribution,
        calendly:{eventUri:eventUri,inviteeUri:inviteeUri}
      })
    }).then(function(response){
      if(!response.ok)throw new Error('schedule_tracking_failed');
      try{sessionStorage.setItem(sentKey,'sent');}catch(error){}
      window.dispatchEvent(new CustomEvent('cashflowFunnelEvent',{detail:{name:'Schedule',params:{status:'booked'}}}));
    }).catch(function(){
      try{sessionStorage.removeItem(sentKey);}catch(error){}
    });
  }

  document.addEventListener('click',function(event){
    var trigger=event.target.closest&&event.target.closest('[data-cf-calendar]');
    if(!trigger)return;
    event.preventDefault();
    openCalendly();
  },true);

  window.addEventListener('message',function(event){
    if(!isCalendlyOrigin(event.origin)||!event.data||event.data.event!=='calendly.event_scheduled')return;
    reportScheduledBooking(event.data.payload||{});
  });
})();
</script>`;

if (!html.includes('</body>')) {
  throw new Error('Could not inject Calendly booking tracking because </body> is missing.');
}
html = html.replace('</body>', `${trackingScript}\n</body>`);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Completed Calendly bookings now send deduplicated Meta browser and CAPI Schedule events.');
