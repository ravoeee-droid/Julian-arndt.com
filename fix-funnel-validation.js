const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dist', 'index.html');
if (!fs.existsSync(filePath)) {
  throw new Error('dist/index.html is missing before funnel validation fix.');
}

let html = fs.readFileSync(filePath, 'utf8');

const validatorPattern = /  function validateContact\(form\)\{[\s\S]*?\n  \}\n\n  async function submitLead/;

if (!validatorPattern.test(html)) {
  throw new Error('Cashflow funnel validator function was not found.');
}

const validator = `  function validateContact(form){
    const values=Object.fromEntries(new FormData(form).entries());
    const errors=[];
    const name=String(values.name||'').trim();
    const email=String(values.email||'').trim().toLowerCase();
    const phone=String(values.phone||'').trim();

    if(name.length<2)errors.push('Bitte gib deinen Vornamen ein.');
    if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email))errors.push('Bitte gib eine gültige E-Mail-Adresse ein.');
    const digits=phone.replace(/\\D/g,'');
    if(digits.length<7||digits.length>16)errors.push('Bitte gib eine gültige Telefonnummer ein.');
    if(!form.elements.privacy.checked)errors.push('Bitte bestätige die Datenschutzhinweise.');

    form.querySelectorAll('.cf-input').forEach(function(input){input.setAttribute('aria-invalid','false');});
    const box=form.querySelector('#cfFormError');
    if(box){box.textContent='';box.classList.remove('is-visible');}

    if(errors.length){
      if(box){box.textContent=errors[0];box.classList.add('is-visible');}
      if(errors[0].includes('Vornamen'))form.elements.name.setAttribute('aria-invalid','true');
      else if(errors[0].includes('E-Mail'))form.elements.email.setAttribute('aria-invalid','true');
      else if(errors[0].includes('Telefon'))form.elements.phone.setAttribute('aria-invalid','true');
      return null;
    }

    values.name=name;
    values.email=email;
    values.phone=phone;
    return values;
  }

  async function submitLead`;

html = html.replace(validatorPattern, validator);

const emailPatternCheck = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
if (!emailPatternCheck.test('rafa@web.de') || !emailPatternCheck.test('name+test@example.com')) {
  throw new Error('Email validation self-test failed.');
}
if (emailPatternCheck.test('rafa@web') || emailPatternCheck.test('rafa web.de')) {
  throw new Error('Email validation negative self-test failed.');
}

if (!html.includes("const email=String(values.email||'').trim().toLowerCase();") ||
    !html.includes("const digits=phone.replace(/\\D/g,'');")) {
  throw new Error('Corrected funnel validation was not written to the production HTML.');
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('Funnel email and phone validation corrected and self-tested.');
