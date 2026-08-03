const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dist', 'index.html');
const marker = 'META_JOURNEY_TRACKING_V2';

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
/* META_JOURNEY_TRACKING_V2 */
(function(){
  'use strict';

  var CONSENT_KEY='defi_cookie_consent_v1';
  var STORAGE_PREFIX='meta_journey_v2_';
  var player=null;
  var playerReadyPromise=null;
  var watchTimer=null;
  var activeWatchSeconds=0;
  var playerState=-1;

  function readJson(storage,key){try{return JSON.parse(storage.getItem(key)||'null');}catch(error){return null;}}
  function hasMarketingConsent(){var consent=readJson(localStorage,CONSENT_KEY);return !!(consent&&consent.marketing);}
  function wasSent(key){if(!key)return false;try{return sessionStorage.getItem(STORAGE_PREFIX+key)==='1';}catch(error){return false;}}
  function markSent(key){if(!key)return;try{sessionStorage.setItem(STORAGE_PREFIX+key,'1');}catch(error){}}

  function trackCustom(name,params,key,attempt){
    attempt=attempt||0;
    if(!hasMarketingConsent()||wasSent(key))return false;
    if(typeof window.fbq!=='function'){
      if(attempt<12)setTimeout(function(){trackCustom(name,params,key,attempt+1);},250);
      return false;
    }
    try{
      window.fbq('trackCustom',name,Object.assign({funnel_name:'Cashflow-Plan',page_path:location.pathname},params||{}));
      markSent(key);
      return true;
    }catch(error){return false;}
  }

  function loadYouTubeApi(){
    if(window.YT&&window.YT.Player)return Promise.resolve(window.YT);
    if(playerReadyPromise)return playerReadyPromise;
    playerReadyPromise=new Promise(function(resolve,reject){
      var previous=window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady=function(){
        if(typeof previous==='function'){try{previous();}catch(error){}}
        if(window.YT&&window.YT.Player)resolve(window.YT);else reject(new Error('youtube_api_unavailable'));
      };
      if(!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')){
        var script=document.createElement('script');
        script.src='https://www.youtube.com/iframe_api';
        script.async=true;
        script.onerror=reject;
        document.head.appendChild(script);
      }
      setTimeout(function(){if(window.YT&&window.YT.Player)resolve(window.YT);},1200);
    });
    return playerReadyPromise;
  }

  function sendWatchMilestones(){
    var seconds=Math.floor(activeWatchSeconds);
    [10,30,60,120,180].forEach(function(mark){
      if(seconds>=mark)trackCustom('HeroVideoWatch'+mark+'s',{video_name:'Julian Hauptvideo',seconds_watched:mark},'hero_watch_'+mark+'s');
    });

    if(!player||typeof player.getCurrentTime!=='function'||typeof player.getDuration!=='function')return;
    var duration=Number(player.getDuration()||0);
    var current=Number(player.getCurrentTime()||0);
    if(duration<=0)return;
    var percent=Math.max(0,Math.min(100,Math.round((current/duration)*100)));
    [25,50,75,95].forEach(function(mark){
      if(percent>=mark)trackCustom('HeroVideoProgress'+mark,{video_name:'Julian Hauptvideo',video_percent:mark,seconds_watched:seconds},'hero_progress_'+mark);
    });
  }

  function startWatchMonitor(){
    if(watchTimer)return;
    watchTimer=setInterval(function(){
      if(playerState===1&&document.visibilityState==='visible'){
        activeWatchSeconds+=1;
        sendWatchMilestones();
      }
    },1000);
  }

  function stopWatchMonitor(){
    if(!watchTimer)return;
    clearInterval(watchTimer);
    watchTimer=null;
  }

  function createHeroPlayer(){
    var wrap=document.getElementById('heroIframeWrap');
    var overlay=document.getElementById('videoOverlay');
    if(!wrap||!overlay)return false;
    overlay.style.display='none';
    wrap.style.display='block';
    wrap.innerHTML='<div id="heroYoutubePlayer" style="width:100%;height:100%"></div>';
    trackCustom('HeroVideoStart',{video_name:'Julian Hauptvideo',video_position:'hero'},'hero_video_start');

    loadYouTubeApi().then(function(YT){
      player=new YT.Player('heroYoutubePlayer',{
        width:'100%',height:'100%',videoId:'zoAF6ZmVsOM',
        playerVars:{autoplay:1,rel:0,modestbranding:1,playsinline:1,enablejsapi:1,origin:location.origin},
        events:{
          onReady:function(event){try{event.target.playVideo();}catch(error){}},
          onStateChange:function(event){
            playerState=event.data;
            if(event.data===YT.PlayerState.PLAYING)startWatchMonitor();
            if(event.data===YT.PlayerState.PAUSED||event.data===YT.PlayerState.BUFFERING)sendWatchMilestones();
            if(event.data===YT.PlayerState.ENDED){
              sendWatchMilestones();
              trackCustom('HeroVideoComplete',{video_name:'Julian Hauptvideo',seconds_watched:Math.floor(activeWatchSeconds),video_percent:100},'hero_complete');
              stopWatchMonitor();
            }
          },
          onError:function(){
            wrap.innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/zoAF6ZmVsOM?autoplay=1&rel=0&playsinline=1" title="Investmentprozess mit Julian Arndt" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:0"></iframe>';
          }
        }
      });
    }).catch(function(){
      wrap.innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/zoAF6ZmVsOM?autoplay=1&rel=0&playsinline=1" title="Investmentprozess mit Julian Arndt" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:0"></iframe>';
    });
    return false;
  }

  window.manualPlay=createHeroPlayer;

  document.addEventListener('click',function(event){
    var customerVideo=event.target.closest&&event.target.closest('.yt-card[data-video-id]');
    if(customerVideo){
      var videoId=String(customerVideo.getAttribute('data-video-id')||'').slice(0,40);
      trackCustom('CustomerVideoStart',{video_position:'customer_case',video_id:videoId},'customer_video_'+videoId);
    }
  },true);

  window.addEventListener('cashflowFunnelEvent',function(event){
    var detail=event&&event.detail||{};
    var params=detail.params||{};
    if(detail.name==='LeadFunnelStart'){
      trackCustom('CashflowFunnelStart',{entry_point:String(params.entry_point||'unknown').slice(0,80)},'cashflow_funnel_start');
      return;
    }
    if(detail.name==='FunnelStepCompleted'){
      var stepNumber=Number(params.step_number||0);
      if(stepNumber>=1&&stepNumber<=4){
        trackCustom('CashflowStep'+stepNumber+'Completed',{step_number:stepNumber,step_name:String(params.step_name||'').slice(0,40)},'cashflow_step_'+stepNumber);
      }
    }
  });

  var funnelContent=document.getElementById('cfContent');
  if(funnelContent){
    var inspectContactStep=function(){
      if(funnelContent.querySelector('#cfLeadForm'))trackCustom('CashflowStep5Viewed',{step_number:5,step_name:'contact'},'cashflow_step_5_viewed');
    };
    new MutationObserver(inspectContactStep).observe(funnelContent,{childList:true,subtree:true});
    inspectContactStep();
    funnelContent.addEventListener('input',function(event){if(event.target&&event.target.matches('.cf-input'))trackCustom('CashflowContactStarted',{step_number:5},'cashflow_contact_started');},{passive:true});
  }

  document.addEventListener('visibilitychange',function(){if(document.visibilityState!=='visible')sendWatchMilestones();});
  window.addEventListener('beforeunload',sendWatchMilestones);
})();
</script>
`;

if (!html.includes('</body>')) {
  throw new Error('Could not inject Meta journey tracking because </body> is missing.');
}

html = html.replace('</body>', `${script}\n</body>`);
fs.writeFileSync(filePath, html);
process.stdout.write('Injected actual hero video watch-time and funnel journey tracking.\n');
