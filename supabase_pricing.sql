-- ME TO YOU DESIGNS — PRICING SYSTEM
-- Run this in Supabase SQL Editor.
-- This creates a pricing area that is separate from orders, invoices,
-- payments and revenue.

create extension if not exists pgcrypto;

create table if not exists public.pricing_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  hourly_rate numeric(10,2) not null default 12,
  waste_percent numeric(5,2) not null default 5,
  profit_margin numeric(5,2) not null default 45,
  minimum_profit numeric(10,2) not null default 5,
  packaging_cost numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'other',
  pack_price numeric(10,2) not null default 0,
  pack_quantity numeric(12,4) not null default 1,
  unit text not null default 'each',
  supplier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pricing_materials_user_id_idx
on public.pricing_materials(user_id);

create table if not exists public.pricing_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'custom',
  calculator_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pricing_templates_user_id_idx
on public.pricing_templates(user_id);

create table if not exists public.pricing_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'custom',
  materials jsonb not null default '[]'::jsonb,
  packaging_cost numeric(10,2) not null default 0,
  other_cost numeric(10,2) not null default 0,
  labour_minutes numeric(10,2) not null default 0,
  hourly_rate numeric(10,2) not null default 0,
  waste_percent numeric(5,2) not null default 0,
  profit_margin numeric(5,2) not null default 0,
  total_cost numeric(10,2) not null default 0,
  recommended_price numeric(10,2) not null default 0,
  customer_price numeric(10,2) not null default 0,
  profit numeric(10,2) not null default 0,
  margin numeric(7,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pricing_calculations_user_id_idx
on public.pricing_calculations(user_id);

alter table public.pricing_settings enable row level security;
alter table public.pricing_materials enable row level security;
alter table public.pricing_templates enable row level security;
alter table public.pricing_calculations enable row level security;

drop policy if exists "pricing_settings_owner" on public.pricing_settings;
create policy "pricing_settings_owner"
on public.pricing_settings for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "pricing_materials_owner" on public.pricing_materials;
create policy "pricing_materials_owner"
on public.pricing_materials for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "pricing_templates_owner" on public.pricing_templates;
create policy "pricing_templates_owner"
on public.pricing_templates for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "pricing_calculations_owner" on public.pricing_calculations;
create policy "pricing_calculations_owner"
on public.pricing_calculations for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
