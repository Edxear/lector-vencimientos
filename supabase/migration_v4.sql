-- Destino "reutilizado" de los lotes y conservación manual de lotes vencidos.
-- Ejecutar en Supabase > SQL Editor ANTES de usar esta versión de la app.

alter table public.items add column if not exists reused_at timestamptz;
alter table public.items add column if not exists reuse_label text default '';
alter table public.items add column if not exists keep_active boolean not null default false;

-- Los avisos push no deben enviarse para lotes ya descartados o reutilizados.
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
    where i.notified_at is null and i.wasted_at is null and i.reused_at is null
      and (i.expiry_date - i.notify_days) <= current_date;
end $$;
