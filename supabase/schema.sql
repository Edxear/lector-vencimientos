-- Ejecutar en Supabase > SQL Editor

create table if not exists public.products (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  ean text not null,
  name text not null default '',
  brand text default '',
  image_url text default '',
  category text default '',
  source text default 'manual',
  primary key (user_id, ean)
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  ean text not null,
  expiry_date date not null,
  quantity int not null default 1,
  location text default '',
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists items_user_expiry on public.items (user_id, expiry_date);

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh text not null,
  auth text not null
);

alter table public.products enable row level security;
alter table public.items enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "own products" on public.products for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own items" on public.items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own subs" on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
