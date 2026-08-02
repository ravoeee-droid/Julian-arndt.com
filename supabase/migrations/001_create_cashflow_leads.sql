create table if not exists public.cashflow_leads (
  id text primary key,
  event_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  preference_updated_at timestamptz,
  source text not null default 'julian-arndt.com/cashflow-plan',
  status text not null default 'new' check (status in ('new', 'callback_requested', 'calendar_opened', 'contacted', 'qualified', 'closed')),
  contact_preference text not null default 'unselected' check (contact_preference in ('unselected', 'callback', 'calendar')),
  first_name text not null,
  email text not null,
  phone text not null,
  goal text,
  experience text,
  capital text,
  blocker text,
  qualification jsonb not null default '{}'::jsonb,
  privacy_accepted boolean not null default false,
  marketing_consent boolean not null default false,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  fbp text,
  fbc text,
  landing_page text,
  referrer text,
  attribution jsonb not null default '{}'::jsonb,
  user_agent text
);

create index if not exists cashflow_leads_created_at_idx on public.cashflow_leads (created_at desc);
create index if not exists cashflow_leads_status_idx on public.cashflow_leads (status, created_at desc);
create index if not exists cashflow_leads_email_idx on public.cashflow_leads (lower(email));
create index if not exists cashflow_leads_phone_idx on public.cashflow_leads (phone);

alter table public.cashflow_leads enable row level security;

comment on table public.cashflow_leads is 'Server-side leads from the Julian Arndt cashflow funnel. No anonymous client access; writes use the Vercel server function with the Supabase service role.';
