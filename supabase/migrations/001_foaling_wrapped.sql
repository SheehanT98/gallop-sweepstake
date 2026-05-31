-- Prospect Foaling Wrapped — preferred schema
-- Run in Supabase SQL editor or via CLI after you create the project.

-- Season foaling records (one row per foal)
create table if not exists public.foalings (
  id uuid primary key default gen_random_uuid(),
  foaled_at timestamptz not null,
  sex text not null check (sex in ('colt', 'filly')),
  sire text,
  weight_kg numeric(5, 2) check (weight_kg is null or weight_kg > 0),
  dam text,
  assisted boolean default false,
  season_label text not null,
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.foalings is 'Thoroughbred foaling records per season for Wrapped stats';
comment on column public.foalings.season_label is 'e.g. 2025-26 — filter all Wrapped queries by this';
comment on column public.foalings.weight_kg is 'Foal weight in kilograms; optional';

create index if not exists foalings_season_foaled_at_idx
  on public.foalings (season_label, foaled_at);

create index if not exists foalings_season_sire_idx
  on public.foalings (season_label, sire)
  where sire is not null;

-- Background photos/videos for Wrapped (not linked to individual foals)
create table if not exists public.wrapped_media (
  id uuid primary key default gen_random_uuid(),
  season_label text not null,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.wrapped_media is 'B-roll for Wrapped; shuffle in player/video, no foal FK';

-- Optional: cache last render per season
create table if not exists public.wrapped_renders (
  id uuid primary key default gen_random_uuid(),
  season_label text not null,
  storage_path text not null,
  selected_fact_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- RLS: enable and tailor to your auth (example: authenticated read)
alter table public.foalings enable row level security;
alter table public.wrapped_media enable row level security;
alter table public.wrapped_renders enable row level security;

create policy "Authenticated read foalings"
  on public.foalings for select
  to authenticated
  using (true);

create policy "Authenticated read wrapped_media"
  on public.wrapped_media for select
  to authenticated
  using (true);

create policy "Authenticated read wrapped_renders"
  on public.wrapped_renders for select
  to authenticated
  using (true);

-- Storage bucket (run in dashboard or storage API):
--   wrapped-media (public read for backgrounds, or signed URLs in app)
