const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html is missing before instant lead capture patch.');
}

let html = fs.readFileSync(indexPath, 'utf8');

function replaceOnce(searchValue, replacement, label) {
  const count = html.split(searchValue).length - 1;
  if (count !== 1) {
    throw new Error(`Instant lead capture expected exactly one ${label}, found ${count}.`);
  }
  html = html.replace(searchValue, replacement);
}

if (html.includes('INSTANT_LEAD_CAPTURE_PATCH')) {
  console.log('Instant lead capture patch already present.');
  process.exit(0);
}

replaceOnce(
  "  let submitting = false;\n  let startedAt = Date.now();",
  "  let submitting = false;\n  let instantLeadTimer = null;\n  let startedAt = Date.now();",
  'submission state declaration'
);

replaceOnce(
  "  async function submitLead(form){\n    const values=validateContact(form);if(!values)return;",
  `  /* INSTANT_LEAD_CAPTURE_PATCH */\n  function instantLeadReady(form){\n    if(!form||submitting||leadId)return false;\n    const values=Object.fromEntries(new FormData(form).entries());\n    const name=String(values.name||'').trim();\n    const email=String(values.email||'').trim();\n    const digits=String(values.phone||'').replace(/\\D/g,'');\n    return name.length>=2 && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email) && digits.length>=7 && digits.length<=16 && form.elements.privacy && form.elements.privacy.checked;\n  }\n\n  function scheduleInstantLead(form){\n    clearTimeout(instantLeadTimer);\n    const button=form&&form.querySelector('button[type="submit"]');\n    if(!instantLeadReady(form)){\n      if(button&&!submitting)button.textContent='Persönlichen Fahrplan erstellen →';\n      return;\n    }\n    if(button&&!submitting)button.textContent='Wird automatisch sicher gespeichert …';\n    instantLeadTimer=setTimeout(function(){\n      if(form.isConnected&&instantLeadReady(form))submitLead(form);\n    },350);\n  }\n\n  async function submitLead(form){\n    if(submitting||leadId)return;\n    clearTimeout(instantLeadTimer);\n    const values=validateContact(form);if(!values)return;`,
  'submitLead function start'
);

replaceOnce(
  "  content.addEventListener('submit',function(event){if(event.target.id==='cfLeadForm'){event.preventDefault();submitLead(event.target);}});\n  content.addEventListener('click',function(event){",
  "  content.addEventListener('submit',function(event){if(event.target.id==='cfLeadForm'){event.preventDefault();submitLead(event.target);}});\n  content.addEventListener('input',function(event){const form=event.target.closest&&event.target.closest('#cfLeadForm');if(form)scheduleInstantLead(form);});\n  content.addEventListener('change',function(event){const form=event.target.closest&&event.target.closest('#cfLeadForm');if(form)scheduleInstantLead(form);});\n  content.addEventListener('click',function(event){",
  'contact form event listeners'
);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Instant lead capture enabled: valid contact details are sent immediately after privacy consent, before callback or calendar choice.');
