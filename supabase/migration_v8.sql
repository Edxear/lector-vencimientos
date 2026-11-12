-- Mantiene los datos existentes y usa el contexto comercial para nuevas preferencias.
alter table public.user_settings
  alter column app_use_case set default 'comercio',
  alter column geofence_radius set default 400;
