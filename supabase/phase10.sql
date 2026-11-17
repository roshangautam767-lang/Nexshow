-- NexShow Phase 10: WhatsApp delivery log. Run once in the Supabase SQL editor.
-- One row per booking, so a ticket message is never sent twice. "accepted" only means WhatsApp took the request;
-- "delivered" and "read" arrive later from WhatsApp's own status webhook.
create table if not exists whatsapp_messages (
  id bigint generated always as identity primary key,
  booking_id uuid not null unique references bookings(id) on delete cascade,
  to_phone text not null,
  status text not null default 'queued' check (status in ('queued','accepted','delivered','read','failed')),
  wa_message_id text unique,
  error text,
  attempts integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table whatsapp_messages enable row level security;
create policy own_whatsapp on whatsapp_messages for select
  using (exists (select 1 from bookings b where b.id = booking_id and b.user_id = auth.uid()));
-- Writes happen only from the server (service_role).
