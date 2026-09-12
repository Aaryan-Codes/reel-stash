-- Processing progress columns for live UI

alter table public.items
  add column if not exists processing_stage text,
  add column if not exists processing_progress integer not null default 0;
