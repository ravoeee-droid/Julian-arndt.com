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
.cf-input{scroll-margin-top:84px;scroll-margin-bottom:120px}

@media (max-width:760px){
  .cf-funnel,.cf-shell{height:var(--cf-viewport-height,100dvh)!important}
  .cf-main{padding-left:max(16px,env(safe-area-inset-left))!important;padding-right:max(16px,env(safe-area-inset-right))!important}
  .cf-head{position:relative;z-index:20;background:#090909}
  .cf-view{padding-bottom:calc(98px + env(safe-area-inset-bottom))!important}
  .cf-options{grid-template-columns:1fr!important;gap:10px!important}
  .cf-option{min-height:78px!important;padding:13px 14px!important;border-radius:16px!important}
  .cf-option-icon{width:40px!important;height:40px!important}
  .cf-contact-grid{padding-bottom:2px}
  #cfLeadForm .cf-contact-grid>.cf-field:last-child{position:sticky;z-index:25;bottom:calc(-1px - env(safe-area-inset-bottom));margin:2px -4px 0;padding:12px 4px calc(10px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(9,9,9,0),#090909 22%,#090909 100%)}
  .cf-submit{min-height:58px!important;box-shadow:0 12px 38px rgba(198,162,42,.28)!important}
  .cf-next-actions{grid-template-columns:1fr!important;gap:10px!important}
  .cf-next-action{min-height:82px!important;padding:14px!important}
  .cf-result-grid{grid-template-columns:1fr!important}
  .cf-toast{left:16px!important;right:16px!important;bottom:calc(16px + env(safe-area-inset-bottom))!important;text-align:center}
}

@media (max-width:390px){
  .cf-main{padding-top:calc(12px + env(safe-area-inset-top))!important}
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
  .cf-content{padding-top:8px!important}
  .cf-title{font-size:clamp(1.8rem,5vw,2.45rem)!important}
  .cf-lede{margin:9px 0 12px!important;line-height:1.45!important}
  .cf-options{grid-template-columns:1fr 1fr!important;gap:8px!important}
  .cf-option{min-height:66px!important;padding:9px 11px!important}
  .cf-option-icon{width:34px!important;height:34px!important}
  .cf-view{padding-bottom:74px!important}
}

@media (prefers-reduced-motion:reduce){
  .cf-funnel *{scroll-behavior:auto!important}
}
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
  if(!modal)return;

  function syncViewportHeight(){
    var height=window.visualViewport&&window.visualViewport.height?window.visualViewport.height:window.innerHeight;
    if(height>0)modal.style.setProperty('--cf-viewport-height',Math.round(height)+'px');
  }

  function resetActiveView(){
    var view=modal.querySelector('.cf-view');
    if(view){
      view.scrollTop=0;
      view.setAttribute('tabindex','-1');
    }
    var submit=modal.querySelector('.cf-submit');
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
      resetActiveView();
      syncViewportHeight();
    });
  });
  var content=modal.querySelector('.cf-content');
  if(content)observer.observe(content,{childList:true,subtree:true});

  modal.addEventListener('focusin',function(event){
    if(!event.target.matches('.cf-input'))return;
    setTimeout(function(){
      try{event.target.scrollIntoView({block:'center',behavior:'smooth'});}catch(error){event.target.scrollIntoView();}
    },260);
  });

  modal.addEventListener('submit',function(){
    var button=modal.querySelector('.cf-submit');
    if(button)button.setAttribute('aria-busy','true');
  });
})();
</script>`;

if (html.includes('id="cashflow-production-hardening-script"')) {
  html = html.replace(/<script id="cashflow-production-hardening-script">[\s\S]*?<\/script>/, hardeningScript);
} else {
  html = html.replace('</body>', `${hardeningScript}\n</body>`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Cashflow funnel production hardening applied: safe viewport, keyboard handling, sticky mobile CTA and compact layouts.');
