const fs = require('fs');

const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');

const bootstrap = String.raw`<script id="video-bootstrap">
(function(){
  function createYouTubeFrame(id, title){
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&modestbranding=1&vq=hd1080&playsinline=1';
    iframe.title = title || 'Video';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    iframe.style.position = 'absolute';
    iframe.style.inset = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    return iframe;
  }

  function startHeroVideo(){
    var wrap = document.getElementById('heroIframeWrap');
    var overlay = document.getElementById('videoOverlay');
    if(!wrap || !overlay) return;
    wrap.replaceChildren(createYouTubeFrame('zoAF6ZmVsOM', 'Investmentprozess mit Julian Arndt'));
    wrap.style.display = 'block';
    overlay.style.display = 'none';
  }

  function startFeedbackVideo(card, id){
    if(!card || !id) return;
    card.classList.add('is-playing');
    card.replaceChildren(createYouTubeFrame(id, 'Video Feedback'));
  }

  document.addEventListener('click', function(event){
    var overlay = event.target.closest && event.target.closest('#videoOverlay');
    if(overlay){
      event.preventDefault();
      event.stopImmediatePropagation();
      startHeroVideo();
      return;
    }

    var card = event.target.closest && event.target.closest('.yt-card[data-video-id]');
    if(card){
      event.preventDefault();
      event.stopImmediatePropagation();
      startFeedbackVideo(card, card.getAttribute('data-video-id'));
    }
  }, true);

  document.addEventListener('keydown', function(event){
    if(event.key !== 'Enter' && event.key !== ' ') return;
    if(event.target && event.target.id === 'videoOverlay'){
      event.preventDefault();
      startHeroVideo();
      return;
    }
    if(event.target && event.target.matches('.yt-card[data-video-id]')){
      event.preventDefault();
      startFeedbackVideo(event.target, event.target.getAttribute('data-video-id'));
    }
  });
})();
</script>`;

if (!html.includes('id="video-bootstrap"')) {
  html = html.replace(/<body([^>]*)>/i, `<body$1>\n${bootstrap}`);
}

html = html.replace(
  /id="videoOverlay"\s+onclick="manualPlay\(\)"/i,
  'id="videoOverlay" role="button" tabindex="0" aria-label="Video abspielen"'
);

html = html.replace(
  /class="yt-card"\s+onclick="playInlineYT\(this,\s*'([^']+)'\)"/g,
  'class="yt-card" data-video-id="$1" role="button" tabindex="0"'
);

fs.writeFileSync(file, html, 'utf8');

if (!html.includes('id="video-bootstrap"')) throw new Error('Video bootstrap was not injected.');
if (!html.includes('data-video-id="-IjwKAos27M"')) throw new Error('Feedback video bindings were not repaired.');
if (!html.includes('aria-label="Video abspielen"')) throw new Error('Hero video binding was not repaired.');

console.log('Inline video playback repaired.');
