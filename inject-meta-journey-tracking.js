const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dist', 'index.html');
const marker = 'META_JOURNEY_TRACKING_V1';

if (!fs.existsSync(filePath)) {
  throw new Error('dist/index.html is missing before Meta journey tracking injection.');
}

let html = fs.readFileSync(filePath, 'utf8');

if (html.includes(marker)) {
  process.stdout.write('Meta journey tracking already injected.\n');
  process.exit(0);
}

const script = `
<script id="meta-journey-tracking">
/* META_JOURNEY_TRACKING_V1 */
(function(){
  'use strict';

  var CONSENT_KEY='defi_cookie_consent_v1';
  var STORAGE_PREFIX='meta_journey_v1_';
  var heroWatchTimer=null;
  var heroVisibleSeconds=0;

  function readJson(storage,key){
    try{return JSON.parse(storage.getItem(key)||'null');}catch(error){return null;}
  }

  function hasMarketingConsent(){
    var consent=readJson(localStorage,CONSENT_KEY);
    return !!(consent&&consent.marketing);
  }

  function wasSent(key){
    if(!key)return false;
    try{return sessionStorage.getItem(STORAGE_PREFIX+key)==='1';}catch(error){return false;}
  }

  function markSent(key){
    if(!key)return;
    try{sessionStorage.setItem(STORAGE_PREFIX+key,'1');}catch(error){}
  }

  function trackCustom(name,params,key,attempt){
    attempt=attempt||0;
    if(!hasMarketingConsent()||wasSent(key))return false;
    if(typeof window.fbq!=='function'){
      if(attempt<12){
        setTimeout(function(){trackCustom(name,params,key,attempt+1);},250);
      }
      return false;
    }
    try{
      window.fbq('trackCustom',name,Object.assign({
        funnel_name:'Cashflow-Plan',
        page_path:location.pathname
      },params||{}));
      markSent(key);
      return true;
    }catch(error){
      return false;
    }
  }

  function startHeroWatch(){
    trackCustom('HeroVideoStart',{
      video_name:'Julian Hauptvideo',
      video_position:'hero'
    },'hero_video_start');

    if(heroWatchTimer)return;
    heroWatchTimer=setInterval(function(){
      if(document.visibilityState!=='visible')return;
      heroVisibleSeconds+=1;
      if(heroVisibleSeconds===10){
        trackCustom('HeroVideoViewed10s',{
          video_name:'Julian Hauptvideo',
          seconds_watched:10
        },'hero_video_10s');
      }
      if(heroVisibleSeconds>=30){
        trackCustom('HeroVideoViewed30s',{
          video_name:'Julian Hauptvideo',
          seconds_watched:30
        },'hero_video_30s');
        clearInterval(heroWatchTimer);
        heroWatchTimer=null;
      }
    },1000);
  }

  document.addEventListener('click',function(event){
    var hero=event.target.closest&&event.target.closest('#videoOverlay');
    if(hero){
      startHeroWatch();
      return;
    }

    var customerVideo=event.target.closest&&event.target.closest('.yt-card[data-video-id]');
    if(customerVideo){
      var videoId=String(customerVideo.getAttribute('data-video-id')||'').slice(0,40);
      trackCustom('CustomerVideoStart',{
        video_position:'customer_case',
        video_id:videoId
      },'customer_video_'+videoId);
    }
  },true);

  window.addEventListener('cashflowFunnelEvent',function(event){
    var detail=event&&event.detail||{};
    var params=detail.params||{};

    if(detail.name==='LeadFunnelStart'){
      trackCustom('CashflowFunnelStart',{
        entry_point:String(params.entry_point||'unknown').slice(0,80)
      },'cashflow_funnel_start');
      return;
    }

    if(detail.name==='FunnelStepCompleted'){
      var stepNumber=Number(params.step_number||0);
      if(stepNumber>=1&&stepNumber<=4){
        trackCustom('CashflowStep'+stepNumber+'Completed',{
          step_number:stepNumber,
          step_name:String(params.step_name||'').slice(0,40)
        },'cashflow_step_'+stepNumber);
      }
    }
  });

  var funnelContent=document.getElementById('cfContent');
  if(funnelContent){
    var inspectContactStep=function(){
      if(funnelContent.querySelector('#cfLeadForm')){
        trackCustom('CashflowStep5Viewed',{
          step_number:5,
          step_name:'contact'
        },'cashflow_step_5_viewed');
      }
    };

    new MutationObserver(inspectContactStep).observe(funnelContent,{childList:true,subtree:true});
    inspectContactStep();

    funnelContent.addEventListener('input',function(event){
      if(event.target&&event.target.matches('.cf-input')){
        trackCustom('CashflowContactStarted',{
          step_number:5
        },'cashflow_contact_started');
      }
    },{passive:true});
  }
})();
</script>
`;

if (!html.includes('</body>')) {
  throw new Error('Could not inject Meta journey tracking because </body> is missing.');
}

html = html.replace('</body>', `${script}\n</body>`);
fs.writeFileSync(filePath, html);
process.stdout.write('Injected granular Meta journey tracking.\n');
