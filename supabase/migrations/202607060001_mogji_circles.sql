create extension if not exists "pgcrypto";

create table if not exists circles (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  vibe_emoji text not null,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  anon_token text not null,
  display_name text not null,
  joined_at timestamptz not null default now(),
  unique(circle_id, anon_token)
);

create table if not exists decodes (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  setter_member_id uuid not null references members(id) on delete cascade,
  puzzle_json jsonb not null,
  status text not null check (status in ('draft','live','revealed','deleted')),
  created_at timestamptz not null default now(),
  closes_at timestamptz
);

create table if not exists answers (
  decode_id uuid not null references decodes(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  chain jsonb not null,
  prediction_member_id uuid null references members(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key(decode_id, member_id)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid null references circles(id) on delete set null,
  member_id uuid null references members(id) on delete set null,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists one_live_per_circle on decodes (circle_id) where status = 'live';
create index if not exists members_circle_id_idx on members(circle_id);
create index if not exists decodes_circle_id_status_idx on decodes(circle_id, status);
create index if not exists events_circle_id_name_idx on events(circle_id, name);

alter table circles enable row level security;
alter table members enable row level security;
alter table decodes enable row level security;
alter table answers enable row level security;
alter table events enable row level security;

create policy "service role manages circles" on circles for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role manages members" on members for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role manages decodes" on decodes for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role manages answers" on answers for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role manages events" on events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
