# Julian Arndt Website

This repository is connected to Vercel for julian-arndt.com.

The build step restores the approved static website package, keeps the Microsoft Clarity ID `xjrqe58i0h`, applies the trust and conversion layers, and outputs the final static files for Vercel.

## Premium cashflow funnel

The Vercel build now replaces direct calendar CTAs with a five-step, mobile-first cashflow-plan funnel. A lead is delivered before the visitor chooses either a callback or the Calendly appointment calendar.

Run the complete build and automated checks with:

```bash
npm test
```

Production requires `LEAD_WEBHOOK_URL`. Set `META_CAPI_ACCESS_TOKEN` to send the consent-gated server-side `Lead` event to Meta. Browser and server events share an `event_id` for deduplication. See `.env.example` for every supported variable; never commit real tokens or webhook secrets.
