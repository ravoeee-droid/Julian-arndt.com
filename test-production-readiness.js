const assert = require('assert');
const fs = require('fs');
const path = require('path');
const lead = require('./api/lead');

const html = fs.readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '001_create_cashflow_leads.sql'), 'utf8');

assert(html.includes('viewport-fit=cover'), 'Mobile safe-area viewport configuration is missing.');
assert(html.includes('id="cashflow-mobile-scroll-fix"'), 'Base mobile scroll fix is missing.');
assert(html.includes('PRODUCTION_FUNNEL_HARDENING'), 'Production mobile hardening is missing.');
assert(html.includes('INSTANT_LEAD_CAPTURE_PATCH'), 'Instant lead capture is missing.');
assert(html.includes("if(!leadEventId)leadEventId=eventId('lead')"), 'Lead retries are not idempotent in the browser.');
assert(html.includes('--cf-viewport-height'), 'Visual viewport keyboard handling is missing.');
assert(html.includes('#cfLeadForm .cf-contact-grid>.cf-field:last-child'), 'Sticky mobile submit action is missing.');
assert(html.includes('@media (max-width:900px) and (max-height:560px)'), 'Landscape phone layout is missing.');
assert(migration.includes('enable row level security'), 'Supabase RLS is not enabled in the migration.');
assert(migration.includes('event_id text not null unique'), 'Supabase idempotency constraint is missing.');

const mapped = lead._internal.mapLeadToSupabaseRow({
  leadId: 'cf_00000000-0000-0000-0000-000000000000',
  eventId: 'lead_test',
  createdAt: '2026-08-02T00:00:00.000Z',
  source: 'julian-arndt.com/cashflow-plan',
  contactPreference: 'unselected',
  contact: { firstName: 'Raphael', email: 'raphael@example.com', phone: '+49 170 1234567' },
  qualification: { goal: 'cashflow', experience: 'invested', capital: '5k-20k', blocker: 'strategy' },
  consent: { privacyAccepted: true, marketingConsent: false },
  attribution: { utmSource: 'meta' },
  technical: { userAgent: 'Readiness Test' }
});

assert.strictEqual(mapped.first_name, 'Raphael');
assert.strictEqual(mapped.goal, 'cashflow');
assert.strictEqual(mapped.utm_source, 'meta');
assert.strictEqual(mapped.privacy_accepted, true);

console.log('Production readiness tests passed: mobile viewport, keyboard/scroll handling, instant capture, idempotency and Supabase schema.');
