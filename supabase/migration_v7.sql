-- Garantiza que eliminar una cuenta también elimine sus datos sincronizados.
-- Ejecutar después de migration_v6.sql y antes de habilitar la eliminación de cuentas.
-- Si una ejecución anterior falló, volver a ejecutar esta migración completa.

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

do $settings_policy$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_settings'
      and policyname = 'own settings'
  ) then
    create policy "own settings" on public.user_settings for all
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end;
$settings_policy$;

do $migration$
declare
  target_table text;
  table_oid regclass;
  user_id_attnum smallint;
  has_cascade boolean;
  existing_constraint record;
begin
  foreach target_table in array array['products', 'items', 'push_subscriptions', 'user_settings'] loop
    table_oid := to_regclass(format('public.%I', target_table));
    if table_oid is null then
      raise exception 'Falta public.%; ejecutá primero schema.sql y las migraciones anteriores.', target_table;
    end if;

    select attnum into user_id_attnum
    from pg_attribute
    where attrelid = table_oid and attname = 'user_id' and not attisdropped;

    if user_id_attnum is null then
      raise exception 'Falta la columna user_id en public.%.', target_table;
    end if;

    select exists (
      select 1
      from pg_constraint
      where conrelid = table_oid
        and confrelid = 'auth.users'::regclass
        and contype = 'f'
        and conkey = array[user_id_attnum]::smallint[]
        and confdeltype = 'c'
    ) into has_cascade;

    if not has_cascade then
      for existing_constraint in
        select conname
        from pg_constraint
        where conrelid = table_oid
          and confrelid = 'auth.users'::regclass
          and contype = 'f'
          and conkey = array[user_id_attnum]::smallint[]
      loop
        execute format('alter table public.%I drop constraint %I', target_table, existing_constraint.conname);
      end loop;

      execute format(
        'alter table public.%I add constraint %I foreign key (user_id) references auth.users(id) on delete cascade',
        target_table,
        target_table || '_user_id_fkey'
      );
    end if;
  end loop;
end;
$migration$;
