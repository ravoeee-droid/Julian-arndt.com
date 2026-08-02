const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html is missing before production funnel hardening.');
}

let html = fs.readFileSync(indexPath, 'utf8');

if (!/name=["']viewport["']/i.test(html)) {
  html = html.replace('<head>', '<head>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');
} else {
  html = html.replace(
    /<meta\s+name=["']viewport["'][^>]*>/i,
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  );
}

html = html.replace(
  "button.disabled=true;button.textContent='Wird sicher übertragen …';leadEventId=eventId('lead');",
  "button.disabled=true;button.textContent='Wird sicher übertragen …';if(!leadEventId)leadEventId=eventId('lead');"
);

const hardeningCss = `
<style id="cashflow-production-hardening">
/* PRODUCTION_FUNNEL_HARDENING */
.cf-funnel{--cf-viewport-height:100dvh}
.cf-option,.cf-submit,.cf-next-action,.cf-close,.cf-back{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.cf-input{scroll-margin-top:88px;scroll-margin-bottom:34px}

@media (max-width:760px){
  .cf-funnel,.cf-shell{height:var(--cf-viewport-height,100dvh)!important;max-height:var(--cf-viewport-height,100dvh)!important}
  .cf-main{
    display:grid!important;
    grid-template-rows:auto minmax(0,1fr)!important;
    width:100%!important;
    height:100%!important;
    min-height:0!important;
    overflow:hidden!important;
    padding:calc(12px + env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))!important
  }
  .cf-head{position:relative;z-index:20;min-height:48px;background:#090909}
  .cf-content{min-height:0!important;height:100%!important;overflow:hidden!important;align-items:stretch!important;padding:10px 0 0!important}
  .cf-view{
    width:100%!important;
    height:100%!important;
    min-height:0!important;
    max-height:none!important;
    overflow-x:hidden!important;
    overflow-y:auto!important;
    -webkit-overflow-scrolling:touch!important;
    overscroll-behavior-y:contain!important;
    touch-action:pan-y!important;
    padding:4px 4px calc(34px + env(safe-area-inset-bottom)) 0!important;
    scroll-padding-top:12px!important;
    scroll-padding-bottom:34px!important
  }
  .cf-options{grid-template-columns:1fr!important;gap:10px!important}
  .cf-option{min-height:78px!important;padding:13px 14px!important;border-radius:16px!important}
  .cf-option-icon{width:40px!important;height:40px!important}
  .cf-contact-grid{grid-template-columns:1fr!important;gap:13px!important;padding-bottom:8px!important}
  .cf-field.cf-full{grid-column:auto!important}
  #cfLeadForm{display:block!important;padding-bottom:8px!important}
  #cfLeadForm .cf-contact-grid>.cf-field:last-child{
    position:static!important;
    inset:auto!important;
    z-index:auto!important;
    margin:2px 0 0!important;
    padding:0!important;
    background:none!important
  }
  .cf-input{min-height:54px!important;font-size:16px!important}
  .cf-checkbox{font-size:.7rem!important;line-height:1.52!important;padding:2px 0!important}
  .cf-submit{position:static!important;min-height:58px!important;margin:2px 0 4px!important;box-shadow:0 12px 38px rgba(198,162,42,.28)!important}
  .cf-nav-row{margin-top:14px!important;padding-bottom:4px!important}
  .cf-next-actions{grid-template-columns:1fr!important;gap:10px!important}
  .cf-next-action{min-height:82px!important;padding:14px!important}
  .cf-result-grid{grid-template-columns:1fr!important}
  .cf-toast{left:16px!important;right:16px!important;bottom:calc(16px + env(safe-area-inset-bottom))!important;text-align:center}
}

@media (max-width:390px){
  .cf-brand span{display:none}
  .cf-brand{max-width:34px!important}
  .cf-head{grid-template-columns:34px minmax(0,1fr) 42px!important;gap:9px!important}
  .cf-progress-meta{min-width:48px!important;font-size:.54rem!important}
  .cf-title{font-size:clamp(1.95rem,10.8vw,2.65rem)!important}
  .cf-lede{font-size:.84rem!important;margin-bottom:17px!important}
  .cf-kicker{font-size:.61rem!important;letter-spacing:.12em!important}
  .cf-option-copy small{font-size:.66rem!important}
}

@media (max-width:900px) and (max-height:560px) and (orientation:landscape){
  .cf-head{min-height:42px!important}
  .cf-brand img{width:24px!important;height:24px!important}
  .cf-close{width:38px!important;height:38px!important}
  .cf-content{padding-top:6px!important}
  .cf-title{font-size:clamp(1.8rem,5vw,2.45rem)!important}
  .cf-lede{margin:9px 0 12px!important;line-height:1.45!important}
  .cf-options{grid-template-columns:1fr 1fr!important;gap:8px!important}
  .cf-option{min-height:66px!important;padding:9px 11px!important}
  .cf-option-icon{width:34px!important;height:34px!important}
  .cf-view{padding-bottom:24px!important}
}

@media (prefers-reduced-motion:reduce){.cf-funnel *{scroll-behavior:auto!important}}
</style>`;

if (html.includes('id="cashflow-production-hardening"')) {
  html = html.replace(/<style id="cashflow-production-hardening">[\s\S]*?<\/style>/, hardeningCss);
} else {
  html = html.replace('</head>', `${hardeningCss}\n</head>`);
}

const hardeningScript = `
<script id="cashflow-production-hardening-script">
(function(){
  'use strict';
  var modal=document.getElementById('cashflowFunnel');
  var content=modal&&modal.querySelector('.cf-content');
  if(!modal||!content)return;
  var activeView=null;

  function syncViewportHeight(){
    var viewport=window.visualViewport;
    var height=viewport&&viewport.height?viewport.height:window.innerHeight;
    if(height>0)modal.style.setProperty('--cf-viewport-height',Math.round(height)+'px');
  }

  function activateCurrentView(){
    var view=content.firstElementChild;
    if(!view||!view.classList.contains('cf-view')||view===activeView)return;
    activeView=view;
    view.scrollTop=0;
    view.setAttribute('tabindex','-1');
    var submit=view.querySelector('.cf-submit');
    if(submit){
      submit.setAttribute('aria-live','polite');
      submit.setAttribute('aria-busy',submit.disabled?'true':'false');
    }
  }

  syncViewportHeight();
  window.addEventListener('resize',syncViewportHeight,{passive:true});
  window.addEventListener('orientationchange',function(){setTimeout(syncViewportHeight,120);},{passive:true});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',syncViewportHeight,{passive:true});
    window.visualViewport.addEventListener('scroll',syncViewportHeight,{passive:true});
  }

  var observer=new MutationObserver(function(){
    window.requestAnimationFrame(function(){
      activateCurrentView();
      syncViewportHeight();
    });
  });
  observer.observe(content,{childList:true});
  activateCurrentView();

  modal.addEventListener('focusin',function(event){
    if(!event.target.matches('.cf-input'))return;
    var input=event.target;
    setTimeout(function(){
      var view=input.closest('.cf-view');
      if(!view)return;
      var inputRect=input.getBoundingClientRect();
      var viewRect=view.getBoundingClientRect();
      var lowerLimit=viewRect.bottom-24;
      var upperLimit=viewRect.top+24;
      if(inputRect.bottom>lowerLimit){
        view.scrollBy({top:inputRect.bottom-lowerLimit+18,behavior:'smooth'});
      }else if(inputRect.top<upperLimit){
        view.scrollBy({top:inputRect.top-upperLimit-18,behavior:'smooth'});
      }
    },280);
  });

  modal.addEventListener('submit',function(){
    var button=modal.querySelector('.cf-submit');
    if(button){button.setAttribute('aria-busy','true');button.disabled=true;}
  });
})();
</script>`;

if (html.includes('id="cashflow-production-hardening-script"')) {
  html = html.replace(/<script id="cashflow-production-hardening-script">[\s\S]*?<\/script>/, hardeningScript);
} else {
  html = html.replace('</body>', `${hardeningScript}\n</body>`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Cashflow funnel mobile step five stabilized with isolated scrolling and keyboard-safe focus handling.');
