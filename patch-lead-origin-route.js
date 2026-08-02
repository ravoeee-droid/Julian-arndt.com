const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'dist', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

if (!html.includes('id="lead-origin-route-patch"')) {
  const patch = `<script id="lead-origin-route-patch">(function(){var originalFetch=window.fetch.bind(window);window.fetch=function(input,init){if(input==='/api/lead')input='/api/lead-submit';return originalFetch(input,init);};})();</script>`;
  html = html.replace('</body>', `${patch}</body>`);
  fs.writeFileSync(htmlPath, html);
  console.log('Lead submissions routed through robust same-origin endpoint.');
} else {
  console.log('Lead origin route patch already present.');
}
