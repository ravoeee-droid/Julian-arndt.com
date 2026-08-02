# Julian Arndt Website

This repository is connected to Vercel for julian-arndt.com.

The build step restores the approved static website package, keeps the Microsoft Clarity ID `xjrqe58i0h`, applies the trust and conversion layers, and outputs the final static files for Vercel.

## Premium cashflow funnel

The site replaces direct calendar CTAs with a five-step, mobile-first cashflow-plan funnel. Valid contact data is captured automatically immediately after privacy consent. The lead is therefore stored before the visitor chooses either a callback or the Calendly appointment calendar.

The production build includes:

- iOS and Android safe-area handling
- visual viewport support when the mobile keyboard opens
- internal scrolling with an always-reachable mobile CTA
- compact layouts for small phones and landscape orientation
- UTM, Meta attribution and browser/server event deduplication
- direct server-side Supabase storage with optional webhook delivery

Run the complete build and automated checks with:

```bash
npm test
```

## Supabase setup

Run `supabase/migrations/001_create_cashflow_leads.sql` once in the Supabase SQL editor. Then add the following secrets to the Vercel project for Production, Preview and Development as needed:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_LEADS_TABLE=cashflow_leads
```

The service-role key is used only inside the Vercel server function and must never be committed or exposed in browser code. Row Level Security is enabled and no anonymous table policy is created.

An optional `LEAD_WEBHOOK_URL` can additionally forward events to email, CRM or notification automation. Set `META_CAPI_ACCESS_TOKEN` to send the consent-gated server-side `Lead` event to Meta. Browser and server events share an `event_id` for deduplication. See `.env.example` for every supported variable.
