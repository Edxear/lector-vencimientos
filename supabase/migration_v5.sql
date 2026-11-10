-- Recepción opcional por lote y archivo no destructivo del producto.
-- Ejecutar después de las migraciones v2, v3 y v4, antes de usar la app.
alter table public.items add column if not exists received_date date;
alter table public.products add column if not exists archived boolean not null default false;

-- Un lote sin unidades no debe generar avisos push.
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
      and i.quantity <> 0 and (i.expiry_date - i.notify_days) <= current_date;
end $$;
