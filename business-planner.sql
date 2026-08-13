-- Optional Supabase table for syncing Business Planner entries across devices.
-- The first version of calendar.js intentionally uses localStorage for planner/journal
-- entries, so the page works immediately without running this SQL.
-- Run this only if you want cloud-synced planner entries later.

create table if not exists public.business_planner_entries (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    entry_date date not null,
    title text not null,
    entry_time time,
    category text not null default 'business',
    priority text not null default 'normal',
    notes text default '',
    completed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.business_planner_entries enable row level security;

create policy "Users can view their own planner entries"
on public.business_planner_entries
for select
using (auth.uid() = user_id);

create policy "Users can create their own planner entries"
on public.business_planner_entries
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own planner entries"
on public.business_planner_entries
for update
using (auth.uid() = user_id);

create policy "Users can delete their own planner entries"
on public.business_planner_entries
for delete
using (auth.uid() = user_id);
