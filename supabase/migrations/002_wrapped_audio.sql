-- Season soundtrack for Wrapped (upload MP3/M4A you have rights to use)
create table if not exists public.wrapped_audio (
  season_label text primary key,
  storage_path text not null,
  trim_start_ms int not null default 0,
  trim_end_ms int,
  bpm numeric(6, 2) default 120,
  sync_to_beat boolean not null default true,
  spotify_url text,
  apple_music_url text,
  track_title text,
  artist text,
  updated_at timestamptz not null default now()
);

comment on table public.wrapped_audio is 'Uploaded audio for export; streaming links are reference-only';

alter table public.wrapped_audio enable row level security;

create policy "Authenticated read wrapped_audio"
  on public.wrapped_audio for select
  to authenticated
  using (true);

-- Storage: same bucket or dedicated wrapped-audio bucket (public read for render)
