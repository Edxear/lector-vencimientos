-- Migración v2: campos nuevos, preferencias por usuario y funciones del servidor de avisos.
-- Ejecutar en Supabase > SQL Editor (es idempotente).

alter table public.products add column if not exists content text default '';
alter table public.items add column if not exists notes text default '';
alter table public.items add column if not exists notify_days int not null default 15;
alter table public.items add column if not exists expiry_photo text default '';

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users on delete cascade,
  app_use_case text not null default 'hogar',
  date_order text not null default 'DMY',
  default_notify_days int not null default 15,
  geofence_latitude double precision,
  geofence_longitude double precision,
  geofence_radius int not null default 150,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "own settings" on public.user_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Configuración privada: RLS activado y sin políticas = inaccesible desde la API
create table if not exists public.private_config (key text primary key, value text not null);
alter table public.private_config enable row level security;

create or replace function public.cron_due(secret text)
returns table (item_id uuid, user_id uuid, name text, expiry_date date, days_left int,
               endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
begin
  if secret is distinct from (select value from private_config where key = 'cron_secret') then
    raise exception 'unauthorized';
  end if;
  return query
    select i.id, i.user_id, coalesce(nullif(p.name, ''), i.ean), i.expiry_date,
           (i.expiry_date - current_date)::int, s.endpoint, s.p256dh, s.auth
    from items i
    left join products p on p.user_id = i.user_id and p.ean = i.ean
    join push_subscriptions s on s.user_id = i.user_id
    where i.notified_at is null and (i.expiry_date - i.notify_days) <= current_date;
end $$;

create or replace function public.cron_mark(secret text, ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if secret is distinct from (select value from private_config where key = 'cron_secret') then
    raise exception 'unauthorized';
  end if;
  update items set notified_at = now() where id = any(ids);
end $$;

create or replace function public.cron_drop_sub(secret text, endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if secret is distinct from (select value from private_config where key = 'cron_secret') then
    raise exception 'unauthorized';
  end if;
  delete from push_subscriptions s where s.endpoint = cron_drop_sub.endpoint;
end $$;

revoke all on function public.cron_due(text) from public;
revoke all on function public.cron_mark(text, uuid[]) from public;
revoke all on function public.cron_drop_sub(text, text) from public;
grant execute on function public.cron_due(text) to anon, authenticated;
grant execute on function public.cron_mark(text, uuid[]) to anon, authenticated;
grant execute on function public.cron_drop_sub(text, text) to anon, authenticated;
