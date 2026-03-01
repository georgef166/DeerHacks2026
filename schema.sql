-- SafeDay Companion: Database Schema
-- Run this in Supabase SQL Editor after creating a new project.

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  event_type text not null,
  sensor_data jsonb not null default '{}',
  audio_url text,
  transcript text,
  severity text default 'pending',
  summary text,
  categories text[] default '{}',
  suggested_actions text[] default '{}',
  status text default 'pending',
  is_simulation boolean default false,
  created_at timestamptz default now()
);

alter table public.incidents enable row level security;

create policy "Users read own incidents"
  on public.incidents for select
  using (auth.uid() = user_id);

create policy "Users insert own incidents"
  on public.incidents for insert
  with check (auth.uid() = user_id);

create policy "Users update own incidents"
  on public.incidents for update
  using (auth.uid() = user_id);

-- Enable Realtime so the dashboard updates live
alter publication supabase_realtime add table public.incidents;

insert into storage.buckets (id, name, public)
  values ('audio-clips', 'audio-clips', false)
  on conflict (id) do nothing;

create policy "Users read own audio"
  on storage.objects for select
  using (bucket_id = 'audio-clips' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users upload own audio"
  on storage.objects for insert
  with check (bucket_id = 'audio-clips' and (storage.foldername(name))[1] = auth.uid()::text);
