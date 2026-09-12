-- Reel Stash initial schema + RLS

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  capture_api_key text unique not null default encode(gen_random_bytes(32), 'hex'),
  expiry_days integer not null default 60,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  source text not null default 'web',
  status text not null default 'processing'
    check (status in ('processing', 'inbox', 'active', 'stashed', 'expired')),
  category text
    check (category is null or category in ('recipe', 'github_repo', 'website', 'learning', 'other')),
  title text,
  summary text,
  caption text,
  transcript text,
  structured_data jsonb,
  confidence real,
  thumbnail_url text,
  visited_at timestamptz,
  stashed_at timestamptz,
  expires_at timestamptz,
  processing_error text,
  processing_stage text,
  processing_progress integer not null default 0,
  retry_count integer not null default 0,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_user_id_status_idx on public.items (user_id, status);
create index if not exists items_user_id_created_at_idx on public.items (user_id, created_at desc);
create index if not exists items_next_retry_at_idx on public.items (next_retry_at)
  where status = 'processing';

alter table public.profiles enable row level security;
alter table public.items enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users read own items" on public.items;
create policy "Users read own items"
  on public.items for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own items" on public.items;
create policy "Users insert own items"
  on public.items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own items" on public.items;
create policy "Users update own items"
  on public.items for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own items" on public.items;
create policy "Users delete own items"
  on public.items for delete
  using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Storage buckets (run in Supabase dashboard if SQL fails)
insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('temp-audio', 'temp-audio', false)
on conflict (id) do nothing;

drop policy if exists "Users upload own thumbnails" on storage.objects;
create policy "Users upload own thumbnails"
  on storage.objects for insert
  with check (bucket_id = 'thumbnails' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Public read thumbnails" on storage.objects;
create policy "Public read thumbnails"
  on storage.objects for select
  using (bucket_id = 'thumbnails');
