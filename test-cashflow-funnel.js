const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const vm = require('vm');
const leadHandler = require('./api/lead');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const privacy = fs.readFileSync(path.join(root, 'dist', 'datenschutz.html'), 'utf8');

function count(pattern, value) {
  return (value.match(pattern) || []).length;
}

assert(html.includes('id="cashflowFunnel"'), 'Cashflow funnel modal is missing.');
assert(html.includes('id="cashflow-funnel-script"'), 'Cashflow funnel script is missing.');
assert(html.includes('PREMIUM CASHFLOW PLAN FUNNEL'), 'Cashflow funnel styles are missing.');
assert(html.includes('aria-modal="true"'), 'Accessible modal semantics are missing.');
assert(html.includes('role="progressbar"'), 'Accessible progress semantics are missing.');
assert(html.includes('prefers-reduced-motion:reduce'), 'Reduced-motion fallback is missing.');
assert(count(/class="[^"]*cashflow-funnel-trigger[^"]*"/g, html) >= 5, 'Too few funnel entry points.');
assert(!html.includes('id="bookingExperience"'), 'Old booking animation is still present.');
assert(!html.includes('<iframe class="calendar-iframe'), 'Old embedded calendar is still present.');
assert(!/<a\b[^>]*class="[^"]*calendar-track/i.test(html), 'Legacy calendar tracking CTA remains.');
assert(html.includes('https://calendly.com/julian-defi-intelligence/30min'), 'New Calendly booking URL is missing.');
assert(!html.includes('calendar.app.google'), 'Legacy Google Calendar URL remains in the production HTML.');
assert(html.includes("track('Lead'"), 'Meta Lead browser event is missing.');
assert(html.includes("track('ScheduleInitiated'"), 'ScheduleInitiated event is missing.');
assert(html.includes("fetch('/api/lead'"), 'Lead API call is missing.');
assert(html.includes('elapsedMs:Date.now()-startedAt'), 'Bot timing signal is missing.');
assert(privacy.includes('Cashflow-Plan und Kontaktanfrage'), 'Lead privacy disclosure is missing.');
assert(privacy.includes('Meta Pixel und Meta Conversions API'), 'Meta CAPI privacy disclosure is missing.');

const scriptMatch = html.match(/<script id="cashflow-funnel-script">([\s\S]*?)<\/script>/);
assert(scriptMatch, 'Could not extract cashflow funnel JavaScript.');
assert(scriptMatch[1].includes("/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/"), 'Client email validation regex was corrupted during injection.');
assert(scriptMatch[1].includes(".replace(/\\D/g,'')"), 'Client phone validation regex was corrupted during injection.');
assert(scriptMatch[1].includes(".split(/\\s+/)"), 'Client first-name parsing regex was corrupted during injection.');
assert(!scriptMatch[1].includes('\\</body>'), 'HTML replacement tokens leaked into the funnel JavaScript.');
new vm.Script(scriptMatch[1], { filename: 'cashflow-funnel.browser.js' });

function invoke(body, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = Object.assign({
      'content-type': 'application/json',
      'user-agent': 'Cashflow Funnel Test',
      origin: 'http://localhost:3000'
    }, options.headers || {});
    const req = {
      method: options.method || 'POST',
      headers,
      body,
      socket: { remoteAddress: '127.0.0.1' }
    };
    const responseHeaders = {};
    const res = {
      statusCode: 200,
      setHeader(name, value) { responseHeaders[String(name).toLowerCase()] = value; },
      end(value) {
        let payload = null;
        try { payload = value ? JSON.parse(value) : null; } catch (error) { return reject(error); }
        resolve({ status: this.statusCode, headers: responseHeaders, body: payload });
      }
    };
    Promise.resolve(leadHandler(req, res)).catch(reject);
  });
}

function validPayload() {
  return {
    name: 'Raphael',
    email: 'raphael@example.com',
    phone: '+49 170 1234567',
    privacyAccepted: true,
    marketingConsent: false,
    elapsedMs: 12000,
    eventId: 'lead_test_123',
    answers: {
      goal: 'cashflow',
      experience: 'invested',
      capital: '5k-20k',
      blocker: 'strategy'
    },
    attribution: {
      utmSource: 'meta',
      utmCampaign: 'test',
      landingPage: 'https://julian-arndt.com/?utm_source=meta'
    }
  };
}

(async () => {
  const originalEnvironment = process.env.VERCEL_ENV;
  const originalWebhook = process.env.LEAD_WEBHOOK_URL;
  const originalMetaToken = process.env.META_CAPI_ACCESS_TOKEN;
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalSupabaseTable = process.env.SUPABASE_LEADS_TABLE;

  delete process.env.VERCEL_ENV;
  delete process.env.LEAD_WEBHOOK_URL;
  delete process.env.META_CAPI_ACCESS_TOKEN;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_LEADS_TABLE;

  const modernHeaders = leadHandler._internal.supabaseHeaders({ serviceRoleKey: 'sb_secret_test' });
  assert.strictEqual(modernHeaders.apikey, 'sb_secret_test', 'Modern Supabase secret key header is missing.');
  assert.strictEqual(modernHeaders.Authorization, undefined, 'Modern Supabase secret keys must not be sent as bearer JWTs.');

  const legacyHeaders = leadHandler._internal.supabaseHeaders({ serviceRoleKey: 'legacy.jwt.key' });
  assert.strictEqual(legacyHeaders.Authorization, 'Bearer legacy.jwt.key', 'Legacy service-role JWT support is missing.');

  const methodResponse = await invoke({}, { method: 'GET' });
  assert.strictEqual(methodResponse.status, 405, 'GET should be rejected.');

  const invalidResponse = await invoke(Object.assign(validPayload(), { phone: '12' }));
  assert.strictEqual(invalidResponse.status, 400, 'Invalid phone should be rejected.');
  assert(invalidResponse.body.errors.phone, 'Phone validation error is missing.');

  const tooFastResponse = await invoke(Object.assign(validPayload(), { elapsedMs: 800 }));
  assert.strictEqual(tooFastResponse.status, 400, 'Unrealistically fast submission should be rejected.');
  assert(tooFastResponse.body.errors.session, 'Session validation error is missing.');

  const validResponse = await invoke(validPayload());
  assert.strictEqual(validResponse.status, 200, 'Valid lead should be accepted in test mode.');
  assert.strictEqual(validResponse.body.ok, true, 'Valid lead response should be successful.');
  assert(/^cf_[a-f0-9-]{36}$/i.test(validResponse.body.leadId), 'Lead ID format is invalid.');
  assert.strictEqual(validResponse.body.metaStatus, 'no_marketing_consent', 'Meta should respect missing marketing consent.');

  const receivedEvents = [];
  const webhookServer = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      receivedEvents.push(JSON.parse(raw || '{}'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise((resolve) => webhookServer.listen(0, '127.0.0.1', resolve));
  process.env.LEAD_WEBHOOK_URL = `http://127.0.0.1:${webhookServer.address().port}/lead`;

  const deliveredResponse = await invoke(validPayload());
  assert.strictEqual(deliveredResponse.status, 200, 'Lead receiver delivery should succeed.');
  assert.strictEqual(receivedEvents[0].type, 'lead.created', 'Lead receiver did not receive lead.created.');
  assert.strictEqual(receivedEvents[0].contact.firstName, 'Raphael', 'Lead receiver contact data is wrong.');
  assert.strictEqual(receivedEvents[0].qualification.goal, 'cashflow', 'Lead qualification is wrong.');

  const preferenceResponse = await invoke({
    action: 'preference',
    leadId: deliveredResponse.body.leadId,
    preference: 'callback',
    attribution: validPayload().attribution
  });
  assert.strictEqual(preferenceResponse.status, 200, 'Valid preference update should be accepted.');
  assert.strictEqual(receivedEvents[1].type, 'lead.preference_updated', 'Lead receiver did not receive the preference event.');
  assert.strictEqual(receivedEvents[1].preference, 'callback', 'Lead preference is wrong.');
  await new Promise((resolve) => webhookServer.close(resolve));

  const spamResponse = await invoke({ companyWebsite: 'https://spam.invalid' });
  assert.strictEqual(spamResponse.status, 200, 'Honeypot should silently accept spam.');

  if (originalEnvironment === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = originalEnvironment;
  if (originalWebhook === undefined) delete process.env.LEAD_WEBHOOK_URL; else process.env.LEAD_WEBHOOK_URL = originalWebhook;
  if (originalMetaToken === undefined) delete process.env.META_CAPI_ACCESS_TOKEN; else process.env.META_CAPI_ACCESS_TOKEN = originalMetaToken;
  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalSupabaseUrl;
  if (originalSupabaseKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalSupabaseKey;
  if (originalSupabaseTable === undefined) delete process.env.SUPABASE_LEADS_TABLE; else process.env.SUPABASE_LEADS_TABLE = originalSupabaseTable;

  console.log('Cashflow funnel tests passed: build markers, browser script, validation, consent, modern Supabase keys, lead and preference flows.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
